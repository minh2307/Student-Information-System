/**
 * SecureWebViewBridge.ts
 * Core Native Message Dispatcher, Origin Validator & Replay Protection Engine.
 *
 * Implements TASK 7.1.2 Security Directives:
 * 1. Strict RFC 3986 Origin Verification (Scheme + Hostname + Port exact match).
 * 2. Session & Epoch Binding (Rejects stale messages from prior sessions or past epochs).
 * 3. Anti-Replay Sliding Window Nonce & Monotonic Sequence Tracking.
 * 4. Zero Refresh Token Leakage: Refresh Token never crosses the Bridge.
 * 5. Single-Flight Token Refresh integration with Native TokenBroker.
 * 6. Atomic Purge Synchronization on Logout.
 */

import { tokenBroker } from './tokenBroker';
import { tokenStorage } from '@/storage/tokenStorage';
import { useAuthStore, getGlobalEpoch } from '@/stores/authStore';
import { getTokenRemainingSeconds } from '@/utils/jwt';
import {
  BridgeEnvelope,
  BridgeMessageType,
  HandshakeAckPayload,
  HandshakeRejectPayload,
  TokenRefreshSuccessPayload,
  TokenRefreshFailurePayload,
  BridgeErrorPayload,
} from './types';
import {
  BridgeAuthError,
  SessionTerminatedError,
  InvalidOriginError,
  InvalidEnvelopeError,
  ReplayAttackError,
  StaleEpochError,
  RefreshAmbiguousError,
  RefreshUnauthorizedError,
} from './errors';

export const SLIDING_WINDOW_MS = 60_000; // 60 seconds freshness window
export const MAX_PAYLOAD_BYTES = 65_536; // 64 KB max envelope size

export const DEFAULT_PRODUCTION_ORIGINS = ['https://rikkeiportal.io.vn'];
export const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

export interface SecureBridgeOptions {
  allowedOrigins?: string[];
  isDev?: boolean;
  onNavigateNative?: (route: string, params?: Record<string, unknown>) => void;
  sendToWeb?: (jsonString: string) => void;
}

export class SecureWebViewBridge {
  private allowedOrigins: string[];
  private isDev: boolean;
  private onNavigateNative?: (route: string, params?: Record<string, unknown>) => void;
  private sendToWeb?: (jsonString: string) => void;

  // Anti-Replay: Map of processed message IDs -> timestamp
  private processedMessageIds = new Map<string, number>();
  // Monotonic Sequence tracking per session
  private lastProcessedSeq = 0;
  // Active Challenge issued on Handshake
  private activeChallengeId: string | null = null;

  constructor(options?: SecureBridgeOptions) {
    this.isDev = options?.isDev ?? (__DEV__ || process.env.NODE_ENV === 'test');
    this.allowedOrigins = options?.allowedOrigins ?? (
      this.isDev
        ? [...DEFAULT_PRODUCTION_ORIGINS, ...DEFAULT_DEV_ORIGINS]
        : DEFAULT_PRODUCTION_ORIGINS
    );
    this.onNavigateNative = options?.onNavigateNative;
    this.sendToWeb = options?.sendToWeb;
  }

  public setSendToWeb(fn: (jsonString: string) => void) {
    this.sendToWeb = fn;
  }

  public getActiveChallengeId(): string | null {
    return this.activeChallengeId;
  }

  public setActiveChallengeForTesting(id: string | null): void {
    this.activeChallengeId = id;
  }

  public resetSession(): void {
    this.activeChallengeId = null;
    this.lastProcessedSeq = 0;
    this.processedMessageIds.clear();
  }

  /**
   * RFC 3986 Standard Origin Validation (Scheme + Hostname + Port exact match).
   */
  public isValidOrigin(rawUrl: string): boolean {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    try {
      const parsed = new URL(rawUrl);
      const portPart = parsed.port ? `:${parsed.port}` : '';
      const origin = `${parsed.protocol}//${parsed.hostname}${portPart}`;

      // In production, strictly disallow http:
      if (!this.isDev && parsed.protocol !== 'https:') {
        return false;
      }

      return this.allowedOrigins.includes(origin);
    } catch {
      return false;
    }
  }

