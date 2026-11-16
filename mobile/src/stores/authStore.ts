/**
 * Zustand Authentication Store
 * Manages user identity, session lifecycle, and authentication state.
 *
 * Phase 7.1.1.2 Hardening:
 * - 11-step Unified Login Protocol with Write-Ahead Intent and Phase A Demolition Barrier
 * - 8-step Unified Logout Protocol with Write-Ahead Intent and Strict Purge
 * - Fault-Tolerant Cold Start Decision Table (P1 to P9-B)
 * - Controlled Quarantine Recovery (P7) with Write-Ahead Counter Increment
 * - Zero Auto-Retry enforcement for ambiguous refresh responses
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  tokenStorage,
  sharedWriteMutex,
  AuthIntent,
  SessionManifest,
  CORRUPTED_COUNTER_KEY,
  SESSION_MANIFEST_KEY,
} from '@/storage/tokenStorage';
import { tokenBroker } from '@/bridge/tokenBroker';
import { StoragePersistenceError } from '@/bridge/errors';
import { AuthResponse, LecturerProfile, Role, StudentProfile, User } from '@/types';
import {
  cancelPendingRefresh,
  setAuthFailureHandler,
  setTokenUpdatedHandler,
} from '@/api/interceptors/authInterceptor';
import { authApi } from '@/features/auth/services/authApi';
import { clearQueryCache } from '@/providers/queryClient';
import { isTokenExpired } from '@/utils/jwt';

const USER_STORAGE_KEY = 'rikkei_eduportal_user_profile';
const PROFILE_STORAGE_KEY = 'rikkei_eduportal_student_profile';
const LECTURER_PROFILE_STORAGE_KEY = 'rikkei_eduportal_lecturer_profile';

const removeMultiple = async (keys: string[]): Promise<void> => {
  if (typeof AsyncStorage.multiRemove === 'function') {
    await AsyncStorage.multiRemove(keys);
  } else {
    await Promise.all(keys.map((k) => AsyncStorage.removeItem(k)));
  }
};

let globalEpoch = 0;

export const getGlobalEpoch = (): number => globalEpoch;
export const setGlobalEpochForTesting = (epoch: number): void => {
  globalEpoch = epoch;
};

export interface AuthState {
  user: User | null;
  studentProfile: StudentProfile | null;
  lecturerProfile: LecturerProfile | null;
  role: Role | null;
  isAuthenticated: boolean;
  isInitializing: boolean;

  // Actions
  login: (authData: AuthResponse) => Promise<void>;
  updateSession: (authData: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  updateProfile: (profile: StudentProfile) => Promise<void>;
  updateLecturerProfile: (profile: LecturerProfile) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  studentProfile: null,
  lecturerProfile: null,
  role: null,
  isAuthenticated: false,
  isInitializing: true,

  /**
   * Log in user with 11-step Two-Phase Protocol.
   */
  login: async (authData: AuthResponse): Promise<void> => {
    return await sharedWriteMutex.acquire(async (lockContext) => {
      // Step 2: Epoch increment in RAM
      globalEpoch++;
      const currentEpoch = globalEpoch;
      const txId = `tx_login_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Step 3: Write-Ahead Intent (PERSISTENT_AUTH_INTENT_KEY)
      await tokenStorage.setAuthIntent(
        {
          action: 'LOGIN_TRANSITION',
          epoch: currentEpoch,
          txId,
          timestamp: Date.now(),
        },
        lockContext
      );

      // Phase A: Demolition Phase (Strict Barrier)
      // Step 4: Overwrite Manifest with UNAUTHENTICATED
      await tokenStorage.setSessionManifest(
        {
          state: 'UNAUTHENTICATED',
          epoch: currentEpoch,
        },
        lockContext
      );

      // Step 5: Hardware Purge old SecureStore
      try {
        await tokenStorage.clearTokens(lockContext);
      } catch (clearErr) {
        // Blocker E barrier: Mark CORRUPTED, lock broker, throw StoragePersistenceError
        await tokenStorage.setSessionManifest(
          {
            state: 'CORRUPTED',
            epoch: currentEpoch,
            lastError: clearErr instanceof Error ? clearErr.message : String(clearErr),
          },
          lockContext
        );
        tokenBroker.lockBroker();
        throw new StoragePersistenceError('Phase A Demolition failed: Unable to clear SecureStore', clearErr);
      }

      // Step 6: Clear old User Cache in AsyncStorage
      try {
        await removeMultiple([
          USER_STORAGE_KEY,
          PROFILE_STORAGE_KEY,
          LECTURER_PROFILE_STORAGE_KEY,
        ]);
        await clearQueryCache();
      } catch (cacheErr) {
        console.warn('Non-fatal: Failed to clear old offline cache during login Phase A', cacheErr);
      }

      // Phase B: Construction Phase
      // Step 7: Write new Session Manifest PENDING
      await tokenStorage.setSessionManifest(
        {
          state: 'PENDING',
          txId,
          epoch: currentEpoch,
        },
        lockContext
      );

      // Step 8: Save new Tokens and TxId in SecureStore
      await tokenStorage.saveTokens(
        authData.accessToken,
        authData.refreshToken,
        txId,
        currentEpoch,
        lockContext
      );

      // Step 9: Commit new Session Manifest
      await tokenStorage.setSessionManifest(
        {
          state: 'COMMITTED',
          txId,
          epoch: currentEpoch,
        },
        lockContext
      );

      // Step 10: Remove Transition Intent (ONLY after COMMITTED)
      await tokenStorage.removeAuthIntent(lockContext);

      // Cache profile in AsyncStorage for instant offline rendering
      try {
        if (authData.user) {
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authData.user));
        }
        if (authData.studentProfile) {
          await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(authData.studentProfile));
        }
        if (authData.lecturerProfile) {
          await AsyncStorage.setItem(LECTURER_PROFILE_STORAGE_KEY, JSON.stringify(authData.lecturerProfile));
        }
      } catch (storageErr) {
        console.warn('Failed to cache profile in AsyncStorage:', storageErr);
      }

      // Step 11: Update RAM & UI
      tokenBroker.unlockBroker();
      set({
        user: authData.user,
        studentProfile: authData.studentProfile ?? null,
        lecturerProfile: authData.lecturerProfile ?? null,
        role: authData.user?.role ?? null,
        isAuthenticated: true,
        isInitializing: false,
      });
    });
  },

  /**
   * Update state upon token refresh rotation.
   */
  updateSession: async (authData: AuthResponse): Promise<void> => {
    try {
      if (authData.user) {
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authData.user));
      }
      if (authData.studentProfile) {
        await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(authData.studentProfile));
      }
      if (authData.lecturerProfile) {
        await AsyncStorage.setItem(LECTURER_PROFILE_STORAGE_KEY, JSON.stringify(authData.lecturerProfile));
      }
    } catch {}

    set((state) => ({
      ...state,
      user: authData.user ?? state.user,
      studentProfile: authData.studentProfile ?? state.studentProfile,
      lecturerProfile: authData.lecturerProfile ?? state.lecturerProfile,
      role: (authData.user?.role ?? state.role) as Role,
      isAuthenticated: true,
    }));
  },

  /**
   * Log out user with 8-step Protocol and Write-Ahead Intent.
   */
  logout: async (): Promise<void> => {
    // Step 1: RAM Invalidation immediately
    cancelPendingRefresh();
    globalEpoch++;
    const currentEpoch = globalEpoch;
    tokenBroker.lockBroker();

    const txId = `tx_logout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let oldRefreshToken: string | null = null;
    try {
      oldRefreshToken = await tokenStorage.getRefreshToken();
    } catch {}

    await sharedWriteMutex.acquire(async (lockContext) => {
      // Step 2: Write-Ahead Intent (action === 'LOGOUT') with Emergency Demolition Barrier
      try {
        await tokenStorage.setAuthIntent(
          {
            action: 'LOGOUT',
            epoch: currentEpoch,
            txId,
            timestamp: Date.now(),
          },
          lockContext
        );
      } catch (intentErr) {
        console.error('Logout: Failed to write LOGOUT intent. Triggering Emergency Demolition!', intentErr);
        // EMERGENCY DEMOLITION BARRIER (BLOCKER J FIX):
        // Even if Intent write failed, we MUST aggressively demolish credentials!
        let hardwarePurgeError: unknown = null;
        try {
          await tokenStorage.clearTokens(lockContext);
        } catch (clearErr) {
          hardwarePurgeError = clearErr;
          console.error('Emergency Demolition: clearTokens failed', clearErr);
        }

        // Attempt to update Manifest
        try {
          if (hardwarePurgeError) {
            // Hardware clearTokens failed: record CORRUPTED so Cold Start P7 isolates and re-attempts cleanup
            await tokenStorage.setSessionManifest(
              {
                state: 'CORRUPTED',
                epoch: currentEpoch,
                lastError: `Emergency demolition clearTokens failed: ${
                  hardwarePurgeError instanceof Error ? hardwarePurgeError.message : String(hardwarePurgeError)
                }`,
              },
              lockContext
            );
          } else {
            // Hardware clearTokens succeeded: record UNAUTHENTICATED
            await tokenStorage.setSessionManifest(
              { state: 'UNAUTHENTICATED', epoch: currentEpoch },
              lockContext
            );
          }
        } catch (manifestErr) {
          console.error('Emergency Demolition: setSessionManifest failed', manifestErr);
        }

        // Clean offline cache
        try {
          await removeMultiple([
            USER_STORAGE_KEY,
            PROFILE_STORAGE_KEY,
            LECTURER_PROFILE_STORAGE_KEY,
          ]);
          await clearQueryCache();
        } catch {}

        // Invalidate UI state in RAM
        set({
          user: null,
          studentProfile: null,
          lecturerProfile: null,
          role: null,
          isAuthenticated: false,
          isInitializing: false,
        });

        // Re-throw original intent persistence error
        throw intentErr;
      }

      // Step 3: Manifest Transition to UNAUTHENTICATED
      await tokenStorage.setSessionManifest(
        {
          state: 'UNAUTHENTICATED',
          epoch: currentEpoch,
        },
        lockContext
      );

      // Step 4: Hardware Purge (SecureStore)
      try {
        await tokenStorage.clearTokens(lockContext);
      } catch (purgeErr) {
        // Condition 1: If purge fails, DO NOT remove authIntent or set Manifest to clean!
        await tokenStorage.setSessionManifest(
          {
            state: 'CORRUPTED',
            epoch: currentEpoch,
            lastError: purgeErr instanceof Error ? purgeErr.message : String(purgeErr),
          },
          lockContext
        );
        throw purgeErr;
      }

      // Step 5: Backend Revocation (best-effort network call)
      if (oldRefreshToken) {
        try {
          await authApi.logout(oldRefreshToken);
        } catch {
          // Ignore network errors on logout
        }
      }

      // Step 6: Offline Cache Purge
      try {
        await removeMultiple([
          USER_STORAGE_KEY,
          PROFILE_STORAGE_KEY,
          LECTURER_PROFILE_STORAGE_KEY,
        ]);
        await clearQueryCache();
      } catch {}

      // Step 7: Intent Cleanup (ONLY after steps 4, 5, 6 succeeded)
      await tokenStorage.removeAuthIntent(lockContext);

      // Step 8: UI State Transition
      set({
        user: null,
        studentProfile: null,
        lecturerProfile: null,
        role: null,
        isAuthenticated: false,
        isInitializing: false,
      });
    });
  },

  /**
   * Restore existing session on cold start using Fault-Tolerant Decision Table (P1 to P9-B).
   */
  restoreSession: async (): Promise<void> => {
    return await sharedWriteMutex.acquire(async (lockContext) => {
      let intent: AuthIntent | null = null;
      let manifest: SessionManifest | null = null;

      // P1: Check Intent Read / Fail-Closed
      try {
        intent = await tokenStorage.getAuthIntent();
      } catch (intentErr) {
        // Condition 3: Lỗi I/O, JSON không hợp lệ hoặc action không hỗ trợ -> Fail-Closed Tối Đa (P1)
        console.error('P1: Failed to read authIntent (I/O or invalid JSON) -> Fail-Closed', intentErr);
        tokenBroker.lockBroker();
        set({
          user: null,
          studentProfile: null,
          lecturerProfile: null,
          role: null,
          isAuthenticated: false,
          isInitializing: false,
        });
        return;
      }

      // P2: Check Manifest Read / Fail-Closed
      try {
        manifest = await tokenStorage.getSessionManifest();
      } catch (manifestErr) {
        // P2: Manifest I/O / JSON corrupt -> Resilient Purge
        console.error('P2: Corrupted sessionManifest on disk -> Resilient Purge', manifestErr);
        try {
          await tokenStorage.clearTokens(lockContext);
          await removeMultiple([
            USER_STORAGE_KEY,
            PROFILE_STORAGE_KEY,
            LECTURER_PROFILE_STORAGE_KEY,
          ]);
          await clearQueryCache();
          await tokenStorage.setSessionManifest({ state: 'UNAUTHENTICATED', epoch: 0 }, lockContext);
          await tokenStorage.removeAuthIntent(lockContext);
        } catch (cleanupErr) {
          console.error('P2 Resilient Purge failed', cleanupErr);
        }
        tokenBroker.lockBroker();
        set({
          user: null,
          studentProfile: null,
          lecturerProfile: null,
          role: null,
          isAuthenticated: false,
          isInitializing: false,
        });
        return;
      }

      // Rehydrate globalEpoch safely
      const maxEpoch = Math.max(manifest?.epoch ?? 0, intent?.epoch ?? 0);
      globalEpoch = maxEpoch + 1;

      // Helper for Resilient Purge
      const executeResilientPurge = async () => {
        await tokenStorage.clearTokens(lockContext);
        await removeMultiple([
          USER_STORAGE_KEY,
          PROFILE_STORAGE_KEY,
          LECTURER_PROFILE_STORAGE_KEY,
        ]);
        await clearQueryCache();
        await tokenStorage.setSessionManifest(
          { state: 'UNAUTHENTICATED', epoch: globalEpoch },
          lockContext
        );
        await tokenStorage.removeAuthIntent(lockContext);
      };

      // Helper for restoring committed session
      const restoreCommittedSession = async () => {
        const accessToken = await tokenStorage.getAccessToken();
        const refreshToken = await tokenStorage.getRefreshToken();

        if (!accessToken && !refreshToken) {
          set({
            user: null,
            studentProfile: null,
            lecturerProfile: null,
            role: null,
            isAuthenticated: false,
            isInitializing: false,
          });
          return;
        }

        let cachedUser: User | null = null;
        let cachedStudentProfile: StudentProfile | null = null;
        let cachedLecturerProfile: LecturerProfile | null = null;

        try {
          const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
          if (storedUser) cachedUser = JSON.parse(storedUser);
          const storedProfile = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
          if (storedProfile) cachedStudentProfile = JSON.parse(storedProfile);
          const storedLecturer = await AsyncStorage.getItem(LECTURER_PROFILE_STORAGE_KEY);
          if (storedLecturer) cachedLecturerProfile = JSON.parse(storedLecturer);
        } catch (readErr) {
          console.warn('Could not read cached user during session restoration:', readErr);
        }

        const isExpired = accessToken ? isTokenExpired(accessToken) : true;

        if (isExpired && refreshToken) {
          try {
            const authData = await authApi.refreshToken(refreshToken);
            const newTxId = `tx_rf_cold_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            await tokenStorage.saveTokens(
              authData.accessToken,
              authData.refreshToken,
              newTxId,
              globalEpoch,
              lockContext
            );
            await tokenStorage.setSessionManifest(
              { state: 'COMMITTED', txId: newTxId, epoch: globalEpoch },
              lockContext
            );

            if (authData.user) {
              await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authData.user));
            }
            if (authData.studentProfile) {
              await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(authData.studentProfile));
            }
            if (authData.lecturerProfile) {
              await AsyncStorage.setItem(LECTURER_PROFILE_STORAGE_KEY, JSON.stringify(authData.lecturerProfile));
            }

            tokenBroker.unlockBroker();
            set({
              user: authData.user,
              studentProfile: authData.studentProfile ?? null,
              lecturerProfile: authData.lecturerProfile ?? null,
              role: authData.user?.role ?? null,
              isAuthenticated: true,
              isInitializing: false,
            });
            return;
          } catch (refreshErr) {
            // ZERO AUTO-RETRY POLICY:
            // If server explicitly rejected with 401 Unauthorized -> purge session
            if (axios.isAxiosError(refreshErr) && refreshErr.response?.status === 401) {
              await tokenStorage.clearTokens(lockContext);
              await tokenStorage.setSessionManifest(
                { state: 'UNAUTHENTICATED', epoch: globalEpoch },
                lockContext
              );
              try {
                await removeMultiple([
                  USER_STORAGE_KEY,
                  PROFILE_STORAGE_KEY,
                  LECTURER_PROFILE_STORAGE_KEY,
                ]);
                await clearQueryCache();
              } catch {}

              tokenBroker.lockBroker();
              set({
                user: null,
                studentProfile: null,
                lecturerProfile: null,
                role: null,
                isAuthenticated: false,
                isInitializing: false,
              });
              return;
            }

            // Retain cached session for offline viewing without auto-retrying
            if (cachedUser) {
              set({
                user: cachedUser,
                studentProfile: cachedStudentProfile,
                lecturerProfile: cachedLecturerProfile,
                role: cachedUser.role ?? null,
                isAuthenticated: true,
                isInitializing: false,
              });
              return;
            }

            set({
              user: null,
              studentProfile: null,
              lecturerProfile: null,
              role: null,
              isAuthenticated: false,
              isInitializing: false,
            });
            return;
          }
        }

        // Access token is valid
        tokenBroker.unlockBroker();
        set({
          user: cachedUser,
          studentProfile: cachedStudentProfile,
          lecturerProfile: cachedLecturerProfile,
          role: cachedUser?.role ?? null,
          isAuthenticated: Boolean(cachedUser),
          isInitializing: false,
        });

        // Background profile sync: keep user info updated without blocking cold start
        Promise.resolve(authApi.getProfile?.())
          .then(async (freshProfile) => {
            if (freshProfile && freshProfile.user) {
              try {
                await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(freshProfile.user));
                if (freshProfile.studentProfile) {
                  await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(freshProfile.studentProfile));
                }
                if (freshProfile.lecturerProfile) {
                  await AsyncStorage.setItem(LECTURER_PROFILE_STORAGE_KEY, JSON.stringify(freshProfile.lecturerProfile));
                }
              } catch {}

              set((state) => {
                if (!state.isAuthenticated) return state;
                return {
                  ...state,
                  user: freshProfile.user,
                  studentProfile: freshProfile.studentProfile ?? state.studentProfile,
                  lecturerProfile: freshProfile.lecturerProfile ?? state.lecturerProfile,
                  role: freshProfile.user.role,
                };
              });
            }
          })
          .catch(() => {
            // Offline: retain cached profile safely
          });
      };

      // P3: Intent exists, but Manifest is null
      if (intent && !manifest) {
        console.warn('P3: Intent exists but manifest is null -> Resilient Purge');
        try {
          await executeResilientPurge();
        } catch (err) {
          console.error('P3 Purge failed', err);
        }
        tokenBroker.lockBroker();
        set({
          user: null,
          studentProfile: null,
          lecturerProfile: null,
          role: null,
          isAuthenticated: false,
          isInitializing: false,
        });
        return;
      }

      // P4: Intent action === 'LOGOUT' (Blocker H: Absolute Resilient Purge, ignore Epoch/TxId)
      if (intent && intent.action === 'LOGOUT') {
        console.warn('P4: LOGOUT intent detected -> Absolute Resilient Purge');
        try {
          await executeResilientPurge();
        } catch (err) {
          console.error('P4 Purge failed', err);
        }
        tokenBroker.lockBroker();
        set({
          user: null,
          studentProfile: null,
          lecturerProfile: null,
          role: null,
          isAuthenticated: false,
          isInitializing: false,
        });
        return;
      }

      // Check LOGIN_TRANSITION Intent
      if (intent && intent.action === 'LOGIN_TRANSITION') {
        const storedTxId = await tokenStorage.getTransactionId();
        const tripleTxIdMatch =
          Boolean(intent.txId) &&
          intent.txId === manifest?.txId &&
          intent.txId === storedTxId;

        // P5: Triple-TxId match AND manifest.state === 'COMMITTED'
        if (tripleTxIdMatch && manifest?.state === 'COMMITTED') {
          console.info('P5: Triple-TxId match confirmed -> Validating session');
          await tokenStorage.removeAuthIntent(lockContext);
          return await restoreCommittedSession();
        }

        // P4-B: Interrupted Transition (TxId mismatch or state != COMMITTED)
        console.warn('P4-B: Interrupted LOGIN_TRANSITION -> Purging incomplete session');
        try {
          await executeResilientPurge();
        } catch (err) {
          console.error('P4-B Purge failed', err);
        }
        tokenBroker.lockBroker();
        set({
          user: null,
          studentProfile: null,
          lecturerProfile: null,
          role: null,
          isAuthenticated: false,
          isInitializing: false,
        });
        return;
      }

      // From this point: Intent is null
      // P6: Intent null, Manifest state === 'PENDING'
      if (manifest?.state === 'PENDING') {
        console.warn('P6: Session manifest is PENDING -> Resilient Purge');
        try {
          await executeResilientPurge();
        } catch (err) {
          console.error('P6 Purge failed', err);
        }
        tokenBroker.lockBroker();
        set({
          user: null,
          studentProfile: null,
          lecturerProfile: null,
          role: null,
          isAuthenticated: false,
          isInitializing: false,
        });
        return;
      }

      // P7: Intent null, Manifest state === 'CORRUPTED' (Blocker I - Controlled Quarantine Recovery)
      if (manifest?.state === 'CORRUPTED') {
        console.warn('P7: Manifest CORRUPTED -> Controlled Quarantine Recovery');
        let retryCount = 0;
        try {
          retryCount = await tokenStorage.getCorruptedRetryCount();
        } catch {
          retryCount = 3;
        }

        if (retryCount >= 3) {
          console.error('P7: Corrupted retry count >= 3 -> Permanent Quarantine');
          tokenBroker.lockBroker();
          set({
            user: null,
            studentProfile: null,
            lecturerProfile: null,
            role: null,
            isAuthenticated: false,
            isInitializing: false,
          });
          return;
        }

        // Write-Ahead Increment ON DISK before touching hardware
        let nextCount = retryCount + 1;
        try {
          nextCount = await tokenStorage.incrementCorruptedRetryCount(retryCount, lockContext);
          await tokenStorage.setSessionManifest(
            {
              state: 'CORRUPTED',
              epoch: globalEpoch,
              corruptedRetryCount: nextCount,
              lastError: manifest.lastError,
            },
            lockContext
          );
        } catch (writeCounterErr) {
          console.error('P7: Failed to persist retry counter -> Abort cleanup and isolate', writeCounterErr);
          tokenBroker.lockBroker();
          set({
            user: null,
            studentProfile: null,
            lecturerProfile: null,
            role: null,
            isAuthenticated: false,
            isInitializing: false,
          });
          return;
        }

        // Hardware cleanup attempt
        try {
          await tokenStorage.clearTokens(lockContext);
          await removeMultiple([
            USER_STORAGE_KEY,
            PROFILE_STORAGE_KEY,
            LECTURER_PROFILE_STORAGE_KEY,
          ]);
          await clearQueryCache();

          // Condition 2: ONLY reset corruptedRetryCount after cleanup succeeds!
          await tokenStorage.setSessionManifest(
            {
              state: 'UNAUTHENTICATED',
              epoch: globalEpoch,
              corruptedRetryCount: 0,
            },
            lockContext
          );
          await tokenStorage.clearCorruptedRetryCount(lockContext);
          tokenBroker.unlockBroker();
          set({
            user: null,
            studentProfile: null,
            lecturerProfile: null,
            role: null,
            isAuthenticated: false,
            isInitializing: false,
          });
          return;
        } catch (hardwareCleanupErr) {
          console.error(`P7: Cleanup attempt ${nextCount} failed`, hardwareCleanupErr);
          tokenBroker.lockBroker();
          set({
            user: null,
            studentProfile: null,
            lecturerProfile: null,
            role: null,
            isAuthenticated: false,
            isInitializing: false,
          });
          return;
        }
      }

      // P8: Intent null, Manifest state === 'UNAUTHENTICATED' (or manifest null without intent)
      if (!manifest || manifest.state === 'UNAUTHENTICATED') {
        console.info('P8: Manifest UNAUTHENTICATED -> Idempotent Resilient Purge');
        try {
          await tokenStorage.clearTokens(lockContext);
          await removeMultiple([
            USER_STORAGE_KEY,
            PROFILE_STORAGE_KEY,
            LECTURER_PROFILE_STORAGE_KEY,
          ]);
          await clearQueryCache();
          tokenBroker.unlockBroker();
        } catch (p8Err) {
          console.error('P8 Purge failed -> Transition to CORRUPTED', p8Err);
          try {
            await tokenStorage.setSessionManifest(
              {
                state: 'CORRUPTED',
                epoch: globalEpoch,
                lastError: p8Err instanceof Error ? p8Err.message : String(p8Err),
              },
              lockContext
            );
          } catch {}
          tokenBroker.lockBroker();
        }
        set({
          user: null,
          studentProfile: null,
          lecturerProfile: null,
          role: null,
          isAuthenticated: false,
          isInitializing: false,
        });
        return;
      }

      // Manifest state is 'COMMITTED': Check TxId identity match (P9 vs P9-B)
      if (manifest.state === 'COMMITTED') {
        const storedTxId = await tokenStorage.getTransactionId();
        if (!manifest.txId || !storedTxId || manifest.txId !== storedTxId) {
          // P9-B: Identity Mismatch Purge fail-closed
          console.error('P9-B: Identity mismatch between Manifest and SecureStore -> Purging fail-closed');
          try {
            await tokenStorage.clearTokens(lockContext);
            await removeMultiple([
              USER_STORAGE_KEY,
              PROFILE_STORAGE_KEY,
              LECTURER_PROFILE_STORAGE_KEY,
            ]);
            await clearQueryCache();
            await tokenStorage.setSessionManifest(
              {
                state: 'CORRUPTED',
                epoch: globalEpoch,
                lastError: 'TxId mismatch between SecureStore and SessionManifest',
              },
              lockContext
            );
          } catch {}
          tokenBroker.lockBroker();
          set({
            user: null,
            studentProfile: null,
            lecturerProfile: null,
            role: null,
            isAuthenticated: false,
            isInitializing: false,
          });
          return;
        }

        // P9: Valid COMMITTED session -> Restore!
        return await restoreCommittedSession();
      }
    });
  },

  updateProfile: async (profile: StudentProfile): Promise<void> => {
    try {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {}
    set({ studentProfile: profile });
  },

  updateLecturerProfile: async (profile: LecturerProfile): Promise<void> => {
    try {
      await AsyncStorage.setItem(LECTURER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {}
    set({ lecturerProfile: profile });
  },
}));

// Wire up interceptor hooks with auth store
setAuthFailureHandler(() => {
  useAuthStore.getState().logout();
});

setTokenUpdatedHandler((authData: AuthResponse) => {
  useAuthStore.getState().updateSession(authData);
});
