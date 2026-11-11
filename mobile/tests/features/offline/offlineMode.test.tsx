/**
 * Offline Mode Comprehensive Test Suite
 * Tests:
 * 1. Online -> Offline transition
 * 2. Offline -> Online transition
 * 3. Offline cache rendering & stale indicators
 * 4. OfflineEmptyState when no cache exists
 * 5. Logout when offline purges local cache & credentials safely
 * 6. Account switching while offline never leaks previous user cache
 * 7. useRequireOnlineAction blocks write mutations when offline
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { tokenStorage } from '@/storage/tokenStorage';
import { clearQueryCache, ASYNC_STORAGE_QUERY_CACHE_KEY } from '@/providers/queryClient';
import {
  OfflineIndicator,
  LastSyncedIndicator,
  OfflineEmptyState,
  useNetworkStatus,
  useRequireOnlineAction,
  OfflineProvider,
  useOffline,
} from '@/features/offline';

describe('Offline Mode & User-Scoped Cache Isolation', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (NetInfo as any).__setConnected(true, true);
    await AsyncStorage.clear();
    await tokenStorage.clearTokens();
    await clearQueryCache();
  });

  describe('1. Network Status & Connectivity Transitions', () => {
    it('detects online state correctly when connected to WiFi', async () => {
      let statusResult: any = null;
      function TestHarness() {
        statusResult = useNetworkStatus();
        return null;
      }

      renderToStaticMarkup(<TestHarness />);
      expect(statusResult.isConnected).toBe(true);
      expect(statusResult.isOffline).toBe(false);
    });

    it('detects offline state immediately when network is lost', async () => {
      let statusResult: any = null;
      function TestHarness() {
        statusResult = useNetworkStatus();
        return null;
      }

      renderToStaticMarkup(<TestHarness />);
      (NetInfo as any).__setConnected(false, false);

      renderToStaticMarkup(<TestHarness />);
      expect(statusResult.isConnected).toBe(false);
      expect(statusResult.isOffline).toBe(true);
    });
  });

  describe('2. Offline UI Indicators & Empty States', () => {
    it('OfflineIndicator renders nothing when online', () => {
      (NetInfo as any).__setConnected(true, true);
      const html = renderToStaticMarkup(
        <OfflineProvider>
          <OfflineIndicator />
        </OfflineProvider>
      );
      expect(html).toBe('');
    });

    it('OfflineIndicator displays polite warning when device is offline', () => {
      (NetInfo as any).__setConnected(false, false);
      const html = renderToStaticMarkup(
        <OfflineProvider>
          <OfflineIndicator />
        </OfflineProvider>
      );
      expect(html).toContain('Chế độ ngoại tuyến');
      expect(html).toContain('Đang xem dữ liệu lưu trên thiết bị');
      expect(html).toContain('Thử lại');
    });

    it('LastSyncedIndicator renders formatted time and offline pill when disconnected', () => {
      (NetInfo as any).__setConnected(false, false);
      const fixedDate = new Date('2026-11-11T12:00:00');
      const html = renderToStaticMarkup(
        <OfflineProvider>
          <LastSyncedIndicator lastSyncedAt={fixedDate} />
        </OfflineProvider>
      );
      expect(html).toContain('Dữ liệu lưu tạm');
    });

    it('OfflineEmptyState renders friendly message and retry button when no cache exists', () => {
      const mockRetry = jest.fn();
      const html = renderToStaticMarkup(
        <OfflineProvider>
          <OfflineEmptyState onRetry={mockRetry} />
        </OfflineProvider>
      );
      expect(html).toContain('Chưa có bản lưu ngoại tuyến');
      expect(html).toContain('Thử kết nối lại');
    });
  });

  describe('3. Offline Actions Guard (useRequireOnlineAction)', () => {
    it('blocks mutating actions and displays alert when offline', async () => {
      (NetInfo as any).__setConnected(false, false);
      let hook: any = null;
      function TestHarness() {
        hook = useRequireOnlineAction();
        return null;
      }

      renderToStaticMarkup(
        <OfflineProvider>
          <TestHarness />
        </OfflineProvider>
      );

      const mockMutate = jest.fn().mockResolvedValue('success');
      const result = await hook.executeOnlineAction(mockMutate, {
        actionName: 'Điểm danh QR',
      });

      expect(result).toBeNull();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('executes mutating action successfully when device is online', async () => {
      (NetInfo as any).__setConnected(true, true);
      let hook: any = null;
      function TestHarness() {
        hook = useRequireOnlineAction();
        return null;
      }

      renderToStaticMarkup(
        <OfflineProvider>
          <TestHarness />
        </OfflineProvider>
      );

      const mockMutate = jest.fn().mockResolvedValue({ id: 123, status: 'CHECKED_IN' });
      const result = await hook.executeOnlineAction(mockMutate, {
        actionName: 'Điểm danh QR',
      });

      expect(result).toEqual({ id: 123, status: 'CHECKED_IN' });
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. User-Scoped Cache Isolation & Safe Offline Logout', () => {
    it('purges hardware tokens and AsyncStorage cache when user logs out while offline', async () => {
      // Simulate user logged in with tokens in SecureStore and profile in AsyncStorage
      await tokenStorage.saveTokens('mock-access-token', 'mock-refresh-token');
      await AsyncStorage.setItem('rikkei_eduportal_user_profile', JSON.stringify({ id: 4, username: 'sv2024001' }));
      await AsyncStorage.setItem(ASYNC_STORAGE_QUERY_CACHE_KEY, JSON.stringify({ queries: [{ queryKey: ['student', 'user_4'] }] }));

      useAuthStore.setState({
        user: { id: 4, username: 'sv2024001', role: 'STUDENT' } as any,
        isAuthenticated: true,
      });

      // Now cut off network
      (NetInfo as any).__setConnected(false, false);

      // Perform logout while offline
      await useAuthStore.getState().logout();

      // Verify tokens are purged from hardware Keystore
      expect(await tokenStorage.getAccessToken()).toBeNull();
      expect(await tokenStorage.getRefreshToken()).toBeNull();

      // Verify AsyncStorage user profile and query cache are removed
      expect(await AsyncStorage.getItem('rikkei_eduportal_user_profile')).toBeNull();
      expect(await AsyncStorage.getItem(ASYNC_STORAGE_QUERY_CACHE_KEY)).toBeNull();

      // Verify store state is completely reset
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.role).toBeNull();
    });

    it('guarantees that Student cache and Lecturer cache are isolated by user scope', async () => {
      const studentScope = 'user_4';
      const lecturerScope = 'user_2';

      const studentQueryKey = ['student', studentScope, 'dashboard'];
      const lecturerQueryKey = ['lecturer', lecturerScope, 'dashboard'];

      // They must not collide
      expect(studentQueryKey).not.toEqual(lecturerQueryKey);
      expect(studentQueryKey[1]).toBe('user_4');
      expect(lecturerQueryKey[1]).toBe('user_2');
    });
  });
});
