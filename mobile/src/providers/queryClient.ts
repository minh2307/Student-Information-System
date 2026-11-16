/**
 * TanStack Query Configuration & Offline Persistence Foundation
 * Configures QueryClient with sensible caching and AsyncStorage dehydration.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

export const ASYNC_STORAGE_QUERY_CACHE_KEY = 'rikkei_eduportal_react_query_cache';

/**
 * AsyncStorage persister for offline data retention.
 */
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: ASYNC_STORAGE_QUERY_CACHE_KEY,
  throttleTime: 1000,
});

/**
 * Central QueryClient configured for mobile performance:
 * - 5 minutes stale time
 * - 24 hours garbage collection (offline availability)
 * - Safe retry policy preventing futile 401/403/404 attempts
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh
      gcTime: 1000 * 60 * 60 * 24, // 24 hours retention
      retry: (failureCount, error: any) => {
        const status = error?.status || error?.response?.status;
        // Never retry client errors
        if (status === 401 || status === 403 || status === 404) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Clear cached query data on logout or account switch.
 */
export const clearQueryCache = async (): Promise<void> => {
  queryClient.clear();
  try {
    await AsyncStorage.removeItem(ASYNC_STORAGE_QUERY_CACHE_KEY);
  } catch (err) {
    console.warn('Failed to clear query cache from storage:', err);
  }
};
