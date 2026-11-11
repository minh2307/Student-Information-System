/**
 * Secure Token Storage Abstraction
 * Uses Expo SecureStore (Android Keystore / iOS Keychain encrypted).
 * Tokens are NEVER stored in plaintext AsyncStorage.
 *
 * Phase 7.1.1.2 Hardening:
 * - Shared FIFO Write Mutex for serializing writes and preventing race conditions
 * - 3-Key SecureStore Architecture: ACCESS_TOKEN, REFRESH_TOKEN, TX_ID
 * - Fail-Closed 3-Key Rollback on partial writes
 * - Unified Auth Intent & Two-Phase Session Manifest persistence
 * - Write-Ahead Incremented Corrupted Retry Counter
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { StoragePersistenceError } from '@/bridge/errors';

export const ACCESS_TOKEN_KEY = 'rikkei_eduportal_access_token';
export const REFRESH_TOKEN_KEY = 'rikkei_eduportal_refresh_token';
export const TX_ID_KEY = 'rikkei_eduportal_tx_id';

export const AUTH_INTENT_KEY = 'rikkei_eduportal_auth_intent';
export const SESSION_MANIFEST_KEY = 'rikkei_eduportal_session_manifest';
export const CORRUPTED_COUNTER_KEY = 'rikkei_eduportal_corrupted_counter';

export type AuthIntentAction = 'LOGOUT' | 'LOGIN_TRANSITION';

export interface AuthIntent {
  action: AuthIntentAction;
  epoch: number;
  txId: string;
  timestamp: number;
}

export type SessionManifestState = 'PENDING' | 'COMMITTED' | 'UNAUTHENTICATED' | 'CORRUPTED';

export interface SessionManifest {
  state: SessionManifestState;
  txId?: string;
  epoch: number;
  corruptedRetryCount?: number;
  lastError?: string;
  updatedAt: number;
}

// In-memory fallback for unit testing and non-native platforms
const memoryStore: Record<string, string | null> = {
  [ACCESS_TOKEN_KEY]: null,
  [REFRESH_TOKEN_KEY]: null,
  [TX_ID_KEY]: null,
};

const isSecureStoreAvailable = (): boolean => {
  return Platform.OS === 'android' || Platform.OS === 'ios';
};

/**
 * Shared FIFO Mutex for serializing writes to SecureStore and Manifest
 */
export class SharedFifoMutex {
  private queue: Promise<void> = Promise.resolve();
  private activeContext: symbol | null = null;

  public async acquire<T>(task: (context: symbol) => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.queue = previous.then(() => current, () => current);

    await previous;
    const context = Symbol('mutex_context');
    this.activeContext = context;
    try {
      return await task(context);
    } finally {
      this.activeContext = null;
      release!();
    }
  }

  public async runExclusive<T>(task: () => Promise<T>, existingContext?: symbol): Promise<T> {
    if (existingContext && this.activeContext === existingContext) {
      // Re-entrant: caller already owns the mutex!
      return await task();
    }
    return this.acquire(async () => {
      return await task();
    });
  }
}

export const sharedWriteMutex = new SharedFifoMutex();

