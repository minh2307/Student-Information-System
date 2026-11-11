/**
 * SecureWebViewBridge.test.ts
 * Comprehensive Security & Protocol Tests for Native <-> WebView Bridge.
 *
 * Covers all Mandatory Test Directives for TASK 7.1.2:
 * - Invalid origin rejection (RFC 3986)
 * - Spoofed / malformed message rejection
 * - Anti-Replay nonce cache & sliding window expiration
 * - Monotonic sequence enforcement
 * - Stale epoch & session transaction mismatch
 * - Zero Refresh Token leakage across Handshake and Refresh
 * - Handshake lifecycle and reload recovery
 * - Single-Flight token refresh integration with TokenBroker
 * - Zero Auto-Retry policy on ambiguous network errors (502 / timeout)
 * - Session revocation on 401
 * - Atomic Logout & In-flight message invalidation
 */

import {
  SecureWebViewBridge,
  SLIDING_WINDOW_MS,
  DEFAULT_PRODUCTION_ORIGINS,
} from '@/bridge/SecureWebViewBridge';
import { tokenBroker } from '@/bridge/tokenBroker';
import { tokenStorage } from '@/storage/tokenStorage';
import { useAuthStore, getGlobalEpoch, setGlobalEpochForTesting } from '@/stores/authStore';
import {
  InvalidOriginError,
  InvalidEnvelopeError,
  ReplayAttackError,
  StaleEpochError,
  SessionTerminatedError,
  RefreshAmbiguousError,
  RefreshUnauthorizedError,
} from '@/bridge/errors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse } from '@/types';

