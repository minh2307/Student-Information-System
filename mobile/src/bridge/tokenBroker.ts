/**
 * Native Token Broker (Single-Flight Mutex with Ephemeral Web RAM Distribution)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. Refresh Token stays strictly inside Native SecureStore.
 * 2. WebView only receives ephemeral Access Token in RAM.
 * 3. Enforces Single-Flight Mutex: only ONE /auth/refresh call at a time.
 *    Backend applies Refresh Token Rotation (RTR) and Token Reuse Detection.
 * 4. Token status distinctions:
 *    - VALID: Current Access Token has sufficient TTL (> bufferSeconds). Returned immediately without network.
 *    - EXPIRING: Access Token TTL <= bufferSeconds (60s). Triggers/shares single-flight refresh.
 *    - REFRESHING: Refresh is currently in flight. All callers await the same Promise.
 *    - EXPIRED: Access Token is dead or missing. Must refresh.
 *    - REVOKED: Refresh failed (401/revocation) or session logged out. Throws and terminates session.
 * 5. Logout Race Condition Guard: If logout occurs while refresh is in-flight,
 *    epoch increments and newly rotated tokens are DISCARDED, never persisted.
 * 6. Zero Auto-Retry Policy: Ambiguous network or 5xx server responses never auto-retry
 *    with old refresh token, preventing backend Token Reuse Detection revoking all sessions.
 */

import { tokenStorage } from '@/storage/tokenStorage';
import { authApi } from '@/features/auth/services/authApi';
import { getTokenRemainingSeconds } from '@/utils/jwt';
import { AuthResponse } from '@/types';
import { TokenStatus } from './types';
import {
  BridgeAuthError,
  SessionTerminatedError,
  StoragePersistenceError,
  MissingRefreshTokenError,
  RefreshUnauthorizedError,
  RefreshAmbiguousError,
} from './errors';

export const EXPIRING_BUFFER_SECONDS = 60; // 1 minute safety window before token expiration

export interface TokenBrokerOptions {
  refreshFn?: (refreshToken: string) => Promise<AuthResponse>;
  expiringBufferSeconds?: number;
}

export class TokenBroker {
  private isLocked = false;
  private epoch = 0;
  private consecutiveFailures = 0;
  private refreshPromise: Promise<string> | null = null;
  private expiringBufferSeconds: number;
  private refreshFn: (refreshToken: string) => Promise<AuthResponse>;

  private tokenUpdatedListeners: Array<(authData: AuthResponse) => void> = [];
  private authFailureListeners: Array<() => void> = [];

  constructor(options?: TokenBrokerOptions) {
    this.refreshFn = options?.refreshFn ?? ((rt) => authApi.refreshToken(rt));
    this.expiringBufferSeconds = options?.expiringBufferSeconds ?? EXPIRING_BUFFER_SECONDS;
  }

  /**
   * Determine the current lifecycle state of an Access Token.
   */
  public getTokenStatus(accessToken: string | null): TokenStatus {
    if (this.isLocked) {
      return 'REVOKED';
    }
    if (this.refreshPromise !== null) {
      return 'REFRESHING';
    }
    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
      return 'EXPIRED';
    }