  /**
   * Primary entry point for incoming messages from WebView (event.nativeEvent.data).
   * @param rawData The string payload received via onMessage.
   * @param currentUrl The URL of the frame that posted the message.
   */
  public async handleMessage(rawData: string, currentUrl: string): Promise<BridgeEnvelope | null> {
    // 1. Strict Origin Verification
    if (!this.isValidOrigin(currentUrl)) {
      console.error(`SecureWebViewBridge: Rejected message from untrusted origin: ${currentUrl}`);
      throw new InvalidOriginError(`Untrusted origin: ${currentUrl}`);
    }

    // 2. Payload size safeguard
    if (!rawData || typeof rawData !== 'string' || rawData.length > MAX_PAYLOAD_BYTES) {
      throw new InvalidEnvelopeError('Payload exceeds maximum allowable size of 64KB');
    }

    // 3. Parse JSON envelope
    let envelope: BridgeEnvelope;
    try {
      envelope = JSON.parse(rawData);
    } catch (parseErr) {
      throw new InvalidEnvelopeError('Malformed JSON payload');
    }

    // 4. Validate Envelope Schema v1.0
    this.validateEnvelopeSchema(envelope);

    // 5. Anti-Replay & Freshness Verification (Condition 1 Fix)
    this.validateFreshnessAndReplay(envelope);

    // 6. Session & Epoch Binding (Condition 1 & Session Lifecycle)
    await this.validateSessionAndEpoch(envelope);

    // 7. Route and Execute Whitelisted Message Types
    return await this.dispatch(envelope);
  }

  /**
   * Validate Envelope Structure v1.0 and Message Whitelist.
   */
  private validateEnvelopeSchema(envelope: BridgeEnvelope): void {
    if (!envelope || typeof envelope !== 'object') {
      throw new InvalidEnvelopeError('Envelope must be a JSON object');
    }

    if (envelope.version !== '1.0') {
      throw new InvalidEnvelopeError(`Unsupported Bridge version: ${envelope.version}`);
    }

    if (!envelope.id || typeof envelope.id !== 'string' || envelope.id.length < 8) {
      throw new InvalidEnvelopeError('Message must contain a valid id string');
    }

    if (!Number.isFinite(envelope.timestamp) || envelope.timestamp <= 0) {
      throw new InvalidEnvelopeError('Message must contain a valid Unix epoch timestamp');
    }

    const allowedTypes: BridgeMessageType[] = [
      'AUTH_HANDSHAKE_INIT',
      'AUTH_REFRESH_REQUEST',
      'APP_LOGOUT_REQUEST',
      'NAVIGATE_NATIVE',
    ];

    if (!allowedTypes.includes(envelope.type)) {
      throw new InvalidEnvelopeError(`Unknown or unallowed message type: ${envelope.type}`);
    }
  }

  /**
   * Freshness Window and Anti-Replay Sliding Window Cache.
   */
  private validateFreshnessAndReplay(envelope: BridgeEnvelope): void {
    const now = Date.now();
    const timeDelta = Math.abs(now - envelope.timestamp);

    // Replay window: 60s
    if (timeDelta > SLIDING_WINDOW_MS) {
      throw new ReplayAttackError(`Message timestamp outside 60s freshness window (delta: ${timeDelta}ms)`);
    }

    // Clean up expired IDs from sliding window
    for (const [id, ts] of this.processedMessageIds.entries()) {
      if (now - ts > SLIDING_WINDOW_MS) {
        this.processedMessageIds.delete(id);
      }
    }

    // Check duplicate ID
    if (this.processedMessageIds.has(envelope.id)) {
      throw new ReplayAttackError(`Replay attack detected: duplicate message id '${envelope.id}'`);
    }

    // Record this ID
    this.processedMessageIds.set(envelope.id, envelope.timestamp);
  }