export const tokenStorage = {
  /**
   * Save access token, refresh token, and transaction id securely.
   * Applies fail-closed rollback: if writing any of the 3 keys fails, all 3 keys are rolled back/cleared
   * to prevent inconsistent token pairing or dangling identifiers.
   */
  async saveTokens(
    accessToken: string,
    refreshToken?: string | null,
    txId?: string | null,
    expectedEpoch?: number,
    lockContext?: symbol
  ): Promise<void> {
    return await sharedWriteMutex.runExclusive(async () => {
      const isLegacyCall = !txId;
      const effectiveTxId = txId ?? `tx_auto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      if (isSecureStoreAvailable()) {
        try {
          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
          if (refreshToken) {
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
          }
          await SecureStore.setItemAsync(TX_ID_KEY, effectiveTxId);
        } catch (saveError) {
          // Rollback on partial failure to prevent inconsistent token pairing (Condition 4)
          let rollbackFailed = false;
          try {
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            await SecureStore.deleteItemAsync(TX_ID_KEY);
          } catch (rollbackError) {
            rollbackFailed = true;
            console.error('Critical: SecureStore rollback failed after partial write', rollbackError);
          }

          if (rollbackFailed) {
            try {
              await AsyncStorage.setItem(
                SESSION_MANIFEST_KEY,
                JSON.stringify({
                  state: 'CORRUPTED',
                  epoch: expectedEpoch ?? 0,
                  lastError: saveError instanceof Error ? saveError.message : String(saveError),
                  updatedAt: Date.now(),
                })
              );
            } catch {}
          }

          throw new StoragePersistenceError(
            `Failed to safely persist tokens in SecureStore: ${
              saveError instanceof Error ? saveError.message : String(saveError)
            }`,
            saveError
          );
        }
      } else {
        try {
          memoryStore[ACCESS_TOKEN_KEY] = accessToken;
          if (refreshToken) {
            memoryStore[REFRESH_TOKEN_KEY] = refreshToken;
          }
          memoryStore[TX_ID_KEY] = effectiveTxId;
        } catch (err) {
          memoryStore[ACCESS_TOKEN_KEY] = null;
          memoryStore[REFRESH_TOKEN_KEY] = null;
          memoryStore[TX_ID_KEY] = null;
          throw new StoragePersistenceError(
            `Failed to safely persist tokens in SecureStore: ${
              err instanceof Error ? err.message : String(err)
            }`,
            err
          );
        }
      }

      // If called without txId (e.g. legacy callers or unit test setups), automatically persist COMMITTED manifest
      if (isLegacyCall) {
        try {
          await AsyncStorage.setItem(
            SESSION_MANIFEST_KEY,
            JSON.stringify({
              state: 'COMMITTED',
              txId: effectiveTxId,
              epoch: expectedEpoch ?? 0,
              updatedAt: Date.now(),
            })
          );
        } catch {}
      }
    }, lockContext);
  },

  /**
   * Retrieve the current access token.
   */
  async getAccessToken(): Promise<string | null> {
    if (isSecureStoreAvailable()) {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    }
    return memoryStore[ACCESS_TOKEN_KEY] ?? null;
  },

  /**
   * Retrieve the current refresh token.
   */
  async getRefreshToken(): Promise<string | null> {
    if (isSecureStoreAvailable()) {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    }
    return memoryStore[REFRESH_TOKEN_KEY] ?? null;
  },

  /**
   * Retrieve the current transaction id.
   */
  async getTransactionId(): Promise<string | null> {
    if (isSecureStoreAvailable()) {
      return await SecureStore.getItemAsync(TX_ID_KEY);
    }
    return memoryStore[TX_ID_KEY] ?? null;
  },

  /**
   * Remove all tokens securely upon logout or session termination.
   * Clears ACCESS_TOKEN, REFRESH_TOKEN, and TX_ID.
   */
  async clearTokens(lockContext?: symbol): Promise<void> {
    return await sharedWriteMutex.runExclusive(async () => {
      const errors: unknown[] = [];
      if (isSecureStoreAvailable()) {
        try {
          await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        } catch (err) {
          errors.push(err);
        }
        try {
          await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        } catch (err) {
          errors.push(err);
        }
        try {
          await SecureStore.deleteItemAsync(TX_ID_KEY);
        } catch (err) {
          errors.push(err);
        }
      } else {
        memoryStore[ACCESS_TOKEN_KEY] = null;
        memoryStore[REFRESH_TOKEN_KEY] = null;
        memoryStore[TX_ID_KEY] = null;
      }

      if (errors.length > 0) {
        throw new StoragePersistenceError(
          'Failed to clear all tokens from SecureStore',
          errors
        );
      }
    }, lockContext);
  },

  // --- Auth Intent Helpers (Condition 1 & 3) ---
  async getAuthIntent(): Promise<AuthIntent | null> {
    try {
      const raw = await AsyncStorage.getItem(AUTH_INTENT_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        (parsed.action !== 'LOGOUT' && parsed.action !== 'LOGIN_TRANSITION') ||
        typeof parsed.epoch !== 'number' ||
        typeof parsed.txId !== 'string'
      ) {
        throw new StoragePersistenceError('Invalid authIntent payload or unsupported action');
      }
      return parsed as AuthIntent;
    } catch (err) {
      if (err instanceof StoragePersistenceError) {
        throw err;
      }
      throw new StoragePersistenceError('Failed to read authIntent from storage', err);
    }
  },

  async setAuthIntent(intent: AuthIntent, lockContext?: symbol): Promise<void> {
    return await sharedWriteMutex.runExclusive(async () => {
      await AsyncStorage.setItem(AUTH_INTENT_KEY, JSON.stringify(intent));
    }, lockContext);
  },

  async removeAuthIntent(lockContext?: symbol): Promise<void> {
    return await sharedWriteMutex.runExclusive(async () => {
      await AsyncStorage.removeItem(AUTH_INTENT_KEY);
    }, lockContext);
  },

  // --- Session Manifest Helpers ---
  async getSessionManifest(): Promise<SessionManifest | null> {
    try {
      const raw = await AsyncStorage.getItem(SESSION_MANIFEST_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.state) {
        throw new StoragePersistenceError('Invalid sessionManifest format on disk');
      }
      return parsed as SessionManifest;
    } catch (err) {
      if (err instanceof StoragePersistenceError) {
        throw err;
      }
      throw new StoragePersistenceError('Failed to read sessionManifest from storage', err);
    }
  },

  async setSessionManifest(
    manifest: Partial<SessionManifest> & { state: SessionManifestState; epoch?: number },
    lockContext?: symbol
  ): Promise<void> {
    return await sharedWriteMutex.runExclusive(async () => {
      const payload: SessionManifest = {
        state: manifest.state,
        epoch: manifest.epoch ?? 0,
        txId: manifest.txId,
        corruptedRetryCount: manifest.corruptedRetryCount,
        lastError: manifest.lastError,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(SESSION_MANIFEST_KEY, JSON.stringify(payload));
    }, lockContext);
  },

  // --- Corrupted Retry Counter Helpers (Condition 2 - Blocker I) ---
  async getCorruptedRetryCount(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(CORRUPTED_COUNTER_KEY);
      return raw ? parseInt(raw, 10) : 0;
    } catch {
      return 0;
    }
  },

  async incrementCorruptedRetryCount(currentCount: number, lockContext?: symbol): Promise<number> {
    return await sharedWriteMutex.runExclusive(async () => {
      const next = currentCount + 1;
      await AsyncStorage.setItem(CORRUPTED_COUNTER_KEY, String(next));
      return next;
    }, lockContext);
  },

  async clearCorruptedRetryCount(lockContext?: symbol): Promise<void> {
    return await sharedWriteMutex.runExclusive(async () => {
      await AsyncStorage.removeItem(CORRUPTED_COUNTER_KEY);
    }, lockContext);
  },
};
