import { useAuthStore } from '@/stores/authStore';
import {
  tokenStorage,
  AUTH_INTENT_KEY,
  SESSION_MANIFEST_KEY,
  CORRUPTED_COUNTER_KEY,
  TX_ID_KEY,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from '@/storage/tokenStorage';
import { tokenBroker } from '@/bridge/tokenBroker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '@/features/auth/services/authApi';
import { AuthResponse } from '@/types';

jest.mock('@/features/auth/services/authApi', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    getProfile: jest.fn().mockResolvedValue(null),
  },
}));

describe('Session Restoration & Fault-Tolerant Cold Start (P1 to P9-B)', () => {
  const validFutureJwt =
    'header.eyJzdWIiOiJzdjIwMjQwMDEiLCJyb2xlIjoiU1RVREVOVCIsImV4cCI6MjUzMzcwNzY0ODAwfQ.signature';
  const expiredJwt =
    'header.eyJzdWIiOiJzdjIwMjQwMDEiLCJyb2xlIjoiU1RVREVOVCIsImV4cCI6MTAwMDAwMDAwMH0.signature';

  const mockUser = {
    id: 4,
    username: 'sv2024001',
    email: 'sv2024001@rikkei.edu.vn',
    fullName: 'Nguyễn Văn C',
    role: 'STUDENT' as const,
    status: 'ACTIVE' as const,
  };

  const mockStudentProfile = {
    studentCode: 'SV2024001',
    major: 'B.Tech - Computer Science',
    currentSemester: 6,
    creditsEarned: 84,
    totalRequiredCredits: 160,
    currentCgpa: 8.74,
    previousCgpa: 8.62,
  };

  beforeEach(async () => {
    jest.restoreAllMocks();
    tokenBroker.unlockBroker();
    await AsyncStorage.clear();
    await tokenStorage.clearTokens();
    useAuthStore.setState({
      user: null,
      studentProfile: null,
      lecturerProfile: null,
      role: null,
      isAuthenticated: false,
      isInitializing: false,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Standard Restoration (P9)', () => {
    it('restores session immediately when access token is still valid', async () => {
      await tokenStorage.saveTokens(validFutureJwt, 'valid_refresh_token');
      await AsyncStorage.setItem('rikkei_eduportal_user_profile', JSON.stringify(mockUser));
      await AsyncStorage.setItem('rikkei_eduportal_student_profile', JSON.stringify(mockStudentProfile));

      (authApi.getProfile as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
        studentProfile: mockStudentProfile,
        lecturerProfile: null,
      });

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitializing).toBe(false);
      expect(state.user?.username).toBe('sv2024001');
      expect(state.role).toBe('STUDENT');
    });

    it('refreshes token on cold start when access token is expired', async () => {
      await tokenStorage.saveTokens(expiredJwt, 'valid_refresh_token');
      await AsyncStorage.setItem('rikkei_eduportal_user_profile', JSON.stringify(mockUser));

      const rotatedAuth: AuthResponse = {
        accessToken: validFutureJwt,
        refreshToken: 'newly_rotated_refresh_token',
        tokenType: 'Bearer',
        user: mockUser,
        studentProfile: mockStudentProfile,
      };

      (authApi.refreshToken as jest.Mock).mockResolvedValueOnce(rotatedAuth);

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitializing).toBe(false);

      const newAccess = await tokenStorage.getAccessToken();
      const newRefresh = await tokenStorage.getRefreshToken();
      expect(newAccess).toBe(validFutureJwt);
      expect(newRefresh).toBe('newly_rotated_refresh_token');
    });

    it('clears session and returns to login when refresh token is revoked on backend (HTTP 401)', async () => {
      await tokenStorage.saveTokens(expiredJwt, 'revoked_refresh_token');
      await AsyncStorage.setItem('rikkei_eduportal_user_profile', JSON.stringify(mockUser));

      const http401Error = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { message: 'Refresh token đã bị thu hồi' },
        },
      };

      (authApi.refreshToken as jest.Mock).mockRejectedValueOnce(http401Error);

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitializing).toBe(false);
      expect(state.user).toBeNull();

      const storedAccess = await tokenStorage.getAccessToken();
      expect(storedAccess).toBeNull();
    });

    it('retains cached session for offline viewing if cold-start refresh encounters a network error', async () => {
      await tokenStorage.saveTokens(expiredJwt, 'valid_refresh_token');
      await AsyncStorage.setItem('rikkei_eduportal_user_profile', JSON.stringify(mockUser));
      await AsyncStorage.setItem('rikkei_eduportal_student_profile', JSON.stringify(mockStudentProfile));

      const networkError = new Error('Network Error');
      (authApi.refreshToken as jest.Mock).mockRejectedValueOnce(networkError);

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitializing).toBe(false);
      expect(state.user?.username).toBe('sv2024001');
    });
  });

  describe('Rule P1 & P2: I/O & Corrupt Storage Handling (Condition 3)', () => {
    it('P1 (TC-FI07): fails-closed and locks broker when authIntent reading throws an I/O exception', async () => {
      jest.spyOn(tokenStorage, 'getAuthIntent').mockRejectedValueOnce(
        new Error('SQLite Disk I/O Error')
      );

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitializing).toBe(false);
      expect(tokenBroker.getIsLocked()).toBe(true);
    });

    it('P1: fails-closed when authIntent contains invalid JSON or unsupported action', async () => {
      await AsyncStorage.setItem(AUTH_INTENT_KEY, '{"action":"MALICIOUS_ACTION"}');

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(tokenBroker.getIsLocked()).toBe(true);
    });

    it('P2 (TC-FI06): performs Resilient Purge when sessionManifest JSON is corrupt', async () => {
      await tokenStorage.saveTokens(validFutureJwt, 'stale_rt', 'tx_old');
      await AsyncStorage.setItem(SESSION_MANIFEST_KEY, '{corrupted_json_garbage');

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(tokenBroker.getIsLocked()).toBe(true);
      expect(await tokenStorage.getAccessToken()).toBeNull();
      const manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('UNAUTHENTICATED');
    });
  });

  describe('Rule P3 & P4: Logout Intent & Epoch Rules (Blocker H)', () => {
    it('P3 (TC-FI05): performs Resilient Purge when intent exists but manifest is null', async () => {
      await tokenStorage.saveTokens(validFutureJwt, 'rt_p3');
      await AsyncStorage.removeItem(SESSION_MANIFEST_KEY);
      await tokenStorage.setAuthIntent({
        action: 'LOGOUT',
        epoch: 1,
        txId: 'tx_p3',
        timestamp: Date.now(),
      });

      await useAuthStore.getState().restoreSession();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(await tokenStorage.getAccessToken()).toBeNull();
      expect(await tokenStorage.getAuthIntent()).toBeNull();
    });

    it('P4 / TC-LL38 (Blocker H): LOGOUT intent ALWAYS purges 100%, even if Manifest has higher epoch', async () => {
      await tokenStorage.saveTokens(validFutureJwt, 'stale_user_a_token', 'tx_user_a');
      await AsyncStorage.setItem('rikkei_eduportal_user_profile', JSON.stringify(mockUser));

      // Intent with lower epoch E10, but Manifest has higher epoch E12
      await tokenStorage.setAuthIntent({
        action: 'LOGOUT',
        epoch: 10,
        txId: 'tx_logout_e10',
        timestamp: Date.now(),
      });
      await tokenStorage.setSessionManifest({
        state: 'COMMITTED',
        epoch: 12, // higher epoch!
        txId: 'tx_user_a',
      });

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(await tokenStorage.getAccessToken()).toBeNull();
      expect(await tokenStorage.getRefreshToken()).toBeNull();
      expect(await tokenStorage.getAuthIntent()).toBeNull();
      expect(await AsyncStorage.getItem('rikkei_eduportal_user_profile')).toBeNull();
    });
  });

  describe('Rule P4-B & P5: Login Transition Triple-TxId Rules (Blocker H)', () => {
    it('P5 / TC-LL39 (Blocker H): Triple-TxId match confirms new session and clears transition intent', async () => {
      const txB = 'tx_user_b_success';
      await tokenStorage.saveTokens(validFutureJwt, 'refresh_b', txB, 11);
      await AsyncStorage.setItem('rikkei_eduportal_user_profile', JSON.stringify(mockUser));

      await tokenStorage.setAuthIntent({
        action: 'LOGIN_TRANSITION',
        epoch: 11,
        txId: txB,
        timestamp: Date.now(),
      });
      await tokenStorage.setSessionManifest({
        state: 'COMMITTED',
        epoch: 11,
        txId: txB,
      });

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.username).toBe('sv2024001');
      // Transition intent must be deleted
      expect(await tokenStorage.getAuthIntent()).toBeNull();
    });

    it('P4-B / TC-LL40 (Blocker H): Mismatched Manifest TxId triggers interrupted transition purge', async () => {
      const txA = 'tx_user_a_stale';
      const txB = 'tx_user_b_new';

      await tokenStorage.saveTokens(validFutureJwt, 'refresh_a', txA, 10);
      await tokenStorage.setAuthIntent({
        action: 'LOGIN_TRANSITION',
        epoch: 11,
        txId: txB,
        timestamp: Date.now(),
      });
      await tokenStorage.setSessionManifest({
        state: 'COMMITTED',
        epoch: 10,
        txId: txA, // Manifest txId is txA, but intent is txB!
      });

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(await tokenStorage.getAccessToken()).toBeNull();
      expect(await tokenStorage.getRefreshToken()).toBeNull();
    });

    it('P4-B / TC-LL41 (Blocker H): Mismatched SecureStore TxId triggers fail-closed purge', async () => {
      const txB = 'tx_user_b_matched';
      await tokenStorage.saveTokens(validFutureJwt, 'refresh_b', 'tx_different', 11);
      await tokenStorage.setAuthIntent({
        action: 'LOGIN_TRANSITION',
        epoch: 11,
        txId: txB,
        timestamp: Date.now(),
      });
      await tokenStorage.setSessionManifest({
        state: 'COMMITTED',
        epoch: 11,
        txId: txB,
      });

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(await tokenStorage.getAccessToken()).toBeNull();
    });
  });

  describe('Rule P6 & P8: Pending Manifest & Idempotent Purge (Blocker D)', () => {
    it('P6 (TC-FI11 / TC-FI12): purges SecureStore if Manifest state is PENDING', async () => {
      await tokenStorage.saveTokens(validFutureJwt, 'rt_pending', 'tx_pending', 5);
      await tokenStorage.setSessionManifest({
        state: 'PENDING',
        txId: 'tx_pending',
        epoch: 5,
      });

      await useAuthStore.getState().restoreSession();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(await tokenStorage.getAccessToken()).toBeNull();
      const manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('UNAUTHENTICATED');
    });

    it('P8 (Blocker D): performs Idempotent Resilient Purge on UNAUTHENTICATED manifest', async () => {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, 'residual_stale_token');
      await tokenStorage.setSessionManifest({
        state: 'UNAUTHENTICATED',
        epoch: 1,
      });

      await useAuthStore.getState().restoreSession();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(await tokenStorage.getAccessToken()).toBeNull();
      expect(tokenBroker.getIsLocked()).toBe(false);
    });
  });

  describe('Rule P7: Controlled Quarantine Recovery & Write-Ahead Counter (Blocker I)', () => {
    it('TC-LL42 (Blocker I): writes incremented counter to disk before calling clearTokens', async () => {
      await tokenStorage.setSessionManifest({
        state: 'CORRUPTED',
        epoch: 1,
        corruptedRetryCount: 0,
      });

      let counterValueDuringClear = -1;
      const originalClear = tokenStorage.clearTokens;
      jest.spyOn(tokenStorage, 'clearTokens').mockImplementationOnce(async (...args) => {
        counterValueDuringClear = await tokenStorage.getCorruptedRetryCount();
        return originalClear.apply(tokenStorage, args);
      });

      await useAuthStore.getState().restoreSession();

      expect(counterValueDuringClear).toBe(1);
    });

    it('TC-LL43 (Blocker I): preserves counter across crash and increments from prior value', async () => {
      await AsyncStorage.setItem(CORRUPTED_COUNTER_KEY, '1');
      await tokenStorage.setSessionManifest({
        state: 'CORRUPTED',
        epoch: 2,
        corruptedRetryCount: 1,
      });

      let counterDuringSecondAttempt = -1;
      const originalClear = tokenStorage.clearTokens;
      jest.spyOn(tokenStorage, 'clearTokens').mockImplementationOnce(async (...args) => {
        counterDuringSecondAttempt = await tokenStorage.getCorruptedRetryCount();
        return originalClear.apply(tokenStorage, args);
      });

      await useAuthStore.getState().restoreSession();

      expect(counterDuringSecondAttempt).toBe(2);
    });

    it('TC-LL44 (Blocker I): aborts cleanup immediately if counter write fails (Disk Full)', async () => {
      await tokenStorage.setSessionManifest({
        state: 'CORRUPTED',
        epoch: 1,
        corruptedRetryCount: 0,
      });

      const clearSpy = jest.spyOn(tokenStorage, 'clearTokens');
      jest.spyOn(tokenStorage, 'incrementCorruptedRetryCount').mockRejectedValueOnce(
        new Error('DiskFullException')
      );

      await useAuthStore.getState().restoreSession();

      expect(clearSpy).not.toHaveBeenCalled();
      expect(tokenBroker.getIsLocked()).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('TC-LL45 (Blocker I): stops auto-retry when counter reaches 3 and holds quarantine', async () => {
      await AsyncStorage.setItem(CORRUPTED_COUNTER_KEY, '3');
      await tokenStorage.setSessionManifest({
        state: 'CORRUPTED',
        epoch: 3,
        corruptedRetryCount: 3,
      });

      const clearSpy = jest.spyOn(tokenStorage, 'clearTokens');

      await useAuthStore.getState().restoreSession();

      expect(clearSpy).not.toHaveBeenCalled();
      expect(tokenBroker.getIsLocked()).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('TC-LL46 (Blocker I): self-healing on attempt 2 resets counter and unlocks broker', async () => {
      await AsyncStorage.setItem(CORRUPTED_COUNTER_KEY, '1');
      await tokenStorage.setSessionManifest({
        state: 'CORRUPTED',
        epoch: 2,
        corruptedRetryCount: 1,
      });

      await useAuthStore.getState().restoreSession();

      const manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('UNAUTHENTICATED');
      expect(await tokenStorage.getCorruptedRetryCount()).toBe(0);
      expect(tokenBroker.getIsLocked()).toBe(false);
    });
  });

  describe('Rule P9-B: Identity Mismatch Purge', () => {
    it('P9-B: purges fail-closed and marks CORRUPTED when storedTxId differs from manifest.txId', async () => {
      await tokenStorage.saveTokens(validFutureJwt, 'rt_mismatch', 'tx_stored_old', 5);
      await tokenStorage.setSessionManifest({
        state: 'COMMITTED',
        txId: 'tx_manifest_new', // Mismatched!
        epoch: 5,
      });

      await useAuthStore.getState().restoreSession();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(await tokenStorage.getAccessToken()).toBeNull();
      const manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('CORRUPTED');
      expect(tokenBroker.getIsLocked()).toBe(true);
    });

    it('TC-FI14 / Sub-case 1.1: If tokens were cleared from SecureStore but Manifest remains COMMITTED, P9-B triggers fail-closed', async () => {
      // SecureStore empty (storedTxId is null), but Manifest says COMMITTED
      await tokenStorage.setSessionManifest({ state: 'COMMITTED', txId: 'tx_stale_ghost', epoch: 1 });
      await useAuthStore.getState().restoreSession();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      const manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('CORRUPTED');
      expect(tokenBroker.getIsLocked()).toBe(true);
    });
  });

  describe('Crash Safety & Failure Recovery Matrices (TC-LL06, TC-LL22-25, TC-LL36-37, TC-FI01-04)', () => {
    it('TC-LL06: Crash between Step 3 (Write-Ahead Transition Intent) and Step 4 (Demolition) triggers P4-B Purge on cold start', async () => {
      await tokenStorage.saveTokens(validFutureJwt, 'stale_rt', 'tx_user_a', 1);
      await tokenStorage.setSessionManifest({ state: 'COMMITTED', txId: 'tx_user_a', epoch: 1 });
      await tokenStorage.setAuthIntent({ action: 'LOGIN_TRANSITION', txId: 'tx_user_b', epoch: 2, timestamp: Date.now() });
      await useAuthStore.getState().restoreSession();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(await tokenStorage.getAccessToken()).toBeNull();
      expect(await tokenStorage.getAuthIntent()).toBeNull();
      const manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('UNAUTHENTICATED');
    });

    it('TC-LL22: Crash during partial SecureStore clear in P8 leaves manifest UNAUTHENTICATED, cold start re-clears cleanly', async () => {
      await tokenStorage.setSessionManifest({ state: 'UNAUTHENTICATED', epoch: 1 });
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, 'lingering_access');
      await useAuthStore.getState().restoreSession();
      expect(await tokenStorage.getAccessToken()).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('TC-LL23: Crash during cache removal in P8 leaves manifest UNAUTHENTICATED, subsequent cold start completes purge', async () => {
      await tokenStorage.setSessionManifest({ state: 'UNAUTHENTICATED', epoch: 1 });
      await AsyncStorage.setItem('rikkei_eduportal_user_profile', JSON.stringify(mockUser));
      await useAuthStore.getState().restoreSession();
      expect(await AsyncStorage.getItem('rikkei_eduportal_user_profile')).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('TC-LL25: Hardware Keystore failure during P8 purge transitions Manifest to CORRUPTED and locks broker', async () => {
      await tokenStorage.setSessionManifest({ state: 'UNAUTHENTICATED', epoch: 1 });
      jest.spyOn(tokenStorage, 'clearTokens').mockRejectedValueOnce(new Error('Hardware Keystore Locked'));
      await useAuthStore.getState().restoreSession();
      const manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('CORRUPTED');
      expect(tokenBroker.getIsLocked()).toBe(true);
    });

    it('TC-LL36: Storage read failure in P7 defaults retryCount to 3 and permanently quarantines session', async () => {
      await tokenStorage.setSessionManifest({ state: 'CORRUPTED', epoch: 1, corruptedRetryCount: 1 });
      jest.spyOn(tokenStorage, 'getCorruptedRetryCount').mockRejectedValueOnce(new Error('Disk Read Fault'));
      const clearSpy = jest.spyOn(tokenStorage, 'clearTokens');
      await useAuthStore.getState().restoreSession();
      expect(clearSpy).not.toHaveBeenCalled();
      expect(tokenBroker.getIsLocked()).toBe(true);
    });

    it('TC-LL37: Concurrent restoreSession calls are serialized via Shared FIFO Mutex without duplicate increments', async () => {
      await tokenStorage.setSessionManifest({ state: 'CORRUPTED', epoch: 1, corruptedRetryCount: 0 });
      await Promise.all([
        useAuthStore.getState().restoreSession(),
        useAuthStore.getState().restoreSession(),
      ]);
      const count = await tokenStorage.getCorruptedRetryCount();
      expect(count).toBe(0);
      expect(tokenBroker.getIsLocked()).toBe(false);
    });

    it('TC-FI01: Pre-Persistence Crash (RR-01) where user pressed logout but power cut before intent flush restores old session safely', async () => {
      await tokenStorage.saveTokens(validFutureJwt, 'valid_refresh_token', 'tx_committed_1', 1);
      await tokenStorage.setSessionManifest({ state: 'COMMITTED', txId: 'tx_committed_1', epoch: 1 });
      await AsyncStorage.setItem('rikkei_eduportal_user_profile', JSON.stringify(mockUser));
      await useAuthStore.getState().restoreSession();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('TC-FI03: Crash during partial SecureStore delete in logout leaves LOGOUT intent, cold start P4 finishes full purge', async () => {
      await tokenStorage.setAuthIntent({ action: 'LOGOUT', epoch: 2, txId: 'tx_logout_crash', timestamp: Date.now() });
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, 'stale_refresh_leftover');
      await useAuthStore.getState().restoreSession();
      expect(await tokenStorage.getRefreshToken()).toBeNull();
      expect(await tokenStorage.getAuthIntent()).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('TC-FI04: SecureStore purge completed but process killed before intent deletion in logout, cold start P4 cleans intent', async () => {
      await tokenStorage.setAuthIntent({ action: 'LOGOUT', epoch: 2, txId: 'tx_logout_done', timestamp: Date.now() });
      await tokenStorage.setSessionManifest({ state: 'UNAUTHENTICATED', epoch: 2 });
      await useAuthStore.getState().restoreSession();
      expect(await tokenStorage.getAuthIntent()).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