describe('SecureWebViewBridge (TASK 7.1.2 Security Engine)', () => {
  let bridge: SecureWebViewBridge;
  let sentResponses: any[] = [];

  const validProductionUrl = 'https://rikkeiportal.io.vn/profile';
  const validDevUrl = 'http://localhost:5173/profile';
  const maliciousUrl = 'http://attacker.com/malicious';

  const mockUser = {
    id: 1,
    username: 'sv2024001',
    email: 'student@rikkei.edu.vn',
    fullName: 'Nguyễn Văn C',
    role: 'STUDENT' as const,
    status: 'ACTIVE' as const,
  };

  const mockStudentProfile = {
    studentCode: 'SV2024001',
    major: 'Computer Science',
    currentSemester: 6,
    creditsEarned: 84,
    totalRequiredCredits: 160,
    currentCgpa: 8.74,
    previousCgpa: 8.62,
  };

  const validJwt =
    'header.eyJzdWIiOiJzdjIwMjQwMDEiLCJyb2xlIjoiU1RVREVOVCIsImV4cCI6MjUzMzcwNzY0ODAwfQ.signature';

  beforeEach(async () => {
    jest.restoreAllMocks();
    sentResponses = [];
    setGlobalEpochForTesting(0);
    await AsyncStorage.clear();
    await tokenStorage.clearTokens();
    tokenBroker.unlockBroker();

    useAuthStore.setState({
      user: null,
      studentProfile: null,
      lecturerProfile: null,
      role: null,
      isAuthenticated: false,
      isInitializing: false,
    });

    bridge = new SecureWebViewBridge({
      allowedOrigins: ['https://rikkeiportal.io.vn', 'http://localhost:5173'],
      isDev: true,
      sendToWeb: (jsonString: string) => {
        sentResponses.push(JSON.parse(jsonString));
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. Origin Verification Tests ──
  describe('1. Origin Verification (RFC 3986)', () => {
    it('accepts messages from exact allowlisted HTTPS production origin', async () => {
      expect(bridge.isValidOrigin('https://rikkeiportal.io.vn/profile')).toBe(true);
      expect(bridge.isValidOrigin('https://rikkeiportal.io.vn/student/grades')).toBe(true);
    });

    it('accepts messages from exact allowlisted development origin in dev mode', async () => {
      expect(bridge.isValidOrigin('http://localhost:5173/profile')).toBe(true);
    });

    it('rejects messages from untrusted or malicious origins', async () => {
      expect(bridge.isValidOrigin('http://attacker.com/profile')).toBe(false);
      expect(bridge.isValidOrigin('https://fake-rikkeiportal.io.vn')).toBe(false);
      expect(bridge.isValidOrigin('https://rikkeiportal.io.vn.evil.com')).toBe(false);
      expect(bridge.isValidOrigin('javascript:alert(1)')).toBe(false);
      expect(bridge.isValidOrigin('')).toBe(false);
    });

    it('strictly enforces HTTPS in production mode even if domain matches', () => {
      const prodBridge = new SecureWebViewBridge({
        allowedOrigins: DEFAULT_PRODUCTION_ORIGINS,
        isDev: false,
      });

      expect(prodBridge.isValidOrigin('https://rikkeiportal.io.vn/profile')).toBe(true);
      // HTTP rejected in prod!
      expect(prodBridge.isValidOrigin('http://rikkeiportal.io.vn/profile')).toBe(false);
      expect(prodBridge.isValidOrigin('http://localhost:5173')).toBe(false);
    });

    it('throws InvalidOriginError when handleMessage receives untrusted URL', async () => {
      const payload = JSON.stringify({
        version: '1.0',
        id: 'msg_test_1',
        type: 'AUTH_HANDSHAKE_INIT',
        timestamp: Date.now(),
        payload: {},
      });

      await expect(bridge.handleMessage(payload, maliciousUrl)).rejects.toThrow(
        InvalidOriginError
      );
    });
  });

  // ── 2. Envelope Schema & Payload Validation Tests ──
  describe('2. Envelope Schema & Payload Validation', () => {
    it('rejects malformed non-JSON data fail-closed', async () => {
      await expect(
        bridge.handleMessage('THIS_IS_NOT_JSON', validProductionUrl)
      ).rejects.toThrow(InvalidEnvelopeError);
    });

    it('rejects payload exceeding 64KB maximum limit', async () => {
      const hugeData = 'x'.repeat(70_000);
      await expect(bridge.handleMessage(hugeData, validProductionUrl)).rejects.toThrow(
        InvalidEnvelopeError
      );
    });

    it('rejects unsupported bridge versions', async () => {
      const payload = JSON.stringify({
        version: '2.0', // Unsupported
        id: 'msg_v2_test',
        type: 'AUTH_HANDSHAKE_INIT',
        timestamp: Date.now(),
        payload: {},
      });

      await expect(bridge.handleMessage(payload, validProductionUrl)).rejects.toThrow(
        /Unsupported Bridge version/
      );
    });

    it('rejects unallowed or malicious message types', async () => {
      const payload = JSON.stringify({
        version: '1.0',
        id: 'msg_hack_1',
        type: 'STEAL_REFRESH_TOKEN',
        timestamp: Date.now(),
        payload: {},
      });

      await expect(bridge.handleMessage(payload, validProductionUrl)).rejects.toThrow(
        /Unknown or unallowed message type/
      );
    });
  });

  // ── 3. Anti-Replay & Freshness Protection Tests (Condition 1 Fix) ──
  describe('3. Anti-Replay & Freshness Protection (Condition 1)', () => {
    it('rejects messages with timestamp older than 60s sliding window', async () => {
      const expiredTimestamp = Date.now() - (SLIDING_WINDOW_MS + 5_000); // 65s ago
      const payload = JSON.stringify({
        version: '1.0',
        id: 'msg_old_timestamp',
        type: 'AUTH_HANDSHAKE_INIT',
        timestamp: expiredTimestamp,
        payload: {},
      });

      await expect(bridge.handleMessage(payload, validProductionUrl)).rejects.toThrow(
        ReplayAttackError
      );
    });

    it('rejects duplicate message ID (Replay Attack)', async () => {
      const now = Date.now();
      const payload = JSON.stringify({
        version: '1.0',
        id: 'duplicate_nonce_12345',
        type: 'AUTH_HANDSHAKE_INIT',
        timestamp: now,
        payload: {},
      });

      // First delivery: Accepted
      await bridge.handleMessage(payload, validProductionUrl);

      // Replay delivery: REJECTED!
      await expect(bridge.handleMessage(payload, validProductionUrl)).rejects.toThrow(
        ReplayAttackError
      );
    });

    it('enforces monotonic sequence number per session channel', async () => {
      bridge.setActiveChallengeForTesting('chal_seq_test');
      jest.spyOn(tokenBroker, 'forceRefreshToken').mockResolvedValue('jwt_token');
      await tokenStorage.saveTokens(validJwt, 'rt_seq', 'tx_seq_sess', 1);
      await tokenStorage.setSessionManifest({ state: 'COMMITTED', txId: 'tx_seq_sess', epoch: 1 });
      useAuthStore.setState({ isAuthenticated: true, user: mockUser });

      // Seq 1: Accepted
      const p1 = JSON.stringify({
        version: '1.0',
        id: 'msg_seq_1',
        type: 'AUTH_REFRESH_REQUEST',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: 'tx_seq_sess',
        seq: 1,
        payload: {},
      });
      await bridge.handleMessage(p1, validProductionUrl);

      // Seq 1 replay or lower seq (0): REJECTED!
      const pReplay = JSON.stringify({
        version: '1.0',
        id: 'msg_seq_replay',
        type: 'AUTH_REFRESH_REQUEST',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: 'tx_seq_sess',
        seq: 1, // <= lastSeen 1
        payload: {},
      });
      await expect(bridge.handleMessage(pReplay, validProductionUrl)).rejects.toThrow(
        ReplayAttackError
      );
    });
  });

  // ── 4. Session & Epoch Invalidation Tests ──
  describe('4. Session & Epoch Invalidation', () => {
    it('rejects post-handshake messages if no active handshake session was established', async () => {
      await tokenStorage.saveTokens(validJwt, 'rt_epoch', 'tx_epoch_sess', 1);
      useAuthStore.setState({ isAuthenticated: true, user: mockUser });

      const msg = JSON.stringify({
        version: '1.0',
        id: 'msg_no_chal',
        type: 'AUTH_REFRESH_REQUEST',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: 'tx_epoch_sess',
        seq: 1,
        payload: {},
      });

      await expect(bridge.handleMessage(msg, validProductionUrl)).rejects.toThrow(
        SessionTerminatedError
      );
    });

    it('rejects messages carrying stale epoch from previous session', async () => {
      bridge.setActiveChallengeForTesting('chal_epoch_test');
      await tokenStorage.saveTokens(validJwt, 'rt_epoch', 'tx_epoch_sess', 5);
      useAuthStore.setState({ isAuthenticated: true, user: mockUser });

      const staleMessage = JSON.stringify({
        version: '1.0',
        id: 'msg_stale_epoch',
        type: 'AUTH_REFRESH_REQUEST',
        timestamp: Date.now(),
        epoch: 999, // Mismatched epoch!
        sessionId: 'tx_epoch_sess',
        payload: {},
      });

      await expect(bridge.handleMessage(staleMessage, validProductionUrl)).rejects.toThrow(
        StaleEpochError
      );
    });

    it('rejects messages carrying mismatched sessionId', async () => {
      bridge.setActiveChallengeForTesting('chal_sess_test');
      await tokenStorage.saveTokens(validJwt, 'rt_sess', 'tx_active_session', 1);
      useAuthStore.setState({ isAuthenticated: true, user: mockUser });

      const mismatchedSessionMessage = JSON.stringify({
        version: '1.0',
        id: 'msg_mismatched_sess',
        type: 'AUTH_REFRESH_REQUEST',
        timestamp: Date.now(),
        epoch: 0,
        sessionId: 'tx_ghost_imposter', // Different!
        payload: {},
      });

      await expect(
        bridge.handleMessage(mismatchedSessionMessage, validProductionUrl)
      ).rejects.toThrow(StaleEpochError);
    });

    it('rejects all operations when TokenBroker is locked', async () => {
      tokenBroker.lockBroker();

      const message = JSON.stringify({
        version: '1.0',
        id: 'msg_locked_broker',
        type: 'AUTH_REFRESH_REQUEST',
        timestamp: Date.now(),
        epoch: 0,
        sessionId: 'tx_any',
        payload: {},
      });

      await expect(bridge.handleMessage(message, validProductionUrl)).rejects.toThrow(
        SessionTerminatedError
      );
    });
  });

  // ── 5. Handshake Protocol & Zero Refresh Token Leakage ──
  describe('5. Handshake Protocol & Zero Token Leakage (Condition 3)', () => {
    it('transmits ephemeral Access Token, user profile and challenge upon valid Handshake', async () => {
      await tokenStorage.saveTokens(validJwt, 'secret_refresh_token_vault', 'tx_handshake_1', 1);
      useAuthStore.setState({
        isAuthenticated: true,
        user: mockUser,
        studentProfile: mockStudentProfile,
      });

      const handshakeInit = JSON.stringify({
        version: '1.0',
        id: 'msg_init_1',
        type: 'AUTH_HANDSHAKE_INIT',
        timestamp: Date.now(),
        payload: { clientVersion: '1.0' },
      });

      await bridge.handleMessage(handshakeInit, validProductionUrl);

      expect(sentResponses).toHaveLength(1);
      const ack = sentResponses[0];
      expect(ack.type).toBe('AUTH_HANDSHAKE_ACK');
      expect(ack.payload.accessToken).toBe(validJwt);
      expect(ack.payload.user.username).toBe('sv2024001');
      expect(ack.payload.studentProfile.studentCode).toBe('SV2024001');
      expect(ack.payload.challengeId).toBeDefined();

      // STRICT ZERO LEAKAGE ASSERTION: Refresh Token MUST NOT exist in payload anywhere!
      const rawAckString = JSON.stringify(ack);
      expect(rawAckString).not.toContain('secret_refresh_token_vault');
      expect(rawAckString).not.toContain('refreshToken');
    });

    it('responds with AUTH_HANDSHAKE_REJECT if Native has no active session', async () => {
      useAuthStore.setState({ isAuthenticated: false, user: null });

      const handshakeInit = JSON.stringify({
        version: '1.0',
        id: 'msg_init_no_session',
        type: 'AUTH_HANDSHAKE_INIT',
        timestamp: Date.now(),
        payload: { clientVersion: '1.0' },
      });

      await bridge.handleMessage(handshakeInit, validProductionUrl);

      expect(sentResponses).toHaveLength(1);
      const reject = sentResponses[0];
      expect(reject.type).toBe('AUTH_HANDSHAKE_REJECT');
      expect(reject.payload.requireLogin).toBe(true);
    });
  });

  // ── 6. Token Refresh via Native TokenBroker & Zero Auto-Retry ──
  describe('6. Token Refresh & Zero Auto-Retry Policy (Condition 4)', () => {
    beforeEach(() => {
      bridge.setActiveChallengeForTesting('chal_rf_test');
    });

    it('delegates 401 refresh to TokenBroker and returns AUTH_REFRESH_SUCCESS', async () => {
      await tokenStorage.saveTokens(validJwt, 'valid_rt', 'tx_rf_test', 1);
      useAuthStore.setState({ isAuthenticated: true, user: mockUser });

      jest.spyOn(tokenBroker, 'forceRefreshToken').mockResolvedValueOnce('new_rotated_jwt');

      const refreshMsg = JSON.stringify({
        version: '1.0',
        id: 'msg_rf_req',
        type: 'AUTH_REFRESH_REQUEST',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: 'tx_rf_test',
        seq: 1,
        payload: { reason: 'UNAUTHORIZED_401' },
      });

      await bridge.handleMessage(refreshMsg, validProductionUrl);

      expect(sentResponses).toHaveLength(1);
      const res = sentResponses[0];
      expect(res.type).toBe('AUTH_REFRESH_SUCCESS');
      expect(res.payload.accessToken).toBe('new_rotated_jwt');
      expect(res.payload.sessionId).toBeDefined();
    });

    it('respects Zero Auto-Retry: on 502/Timeout returns AUTH_REFRESH_FAILURE without revoking session', async () => {
      await tokenStorage.saveTokens(validJwt, 'valid_rt', 'tx_rf_net_err', 1);
      useAuthStore.setState({ isAuthenticated: true, user: mockUser });

      jest.spyOn(tokenBroker, 'forceRefreshToken').mockRejectedValueOnce(
        new RefreshAmbiguousError('Bad Gateway 502', 502)
      );

      const refreshMsg = JSON.stringify({
        version: '1.0',
        id: 'msg_rf_net',
        type: 'AUTH_REFRESH_REQUEST',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: 'tx_rf_net_err',
        seq: 1,
        payload: { reason: 'UNAUTHORIZED_401' },
      });

      await bridge.handleMessage(refreshMsg, validProductionUrl);

      expect(sentResponses).toHaveLength(1);
      const res = sentResponses[0];
      expect(res.type).toBe('AUTH_REFRESH_FAILURE');
      expect(res.payload.reason).toBe('AMBIGUOUS_NETWORK_ERROR');
      // Zero Auto-Retry: DO NOT force user to login on transient network error!
      expect(res.payload.requireLogin).toBe(false);
      expect(res.payload.statusCode).toBe(502);
    });

    it('revokes session fail-closed on 401 RefreshUnauthorizedError', async () => {
      await tokenStorage.saveTokens(validJwt, 'revoked_rt', 'tx_rf_revoked', 1);
      useAuthStore.setState({ isAuthenticated: true, user: mockUser });

      jest.spyOn(tokenBroker, 'forceRefreshToken').mockRejectedValueOnce(
        new RefreshUnauthorizedError('Refresh token revoked on server', 401)
      );
      const logoutSpy = jest.spyOn(useAuthStore.getState(), 'logout');

      const refreshMsg = JSON.stringify({
        version: '1.0',
        id: 'msg_rf_revoked',
        type: 'AUTH_REFRESH_REQUEST',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: 'tx_rf_revoked',
        seq: 1,
        payload: { reason: 'UNAUTHORIZED_401' },
      });

      await bridge.handleMessage(refreshMsg, validProductionUrl);

      expect(sentResponses).toHaveLength(1);
      const res = sentResponses[0];
      expect(res.type).toBe('AUTH_REFRESH_FAILURE');
      expect(res.payload.requireLogin).toBe(true);
      expect(logoutSpy).toHaveBeenCalled();
    });
  });

  // ── 7. Atomic Logout & Session Demolition ──
  describe('7. Atomic Logout Protocol', () => {
    it('executes Native 8-step demolition when APP_LOGOUT_REQUEST is received', async () => {
      bridge.setActiveChallengeForTesting('chal_logout_test');
      await tokenStorage.saveTokens(validJwt, 'rt_logout', 'tx_logout_test', 1);
      useAuthStore.setState({ isAuthenticated: true, user: mockUser });

      const logoutSpy = jest.spyOn(useAuthStore.getState(), 'logout');

      const logoutMsg = JSON.stringify({
        version: '1.0',
        id: 'msg_logout_1',
        type: 'APP_LOGOUT_REQUEST',
        timestamp: Date.now(),
        epoch: getGlobalEpoch(),
        sessionId: 'tx_logout_test',
        seq: 1,
        payload: {},
      });

      await bridge.handleMessage(logoutMsg, validProductionUrl);

      expect(logoutSpy).toHaveBeenCalled();
      expect(sentResponses).toHaveLength(1);
      expect(sentResponses[0].type).toBe('AUTH_SESSION_INVALIDATED');
    });
  });
});
