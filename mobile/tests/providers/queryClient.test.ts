import { queryClient, clearQueryCache, ASYNC_STORAGE_QUERY_CACHE_KEY } from '@/providers/queryClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('TanStack Query Client & Offline Cache Foundation', () => {
  it('has mobile-optimized defaults configured', () => {
    const defaultOptions = queryClient.getDefaultOptions();

    // 5 minutes stale time
    expect(defaultOptions.queries?.staleTime).toBe(1000 * 60 * 5);

    // 24 hours garbage collection for offline viewing
    expect(defaultOptions.queries?.gcTime).toBe(1000 * 60 * 60 * 24);

    // refetchOnWindowFocus disabled for native app performance
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('evicts both in-memory cache and persistent AsyncStorage upon clearQueryCache', async () => {
    // Populate query cache
    queryClient.setQueryData(['test', 'data'], { value: 'cached_item' });
    await AsyncStorage.setItem(ASYNC_STORAGE_QUERY_CACHE_KEY, JSON.stringify({ test: 'persisted' }));

    expect(queryClient.getQueryData(['test', 'data'])).toEqual({ value: 'cached_item' });

    // Clear
    await clearQueryCache();

    expect(queryClient.getQueryData(['test', 'data'])).toBeUndefined();
    const stored = await AsyncStorage.getItem(ASYNC_STORAGE_QUERY_CACHE_KEY);
    expect(stored).toBeNull();
  });
});
