/**
 * useDataSync Hook
 * Coordinates automatic background refetches on network reconnect and manual sync triggers.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useOffline } from '../offline';
import { SyncStatus } from './types';

export function useDataSync(): SyncStatus & {
  syncAll: () => Promise<void>;
} {
  const queryClient = useQueryClient();
  const { isOffline, isConnected } = useOffline();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncedAt: new Date(),
    syncError: null,
    syncCycleCount: 0,
  });

  const wasOfflineRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightSyncRef = useRef<boolean>(false);

  /**
   * Core synchronization routine:
   * Selectively invalidates and refetches queries matching the current authenticated role.
   */
  const performSync = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    if (inFlightSyncRef.current) return; // Prevent concurrent sync loops

    inFlightSyncRef.current = true;
    setStatus((prev) => ({ ...prev, isSyncing: true, syncError: null }));

    try {
      const scope = user.id ? `user_${user.id}` : 'current';

      // Selectively invalidate active queries according to active role
      const prefix = user.role === 'STUDENT' ? 'student' : user.role === 'LECTURER' ? 'lecturer' : null;

      const promises: Promise<unknown>[] = [];

      if (prefix) {
        promises.push(
          queryClient.invalidateQueries({
            queryKey: [prefix],
            refetchType: 'active',
          })
        );
      }

      // Always sync notifications for authenticated users
      promises.push(
        queryClient.invalidateQueries({
          queryKey: ['notifications', scope],
          refetchType: 'active',
        })
      );

      // Invalidate profile query
      promises.push(
        queryClient.invalidateQueries({
          queryKey: ['auth', 'me'],
          refetchType: 'active',
        })
      );

      await Promise.all(promises);

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: new Date(),
        syncError: null,
        syncCycleCount: prev.syncCycleCount + 1,
      }));
    } catch (err: any) {
      console.warn('Sync cycle encountered error:', err);
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        syncError: err instanceof Error ? err : new Error(String(err)),
      }));
    } finally {
      inFlightSyncRef.current = false;
    }
  }, [isAuthenticated, user, queryClient]);

  /**
   * Monitor online/offline transitions and trigger debounced sync on recovery.
   */
  useEffect(() => {
    if (isOffline) {
      wasOfflineRef.current = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    } else if (wasOfflineRef.current && isConnected) {
      // Network restored: debounce to avoid bouncing connections
      wasOfflineRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(() => {
        void performSync();
      }, 600);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOffline, isConnected, performSync]);

  return {
    ...status,
    syncAll: performSync,
  };
}