    const remaining = getTokenRemainingSeconds(accessToken);
    if (!Number.isFinite(remaining) || remaining <= 0) {
      return 'EXPIRED';
    }
    if (remaining <= this.expiringBufferSeconds) {
      return 'EXPIRING';
    }
    return 'VALID';
  }

  /**
   * Retrieve valid Access Token for client (WebView or Native Interceptor).
   * - If current token is VALID: returns immediately without network request.
   * - If EXPIRING or EXPIRED: initiates or shares single-flight refresh.
   */
  public async getAccessToken(): Promise<string> {
    if (this.isLocked) {
      throw new SessionTerminatedError('Session terminated: TokenBroker is locked');
    }

    // Check currently stored access token
    const currentToken = await tokenStorage.getAccessToken();
    const status = this.getTokenStatus(currentToken);

    // 1. FAST PATH: Token is still valid with healthy TTL
    if (status === 'VALID' && currentToken) {
      return currentToken;
    }

    // 2. REFRESH PATH: Token is expiring or expired -> join or initiate refresh
    return this.executeSingleFlightRefresh();
  }

  /**
   * Force refresh token regardless of local TTL inspection.
   * Useful when an API call received an actual 401 Unauthorized from backend.
   */
  public async forceRefreshToken(): Promise<string> {
    if (this.isLocked) {
      throw new SessionTerminatedError('Session terminated: TokenBroker is locked');
    }
    return this.executeSingleFlightRefresh();
  }

  /**
   * Internal Single-Flight Mutex execution.
   */
  private async executeSingleFlightRefresh(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const currentEpoch = this.epoch;

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) {
          throw new MissingRefreshTokenError('No refresh token available in SecureStore');
        }

        // Call backend refresh rotation with typed error mapping
        let authData: AuthResponse;
        try {
          authData = await this.refreshFn(refreshToken);
        } catch (netErr: any) {
          if (netErr?.response?.status === 401) {
            throw new RefreshUnauthorizedError('Refresh token rejected or revoked by server: 401 Unauthorized', 401);
          }
          const msg = String(netErr?.message || '').toLowerCase();
          if (msg.includes('revoked') || msg.includes('thu hồi')) {
            throw new RefreshUnauthorizedError(netErr?.message || 'Refresh token revoked', 401);
          }
          if (
            netErr?.code === 'ECONNABORTED' ||
            netErr?.response?.status === 502 ||
            netErr?.response?.status === 503 ||
            netErr?.response?.status === 504 ||
            msg.includes('timeout') ||
            msg.includes('bad gateway')
          ) {
            throw new RefreshAmbiguousError(
              netErr?.message || 'Ambiguous refresh response: network or 5xx server error',
              netErr?.response?.status,
              netErr
            );
          }
          throw netErr;
        }

        // RACE CONDITION GUARD: If logout occurred while refresh was in flight, abort!
        if (this.epoch !== currentEpoch || this.isLocked) {
          throw new SessionTerminatedError('Session terminated during in-flight token refresh');
        }

        if (!authData?.accessToken) {
          throw new Error('Invalid backend response: Missing accessToken');
        }

        // Persist newly rotated tokens securely in SecureStore with transaction ID & epoch
        const txId = `tx_rf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await tokenStorage.saveTokens(authData.accessToken, authData.refreshToken ?? null, txId, this.epoch);
        this.consecutiveFailures = 0;

        // Notify listeners (e.g. Zustand store)
        this.notifyTokenUpdated(authData);

        return authData.accessToken;
      } catch (error: any) {
        if (
          error instanceof SessionTerminatedError ||
          error instanceof RefreshUnauthorizedError ||
          error instanceof MissingRefreshTokenError ||
          error instanceof StoragePersistenceError
        ) {
          this.isLocked = true;
          this.notifyAuthFailure();
        } else if (error instanceof RefreshAmbiguousError) {
          // ZERO AUTO-RETRY: increment consecutiveFailures without locking broker or wiping storage
          this.consecutiveFailures++;
        } else {
          // Compatibility fallback for mock/generic errors
          const errMsg = String(error?.message || '').toLowerCase();
          const isAuthError =
            error?.response?.status === 401 ||
            errMsg.includes('revoked') ||
            errMsg.includes('thu hồi') ||
            errMsg.includes('hết hạn') ||
            errMsg.includes('expired') ||
            errMsg.includes('session terminated') ||
            errMsg.includes('no refresh token') ||
            errMsg.includes('failed to safely persist tokens');

          if (isAuthError) {
            this.isLocked = true;
            this.notifyAuthFailure();
          } else {
            this.consecutiveFailures++;
          }
        }

        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Lock broker upon logout initiation.
   * Prevents any pending or future token requests from succeeding.
   */
  public lockBroker(): void {
    this.isLocked = true;
    this.epoch++;
    this.refreshPromise = null;
  }

  /**
   * Unlock broker upon new successful login.
   */
  public unlockBroker(): void {
    this.isLocked = false;
    this.consecutiveFailures = 0;
    this.refreshPromise = null;
  }

  public getIsLocked(): boolean {
    return this.isLocked;
  }

  public getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  // --- Listener Registration ---
  public onTokenUpdated(listener: (authData: AuthResponse) => void): () => void {
    this.tokenUpdatedListeners.push(listener);
    return () => {
      this.tokenUpdatedListeners = this.tokenUpdatedListeners.filter((l) => l !== listener);
    };
  }

  public onAuthFailure(listener: () => void): () => void {
    this.authFailureListeners.push(listener);
    return () => {
      this.authFailureListeners = this.authFailureListeners.filter((l) => l !== listener);
    };
  }

  private notifyTokenUpdated(authData: AuthResponse): void {
    this.tokenUpdatedListeners.forEach((l) => {
      try {
        l(authData);
      } catch (err) {
        console.warn('Error in tokenUpdatedListener:', err);
      }
    });
  }

  private notifyAuthFailure(): void {
    this.authFailureListeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.warn('Error in authFailureListener:', err);
      }
    });
  }
}

// Export singleton instance for app-wide use
export const tokenBroker = new TokenBroker();
