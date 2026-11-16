/**
 * Data Synchronization Types & Contracts
 */

export interface SyncPolicyDefinition {
  /**
   * Duration in ms data is considered fresh before needing background refetch.
   */
  staleTime: number;

  /**
   * Duration in ms data is retained in memory & disk cache for offline viewing.
   */
  gcTime: number;

  /**
   * Whether to automatically refetch when internet reconnects.
   */
  refetchOnReconnect: boolean;

  /**
   * Human-readable description of sync cadence.
   */
  description: string;
}

export type SyncResourceKey =
  | 'DASHBOARD'
  | 'TIMETABLE'
  | 'EXAMS'
  | 'GRADES'
  | 'TUITION'
  | 'NOTIFICATIONS'
  | 'LECTURER_SCHEDULE'
  | 'LECTURER_CLASSES'
  | 'PROFILE'
  | 'ATTENDANCE';

export interface SyncStatus {
  /**
   * Whether a sync operation is currently actively running.
   */
  isSyncing: boolean;

  /**
   * Timestamp of last successfully completed sync.
   */
  lastSyncedAt: Date | null;

  /**
   * Error from the most recent failed sync attempt, if any.
   */
  syncError: Error | null;

  /**
   * Number of sync cycles completed in this session.
   */
  syncCycleCount: number;
}
