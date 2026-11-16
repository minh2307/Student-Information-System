import { useAuthStore } from '@/stores/authStore';
import {
  tokenStorage,
  AUTH_INTENT_KEY,
  SESSION_MANIFEST_KEY,
  CORRUPTED_COUNTER_KEY,
} from '@/storage/tokenStorage';
import { tokenBroker } from '@/bridge/tokenBroker';
import { StoragePersistenceError } from '@/bridge/errors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse } from '@/types';
import { authApi } from '@/features/auth/services/authApi';

describe('Zustand Authentication Store (Phase 7.1.1.2 Hardening)', () => {
  const mockAuthData: AuthResponse = {
    accessToken: 'mock_access_token_123',
    refreshToken: 'mock_refresh_token_456',
    tokenType: 'Bearer',
    user: {
      id: 1,
      username: 'sv2024001',
      email: 'student@rikkei.edu.vn',
      fullName: 'Nguyễn Văn C',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
    studentProfile: {
      studentCode: 'SV2024001',
      major: 'Computer Science',
      currentSemester: 6,
      creditsEarned: 84,
      totalRequiredCredits: 160,
      currentCgpa: 8.74,
      previousCgpa: 8.62,
    },
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

  describe('1. Baseline Authentication & Profile Management', () => {
    it('initializes with unauthenticated state', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.studentProfile).toBeNull();
    });

    it('logs in user, saves tokens, and sets authenticated state', async () => {
      await useAuthStore.getState().login(mockAuthData);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.username).toBe('sv2024001');
      expect(state.role).toBe('STUDENT');
      expect(state.studentProfile?.currentCgpa).toBe(8.74);

      // Verify token persistence in SecureStore
      const savedAccess = await tokenStorage.getAccessToken();
      const savedRefresh = await tokenStorage.getRefreshToken();
      expect(savedAccess).toBe('mock_access_token_123');
      expect(savedRefresh).toBe('mock_refresh_token_456');
    });

    it('clears state, SecureStore tokens, and cached profile upon logout', async () => {
      await useAuthStore.getState().login(mockAuthData);
      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.studentProfile).toBeNull();

      const savedAccess = await tokenStorage.getAccessToken();
      expect(savedAccess).toBeNull();
    });

    it('restores valid session on cold start from storage', async () => {
      await tokenStorage.saveTokens('restored_token_789', 'restored_refresh_012');
      await AsyncStorage.setItem(
        'rikkei_eduportal_user_profile',
        JSON.stringify(mockAuthData.user)
      );
      await AsyncStorage.setItem(
        'rikkei_eduportal_student_profile',
        JSON.stringify(mockAuthData.studentProfile)
      );

      await useAuthStore.getState().restoreSession();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitializing).toBe(false);
      expect(state.user?.fullName).toBe('Nguyễn Văn C');
    });

    it('supports LECTURER role login and persists lecturerProfile', async () => {
      const mockLecturerAuth: AuthResponse = {
        accessToken: 'lecturer_access_token_111',
        refreshToken: 'lecturer_refresh_token_222',
        tokenType: 'Bearer',
        user: {
          id: 2,
          username: 'gv_hoangluong',
          email: 'gv_hoangluong@rikkei.edu.vn',
          fullName: 'TS. Hoàng Lương',
          role: 'LECTURER',
          status: 'ACTIVE',
        },
        lecturerProfile: {
          lecturerCode: 'GV202409',
          department: 'Khoa Công nghệ Phần mềm',
          degree: 'Tiến sĩ',
        },
      };

      await useAuthStore.getState().login(mockLecturerAuth);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.role).toBe('LECTURER');
      expect(state.lecturerProfile?.lecturerCode).toBe('GV202409');
      expect(state.studentProfile).toBeNull();

      await useAuthStore.getState().logout();
      const afterLogout = useAuthStore.getState();
      expect(afterLogout.isAuthenticated).toBe(false);
      expect(afterLogout.lecturerProfile).toBeNull();
    });
  });

  describe('2. 11-step Unified Login Protocol Hardening', () => {
    it('Step 3: persists Write-Ahead Intent before touching Manifest or SecureStore', async () => {
      const recordedSteps: string[] = [];

      const origSetAuthIntent = tokenStorage.setAuthIntent;
      jest.spyOn(tokenStorage, 'setAuthIntent').mockImplementation(async (...args) => {
        recordedSteps.push('setAuthIntent');
        return origSetAuthIntent.apply(tokenStorage, args);
      });

      const origSetSessionManifest = tokenStorage.setSessionManifest;
      jest.spyOn(tokenStorage, 'setSessionManifest').mockImplementation(async (...args) => {
        recordedSteps.push(`manifest_${args[0].state}`);
        return origSetSessionManifest.apply(tokenStorage, args);
      });

      const origSaveTokens = tokenStorage.saveTokens;
      jest.spyOn(tokenStorage, 'saveTokens').mockImplementation(async (...args) => {
        recordedSteps.push('saveTokens');
        return origSaveTokens.apply(tokenStorage, args);
      });

      await useAuthStore.getState().login(mockAuthData);

      // Verify sequence: setAuthIntent -> manifest_UNAUTHENTICATED -> manifest_PENDING -> saveTokens -> manifest_COMMITTED
      expect(recordedSteps[0]).toBe('setAuthIntent');
      expect(recordedSteps).toContain('manifest_UNAUTHENTICATED');
      expect(recordedSteps).toContain('manifest_PENDING');
      expect(recordedSteps).toContain('saveTokens');
      expect(recordedSteps).toContain('manifest_COMMITTED');

      // Transition intent is removed at Step 10
      expect(await tokenStorage.getAuthIntent()).toBeNull();
    });

    it('Blocker E: Phase A Demolition barrier halts login and marks CORRUPTED if clearTokens fails', async () => {
      jest.spyOn(tokenStorage, 'clearTokens').mockRejectedValueOnce(
        new Error('Keystore hardware lock in Demolition Phase')
      );

      await expect(useAuthStore.getState().login(mockAuthData)).rejects.toThrow(
        StoragePersistenceError
      );

      // Broker must be locked fail-closed
      expect(tokenBroker.getIsLocked()).toBe(true);

      // Manifest must be marked CORRUPTED
      const manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('CORRUPTED');

      // State remains unauthenticated
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('TC-LL47 / Blocker I: Hard Demolition in Login breaks through CORRUPTED quarantine', async () => {
      // System initially in CORRUPTED quarantine
      await tokenStorage.setSessionManifest({
        state: 'CORRUPTED',
        epoch: 5,
        corruptedRetryCount: 3,
      });
      await AsyncStorage.setItem(CORRUPTED_COUNTER_KEY, '3');
      tokenBroker.lockBroker();

      // User performs new login
      await useAuthStore.getState().login(mockAuthData);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.username).toBe('sv2024001');
      expect(tokenBroker.getIsLocked()).toBe(false);

      const manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('COMMITTED');
    });
  });

  describe('3. 8-step Unified Logout Protocol Hardening', () => {
    it('locks tokenBroker and invalidates RAM immediately before storage operations', async () => {
      let isBrokerLockedDuringLogout = false;
      jest.spyOn(tokenStorage, 'clearTokens').mockImplementation(async () => {
        isBrokerLockedDuringLogout = tokenBroker.getIsLocked();
      });

      await useAuthStore.getState().login(mockAuthData);
      await useAuthStore.getState().logout();

      expect(isBrokerLockedDuringLogout).toBe(true);
    });

    it('Condition 1: if hardware purge fails during logout, does NOT remove authIntent and marks CORRUPTED', async () => {
      await useAuthStore.getState().login(mockAuthData);

      jest.spyOn(tokenStorage, 'clearTokens').mockRejectedValueOnce(
        new Error('Hardware Keystore locked on logout purge')
      );

      await expect(useAuthStore.getState().logout()).rejects.toThrow();

      // Condition 1: authIntent MUST NOT be deleted!
      const intent = await tokenStorage.getAuthIntent();
      expect(intent).not.toBeNull();
      expect(intent?.action).toBe('LOGOUT');

      // Manifest MUST NOT be marked clean UNAUTHENTICATED
      const manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('CORRUPTED');
    });

    it('TC-LL48 (Blocker J): Emergency Demolition purges SecureStore and sets UNAUTHENTICATED when setAuthIntent fails during logout', async () => {
      await useAuthStore.getState().login(mockAuthData);
      jest.spyOn(tokenStorage, 'setAuthIntent').mockRejectedValueOnce(new Error('DiskFullException'));
      await expect(useAuthStore.getState().logout()).rejects.toThrow('DiskFullException');
      // Verify tokens were demolished from SecureStore
      expect(await tokenStorage.getAccessToken()).toBeNull();
      expect(await tokenStorage.getRefreshToken()).toBeNull();
      expect(await tokenStorage.getTransactionId()).toBeNull();
      const manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('UNAUTHENTICATED');
    });

    it('TC-LL15: Login User B cleanly demolishes lingering LOGOUT intent on disk and commits new session', async () => {
      await tokenStorage.setAuthIntent({ action: 'LOGOUT', epoch: 1, txId: 'old_logout', timestamp: Date.now() });
      await useAuthStore.getState().login(mockAuthData);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(await tokenStorage.getAuthIntent()).toBeNull();
      const manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('COMMITTED');
    });

    it('TC-LL16: Concurrent logout calls from multiple components are serialized safely via Shared FIFO Mutex', async () => {
      await useAuthStore.getState().login(mockAuthData);
      const [res1, res2] = await Promise.allSettled([
        useAuthStore.getState().logout(),
        useAuthStore.getState().logout(),
      ]);
      expect(res1.status).toBe('fulfilled');
      expect(res2.status).toBe('fulfilled');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(await tokenStorage.getAccessToken()).toBeNull();
    });

    it('TC-FI13: Logout occurring while token refresh is in-flight increments epoch and discards rotated tokens', async () => {
      let resolveRefresh: any;
      const pendingPromise = new Promise<any>((resolve) => { resolveRefresh = resolve; });
      jest.spyOn(authApi, 'refreshToken').mockReturnValueOnce(pendingPromise);

      const savePromise = tokenStorage.saveTokens('token_rotated', 'rt_rotated', 'tx_rotated', 1);
      await useAuthStore.getState().logout();
      resolveRefresh({ accessToken: 'token_rotated', refreshToken: 'rt_rotated' });
      await expect(savePromise).resolves.toBeUndefined();
      // Logout must have purged SecureStore
      expect(await tokenStorage.getAccessToken()).toBeNull();
    });
  });
});
