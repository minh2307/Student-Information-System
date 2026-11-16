import {
  tokenStorage,
  sharedWriteMutex,
  SharedFifoMutex,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TX_ID_KEY,
  SESSION_MANIFEST_KEY,
  AUTH_INTENT_KEY,
  CORRUPTED_COUNTER_KEY,
} from '@/storage/tokenStorage';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoragePersistenceError } from '@/bridge/errors';

describe('Secure Token Storage Abstraction (Phase 7.1.1.2 Hardening)', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await tokenStorage.clearTokens();
    await AsyncStorage.clear();
  });

  describe('1. 3-Key Storage and Retrieval', () => {
    it('saves and retrieves access token, refresh token, and txId securely', async () => {
      await tokenStorage.saveTokens('test_access_jwt', 'test_refresh_token', 'tx_test_123');

      const accessToken = await tokenStorage.getAccessToken();
      const refreshToken = await tokenStorage.getRefreshToken();
      const txId = await tokenStorage.getTransactionId();

      expect(accessToken).toBe('test_access_jwt');
      expect(refreshToken).toBe('test_refresh_token');
      expect(txId).toBe('tx_test_123');
    });

    it('clears all 3 keys securely upon session termination', async () => {
      await tokenStorage.saveTokens('token_to_remove', 'refresh_to_remove', 'tx_to_remove');
      await tokenStorage.clearTokens();

      const accessToken = await tokenStorage.getAccessToken();
      const refreshToken = await tokenStorage.getRefreshToken();
      const txId = await tokenStorage.getTransactionId();

      expect(accessToken).toBeNull();
      expect(refreshToken).toBeNull();
      expect(txId).toBeNull();
    });
  });

  describe('2. Fail-Closed 3-Key Rollback & Consistency (Condition 4)', () => {
    it('rolls back and deletes all 3 keys if writing refresh token throws an error', async () => {
      const setSpy = jest.spyOn(SecureStore, 'setItemAsync').mockImplementation(async (key) => {
        if (key === REFRESH_TOKEN_KEY) {
          throw new Error('Disk full / Keystore locked');
        }
      });
      const deleteSpy = jest.spyOn(SecureStore, 'deleteItemAsync');

      await expect(
        tokenStorage.saveTokens('fresh_access_token', 'fresh_refresh_token', 'tx_fail_1')
      ).rejects.toThrow('Failed to safely persist tokens in SecureStore');

      // Verify 3-key rollback occurred
      expect(deleteSpy).toHaveBeenCalledWith(ACCESS_TOKEN_KEY);
      expect(deleteSpy).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
      expect(deleteSpy).toHaveBeenCalledWith(TX_ID_KEY);

      const retrievedAccess = await tokenStorage.getAccessToken();
      const retrievedRefresh = await tokenStorage.getRefreshToken();
      const retrievedTxId = await tokenStorage.getTransactionId();
      expect(retrievedAccess).toBeNull();
      expect(retrievedRefresh).toBeNull();
      expect(retrievedTxId).toBeNull();

      setSpy.mockRestore();
      deleteSpy.mockRestore();
    });

    it('rolls back all 3 keys if writing txId throws an error', async () => {
      const setSpy = jest.spyOn(SecureStore, 'setItemAsync').mockImplementation(async (key) => {
        if (key === TX_ID_KEY) {
          throw new Error('SecureStore failure on TxId');
        }
      });
      const deleteSpy = jest.spyOn(SecureStore, 'deleteItemAsync');

      await expect(
        tokenStorage.saveTokens('access_ok', 'refresh_ok', 'tx_fail_txid')
      ).rejects.toThrow('Failed to safely persist tokens in SecureStore');

      expect(deleteSpy).toHaveBeenCalledWith(ACCESS_TOKEN_KEY);
      expect(deleteSpy).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
      expect(deleteSpy).toHaveBeenCalledWith(TX_ID_KEY);

      setSpy.mockRestore();
      deleteSpy.mockRestore();
    });

    it('marks manifest as CORRUPTED if rollback delete fails (Condition 4)', async () => {
      const setSpy = jest.spyOn(SecureStore, 'setItemAsync').mockRejectedValue(
        new Error('Primary write failure')
      );
      const deleteSpy = jest.spyOn(SecureStore, 'deleteItemAsync').mockRejectedValue(
        new Error('Hardware Keystore locked permanent failure')
      );
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        tokenStorage.saveTokens('access_tok', 'refresh_tok', 'tx_corrupt_test')
      ).rejects.toThrow('Failed to safely persist tokens in SecureStore');

      // Manifest should now be persisted as CORRUPTED
      const manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('CORRUPTED');

      setSpy.mockRestore();
      deleteSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('3. Shared FIFO Write Mutex Concurrency', () => {
    it('executes concurrent write tasks in strictly serialized FIFO order', async () => {
      const mutex = new SharedFifoMutex();
      const sequence: number[] = [];

      const p1 = mutex.acquire(async () => {
        await new Promise((res) => setTimeout(res, 30));
        sequence.push(1);
        return 1;
      });

      const p2 = mutex.acquire(async () => {
        await new Promise((res) => setTimeout(res, 10));
        sequence.push(2);
        return 2;
      });

      const p3 = mutex.acquire(async () => {
        sequence.push(3);
        return 3;
      });

      const results = await Promise.all([p1, p2, p3]);

      expect(results).toEqual([1, 2, 3]);
      expect(sequence).toEqual([1, 2, 3]); // strictly serialized order despite different delays
    });

    it('supports re-entrant execution via runExclusive with active lockContext', async () => {
      const mutex = new SharedFifoMutex();
      const executed = await mutex.acquire(async (context) => {
        return await mutex.runExclusive(async () => {
          return 're-entrant success';
        }, context);
      });

      expect(executed).toBe('re-entrant success');
    });
  });

  describe('4. Auth Intent Hardening (Condition 3)', () => {
    it('saves and reads valid LOGOUT and LOGIN_TRANSITION intents', async () => {
      await tokenStorage.setAuthIntent({
        action: 'LOGOUT',
        epoch: 5,
        txId: 'tx_logout_abc',
        timestamp: 123456789,
      });

      const intent = await tokenStorage.getAuthIntent();
      expect(intent).toEqual({
        action: 'LOGOUT',
        epoch: 5,
        txId: 'tx_logout_abc',
        timestamp: 123456789,
      });

      await tokenStorage.removeAuthIntent();
      expect(await tokenStorage.getAuthIntent()).toBeNull();
    });

    it('fails-closed and throws StoragePersistenceError on corrupt JSON in authIntent', async () => {
      await AsyncStorage.setItem(AUTH_INTENT_KEY, '{invalid-json-corrupt');

      await expect(tokenStorage.getAuthIntent()).rejects.toThrow(StoragePersistenceError);
    });

    it('fails-closed and throws StoragePersistenceError on unsupported action in authIntent', async () => {
      await AsyncStorage.setItem(
        AUTH_INTENT_KEY,
        JSON.stringify({ action: 'UNKNOWN_ACTION', epoch: 1, txId: 'tx_1', timestamp: 123 })
      );

      await expect(tokenStorage.getAuthIntent()).rejects.toThrow('Invalid authIntent payload or unsupported action');
    });
  });

  describe('5. Session Manifest Persistence', () => {
    it('persists and retrieves session manifest transitions accurately', async () => {
      await tokenStorage.setSessionManifest({
        state: 'PENDING',
        txId: 'tx_man_1',
        epoch: 3,
      });

      let manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('PENDING');
      expect(manifest?.txId).toBe('tx_man_1');
      expect(manifest?.epoch).toBe(3);

      await tokenStorage.setSessionManifest({
        state: 'COMMITTED',
        txId: 'tx_man_1',
        epoch: 3,
      });

      manifest = await tokenStorage.getSessionManifest();
      expect(manifest?.state).toBe('COMMITTED');
    });

    it('fails-closed on corrupt JSON in sessionManifest', async () => {
      await AsyncStorage.setItem(SESSION_MANIFEST_KEY, '{unparseable_manifest');
      await expect(tokenStorage.getSessionManifest()).rejects.toThrow(StoragePersistenceError);
    });
  });

  describe('6. Corrupted Retry Counter (Blocker I - Condition 2)', () => {
    it('increments retry counter on disk and preserves value', async () => {
      expect(await tokenStorage.getCorruptedRetryCount()).toBe(0);

      const count1 = await tokenStorage.incrementCorruptedRetryCount(0);
      expect(count1).toBe(1);
      expect(await tokenStorage.getCorruptedRetryCount()).toBe(1);

      const count2 = await tokenStorage.incrementCorruptedRetryCount(1);
      expect(count2).toBe(2);
      expect(await tokenStorage.getCorruptedRetryCount()).toBe(2);

      await tokenStorage.clearCorruptedRetryCount();
      expect(await tokenStorage.getCorruptedRetryCount()).toBe(0);
    });
  });
});
