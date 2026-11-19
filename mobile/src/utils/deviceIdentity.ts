/**
 * deviceIdentity.ts
 * Module for managing anonymous, installation-scoped device identification (ST-01.3).
 *
 * Rules:
 * - Uses random UUID v4 persisted in Expo SecureStore.
 * - Idempotent: reads existing ID or creates new UUID on first installation.
 * - Never uses Android Hardware ID, IMEI, MAC address, or serial numbers.
 * - Concurrency safe: prevents duplicate UUID generation during concurrent calls.
 * - Installation-scoped: not deleted during user logout.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const INSTALLATION_ID_STORAGE_KEY = 'rikkei_eduportal_installation_id';

// In-memory cache for fast synchronous checks within app session
let cachedInstallationId: string | null = null;
let inFlightPromise: Promise<string> | null = null;

/**
 * Generates an RFC 4122 version 4 compliant UUID.
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Retrieves the installation ID for this app.
 * If not present, generates a new random UUID v4 and stores it in SecureStore.
 * Concurrent calls will resolve to the same generated ID.
 */
export async function getInstallationId(): Promise<string> {
  if (cachedInstallationId) {
    return cachedInstallationId;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      let storedId: string | null = null;

      try {
        storedId = await SecureStore.getItemAsync(INSTALLATION_ID_STORAGE_KEY);
      } catch (readErr) {
        // Log warning without exposing sensitive user information
        console.warn('[DeviceIdentity] Failed to read installation ID from SecureStore:', readErr);
        if (cachedInstallationId) {
          return cachedInstallationId;
        }
      }

      if (storedId && typeof storedId === 'string' && storedId.trim().length > 0) {
        cachedInstallationId = storedId.trim();
        return cachedInstallationId;
      }

      // First time installation: generate a new anonymous UUID v4
      const newId = generateUuidV4();

      try {
        await SecureStore.setItemAsync(INSTALLATION_ID_STORAGE_KEY, newId);
      } catch (writeErr) {
        console.warn('[DeviceIdentity] Failed to persist installation ID to SecureStore:', writeErr);
      }

      cachedInstallationId = newId;
      return cachedInstallationId;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

/**
 * Formats device info string for QR attendance check-in requests.
 * Format: EduPortal-<OS>-<InstallationUUID>
 * Complies with backend contract while avoiding static or hardware-identifying strings.
 */
export async function getDeviceCheckInInfo(): Promise<string> {
  const installationId = await getInstallationId();
  const os = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web';
  return `EduPortal-${os}-${installationId}`;
}

/**
 * Clears the in-memory cache.
 * Intended ONLY for unit testing.
 */
export function __resetInstallationIdMemoryCache(): void {
  cachedInstallationId = null;
  inFlightPromise = null;
}