  /**
   * Verify Session Binding and Epoch Alignment.
   * Strictly enforces that sessionId, epoch, and sequence counter match Native state.
   */
  private async validateSessionAndEpoch(envelope: BridgeEnvelope): Promise<void> {
    // Handshake Init does not have session binding yet (it establishes it)
    if (envelope.type === 'AUTH_HANDSHAKE_INIT') {
      return;
    }

    const isLocked = tokenBroker.getIsLocked();
    if (isLocked) {
      throw new SessionTerminatedError('TokenBroker is locked: bridge rejecting operations');
    }

    // Must have an active handshake session established by Native
    if (!this.activeChallengeId) {
      throw new SessionTerminatedError('No active handshake session established');
    }

    // 1. Strict Epoch Verification
    const currentEpoch = getGlobalEpoch();
    if (envelope.epoch === undefined || typeof envelope.epoch !== 'number' || envelope.epoch !== currentEpoch) {
      throw new StaleEpochError(
        `Stale epoch detected: message epoch ${envelope.epoch} !== current epoch ${currentEpoch}`
      );
    }

    // 2. Strict Session ID Verification against Native SecureStore
    const currentSessionTxId = await tokenStorage.getTransactionId();
    if (
      !currentSessionTxId ||
      !envelope.sessionId ||
      typeof envelope.sessionId !== 'string' ||
      envelope.sessionId !== currentSessionTxId
    ) {
      throw new StaleEpochError(
        `Session mismatch: message sessionId '${envelope.sessionId}' !== stored '${currentSessionTxId}'`
      );
    }

    // 3. Strict Monotonic Sequence Verification
    if (
      envelope.seq === undefined ||
      typeof envelope.seq !== 'number' ||
      envelope.seq <= this.lastProcessedSeq
    ) {
      throw new ReplayAttackError(
        `Sequence violation: received seq ${envelope.seq} <= lastSeen ${this.lastProcessedSeq}`
      );
    }
    this.lastProcessedSeq = envelope.seq;
  }

  /**
   * Action Dispatcher.
   */
  private async dispatch(envelope: BridgeEnvelope): Promise<BridgeEnvelope | null> {
    switch (envelope.type) {
      case 'AUTH_HANDSHAKE_INIT':
        return await this.handleHandshakeInit(envelope);

      case 'AUTH_REFRESH_REQUEST':
        return await this.handleRefreshRequest(envelope);

      case 'APP_LOGOUT_REQUEST':
        return await this.handleLogoutRequest(envelope);

      case 'NAVIGATE_NATIVE':
        return this.handleNavigateNative(envelope);

      default:
        throw new InvalidEnvelopeError(`Unhandled message type: ${envelope.type}`);
    }
  }

