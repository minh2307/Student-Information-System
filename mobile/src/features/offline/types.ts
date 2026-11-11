/**
 * Offline Mode & Network Connectivity Type Definitions
 */

export interface NetworkState {
  /**
   * Whether the device has an active network link (WiFi, Cellular, Ethernet).
   */
  isConnected: boolean;

  /**
   * Whether the active network link can reach the wider Internet.
   */
  isInternetReachable: boolean | null;

  /**
   * Derived flag indicating offline state: true when disconnected or unreachable.
   */
  isOffline: boolean;

  /**
   * Network connection medium: 'wifi' | 'cellular' | 'none' | 'unknown' | string.
   */
  type: string;

  /**
   * Timestamp of the most recent confirmed online state.
   */
  lastOnlineAt: Date | null;
}

export interface OfflineContextValue extends NetworkState {
  /**
   * Explicit manual connectivity check triggering a NetInfo query.
   */
  checkConnectivity: () => Promise<boolean>;
}

export interface LastSyncedMetadata {
  /**
   * Query key or resource identifier.
   */
  resourceKey: string;

  /**
   * Timestamp of last successful network fetch.
   */
  syncedAt: Date;

  /**
   * Whether the data was loaded from disk cache.
   */
  isFromCache: boolean;
}
