/**
 * deviceIdentity.test.ts
 * Unit Tests for Anonymous Installation-Scoped Device Identity (TASK ST-01.3).
 */

import * as SecureStore from 'expo-secure-store';
import {
  getInstallationId,
  getDeviceCheckInInfo,
  generateUuidV4,
  INSTALLATION_ID_STORAGE_KEY,
  __resetInstallationIdMemoryCache,
} from '@/utils/deviceIdentity';
import { tokenStorage } from '@/storage/tokenStorage';

describe('Device Identity Module (TASK ST-01.3)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    __resetInstallationIdMemoryCache();
    // Reset mock SecureStore
    if ((SecureStore as any).__resetStore) {
      (SecureStore as any).__resetStore();
    }
  });

  afterEach(() => {
    __resetInstallationIdMemoryCache();
  });

  describe('UUID Generation', () => {
    it('generates an RFC 4122 version 4 compliant UUID', () => {
      const uuid = generateUuidV4();
      const uuidV4Regex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidV4Regex);
    });

    it('generates distinct random UUIDs on consecutive invocations', () => {
      const id1 = generateUuidV4();
      const id2 = generateUuidV4();
      expect(id1).not.toBe(id2);
    });
  });

  describe('Installation ID Lifecycle & Persistence', () => {
    it('generates and persists a new installation ID on first launch', async () => {
      const id = await getInstallationId();

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        INSTALLATION_ID_STORAGE_KEY,
        id
      );
    });

    it('reads the existing installation ID on subsequent calls without regenerating', async () => {
      const existingId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
      await SecureStore.setItemAsync(INSTALLATION_ID_STORAGE_KEY, existingId);
      __resetInstallationIdMemoryCache();

      const id = await getInstallationId();

      expect(id).toBe(existingId);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(INSTALLATION_ID_STORAGE_KEY);
      // setItemAsync should NOT have been called again
      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1); // Only the pre-seed call
    });

    it('is idempotent: consecutive calls return the exact same installation ID', async () => {
      const firstId = await getInstallationId();
      const secondId = await getInstallationId();
      const thirdId = await getInstallationId();

      expect(secondId).toBe(firstId);
      expect(thirdId).toBe(firstId);
    });

    it('handles concurrent calls safely without generating multiple different IDs', async () => {
      const [id1, id2, id3] = await Promise.all([
        getInstallationId(),
        getInstallationId(),
        getInstallationId(),
      ]);

      expect(id1).toBe(id2);
      expect(id2).toBe(id3);
      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Device Check-In Info Format (Backend Contract Compliance)', () => {
    it('formats device info string with EduPortal prefix and OS name', async () => {
      const info = await getDeviceCheckInInfo();

      expect(info).toMatch(/^EduPortal-(iOS|Android|Web)-[0-9a-f-]+$/i);
      // Verifies it does NOT leak hardware identifiers
      expect(info).not.toContain('IMEI');
      expect(info).not.toContain('MAC');
      expect(info).not.toContain('RikkeiMobile-');
    });
  });

  describe('Error Handling and Resiliency', () => {
    it('falls back to memory cache if SecureStore read throws', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Keystore unavailable')
      );

      const id = await getInstallationId();

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('retains generated ID in memory if SecureStore write throws', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Disk full')
      );

      const id1 = await getInstallationId();
      const id2 = await getInstallationId();

      expect(id1).toBe(id2);
    });
  });

  describe('Account Logout Safety', () => {
    it('does NOT delete the installation ID when user logs out (clearTokens)', async () => {
      const initialId = await getInstallationId();

      // Simulate user logging out
      await tokenStorage.clearTokens();

      __resetInstallationIdMemoryCache();
      const afterLogoutId = await getInstallationId();

      expect(afterLogoutId).toBe(initialId);
    });
  });
});