  /**
   * Handshake Lifecycle Protocol:
   * Provides ephemeral Access Token in Web RAM along with session context and challenge.
   * REFRESH TOKEN IS NEVER TRANSMITTED.
   */
  private async handleHandshakeInit(request: BridgeEnvelope): Promise<BridgeEnvelope<HandshakeAckPayload | HandshakeRejectPayload>> {
    const authState = useAuthStore.getState();
    const currentEpoch = getGlobalEpoch();
    const isLocked = tokenBroker.getIsLocked();

    if (!authState.isAuthenticated || isLocked) {
      const rejectEnvelope = this.createEnvelope<HandshakeRejectPayload>(
        'AUTH_HANDSHAKE_REJECT',
        {
          reason: isLocked ? 'SESSION_LOCKED' : 'NOT_AUTHENTICATED',
          requireLogin: true,
        }
      );
      this.sendResponse(rejectEnvelope);
      return rejectEnvelope;
    }

    try {
      const accessToken = await tokenBroker.getAccessToken();
      const currentTxId = (await tokenStorage.getTransactionId()) ?? `tx_sess_${Date.now()}`;
      const expiresIn = getTokenRemainingSeconds(accessToken);

      this.activeChallengeId = `chal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      this.lastProcessedSeq = 0; // Reset sequence counter for new handshake session

      const ackPayload: HandshakeAckPayload = {
        challengeId: this.activeChallengeId,
        epoch: currentEpoch,
        sessionId: currentTxId,
        expiresIn: Number.isFinite(expiresIn) ? expiresIn : 900,
        accessToken,
        user: authState.user
          ? {
              id: authState.user.id,
              username: authState.user.username,
              fullName: authState.user.fullName,
              role: authState.user.role,
              email: authState.user.email,
              avatarUrl: authState.user.avatarUrl ?? null,
            }
          : null,
        studentProfile: authState.studentProfile
          ? {
              studentCode: authState.studentProfile.studentCode,
              major: authState.studentProfile.major,
              currentSemester: authState.studentProfile.currentSemester,
              creditsEarned: authState.studentProfile.creditsEarned,
              totalRequiredCredits: authState.studentProfile.totalRequiredCredits,
              currentCgpa: authState.studentProfile.currentCgpa,
              previousCgpa: authState.studentProfile.previousCgpa,
            }
          : null,
      };

      const ackEnvelope = this.createEnvelope<HandshakeAckPayload>('AUTH_HANDSHAKE_ACK', ackPayload);
      this.sendResponse(ackEnvelope);
      return ackEnvelope;
    } catch (err: any) {
      const rejectEnvelope = this.createEnvelope<HandshakeRejectPayload>(
        'AUTH_HANDSHAKE_REJECT',
        {
          reason: err?.message || 'FAILED_TO_ACQUIRE_TOKEN',
          requireLogin: true,
        }
      );
      this.sendResponse(rejectEnvelope);
      return rejectEnvelope;
    }
  }

  /**
   * Token Refresh Protocol:
   * Invokes Native TokenBroker's Single-Flight Mutex to safely rotate tokens.
   */
  private async handleRefreshRequest(request: BridgeEnvelope): Promise<BridgeEnvelope<TokenRefreshSuccessPayload | TokenRefreshFailurePayload>> {
    const currentEpoch = getGlobalEpoch();

    try {
      // Force refresh through Single-Flight Mutex
      const newAccessToken = await tokenBroker.forceRefreshToken();
      const newTxId = (await tokenStorage.getTransactionId()) ?? `tx_rf_${Date.now()}`;
      const expiresIn = getTokenRemainingSeconds(newAccessToken);

      const successEnvelope = this.createEnvelope<TokenRefreshSuccessPayload>(
        'AUTH_REFRESH_SUCCESS',
        {
          accessToken: newAccessToken,
          epoch: currentEpoch,
          sessionId: newTxId,
          expiresIn: Number.isFinite(expiresIn) ? expiresIn : 900,
        }
      );
      this.sendResponse(successEnvelope);
      return successEnvelope;
    } catch (refreshErr: any) {
      // Respect Zero Auto-Retry policy from TASK 7.1.1.2:
      if (refreshErr instanceof RefreshAmbiguousError) {
        // Network timeout / 502 / 504: do not revoke local session, report ambiguous failure
        const failEnvelope = this.createEnvelope<TokenRefreshFailurePayload>(
          'AUTH_REFRESH_FAILURE',
          {
            reason: 'AMBIGUOUS_NETWORK_ERROR',
            requireLogin: false,
            statusCode: refreshErr.status,
          }
        );
        this.sendResponse(failEnvelope);
        return failEnvelope;
      }

      // 401 Unauthorized or Session Terminated: revoke session fail-closed
      const failEnvelope = this.createEnvelope<TokenRefreshFailurePayload>(
        'AUTH_REFRESH_FAILURE',
        {
          reason: refreshErr?.message || 'SESSION_REVOKED_BY_SERVER',
          requireLogin: true,
          statusCode: 401,
        }
      );
      this.sendResponse(failEnvelope);

      // Trigger Native Purge
      useAuthStore.getState().logout().catch(() => {});
      return failEnvelope;
    }
  }

  /**
   * Logout Protocol:
   * Executes Native 8-step atomic purge and Emergency Demolition Barrier.
   */
  private async handleLogoutRequest(request: BridgeEnvelope): Promise<BridgeEnvelope<null>> {
    // Invalidate bridge session immediately
    this.activeChallengeId = null;
    this.lastProcessedSeq = 0;

    // Trigger full Native Demolition & Logout
    await useAuthStore.getState().logout();

    const invalidateEnvelope = this.createEnvelope<null>('AUTH_SESSION_INVALIDATED', null);
    this.sendResponse(invalidateEnvelope);
    return invalidateEnvelope;
  }

  /**
   * Native Navigation Request:
   */
  private handleNavigateNative(request: BridgeEnvelope): BridgeEnvelope<null> {
    const payload = request.payload as { route?: string; params?: Record<string, unknown> };
    if (payload?.route && this.onNavigateNative) {
      this.onNavigateNative(payload.route, payload.params);
    }
    return this.createEnvelope<null>('NAVIGATE_NATIVE', null);
  }

  /**
   * Helper to construct a standard BridgeEnvelope v1.0.
   */
  public createEnvelope<T>(type: BridgeMessageType, payload: T): BridgeEnvelope<T> {
    return {
      version: '1.0',
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      timestamp: Date.now(),
      epoch: getGlobalEpoch(),
      payload,
    };
  }

  /**
   * Send response to WebView via callback or injected JS.
   */
  private sendResponse(envelope: BridgeEnvelope): void {
    if (this.sendToWeb) {
      this.sendToWeb(JSON.stringify(envelope));
    }
  }
}

export const secureWebViewBridge = new SecureWebViewBridge();
