/**
 * Notification Subsystem Unit & Integration Tests
 * Tests:
 * 1. Notification API client endpoints
 * 2. Push Token registration contract & BLOCKED status
 * 3. Deep link RBAC security resolver
 * 4. In-App Notification Center UI & interactions
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notificationApi } from '@/features/notifications/services/notificationApi';
import { resolveNotificationRoute } from '@/features/notifications/utils/notificationDeepLink';
import { NotificationBellButton } from '@/features/notifications/components/NotificationBellButton';
import { NotificationCenterModal } from '@/features/notifications/components/NotificationCenterModal';
import {
  useNotificationPermission,
  setupPushTokenRotationListener,
  syncPushTokenWithBackend,
} from '@/features/notifications/hooks/useNotificationPermission';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { OfflineProvider } from '@/features/offline';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';

jest.mock('@/features/notifications/hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('@/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
  extractData: jest.fn((res) => res.data.data),
}));

describe('Notification Subsystem & Deep Link RBAC Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 4,
        username: 'sv2024001',
        fullName: 'Nguyễn Văn C',
        role: 'STUDENT',
      } as any,
      isAuthenticated: true,
    });
  });

  describe('1. Notification API Client', () => {
    it('getNotifications retrieves list from /api/v1/notifications', async () => {
      const mockList = [
        {
          id: 1,
          title: 'Nhắc lịch thi',
          message: 'Lịch thi CS201 vào ngày 15/06',
          type: 'EXAM',
          isRead: false,
          linkUrl: '/(student)/exams',
          createdAt: '2026-11-10T10:00:00',
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: mockList, success: true, status: 200 },
      });

      const result = await notificationApi.getNotifications();
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/notifications');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Nhắc lịch thi');
    });

    it('markAsRead calls PUT /api/v1/notifications/{id}/read', async () => {
      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 200 },
      });

      await notificationApi.markAsRead(42);
      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/notifications/42/read');
    });

    it('markAllAsRead calls PUT /api/v1/notifications/read-all', async () => {
      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 200 },
      });

      await notificationApi.markAllAsRead();
      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/notifications/read-all');
    });

    it('registerPushTokenWithBackend sends POST /api/v1/notifications/tokens and returns REGISTERED on success', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          status: 200,
          message: 'Đăng ký device token thành công',
          data: {
            id: 1,
            userId: 4,
            token: 'ExponentPushToken[xyz]',
            platform: 'ANDROID',
            deviceId: 'pixel-7',
            isActive: true,
            lastSeenAt: '2026-11-17T10:00:00',
            createdAt: '2026-11-17T10:00:00',
            updatedAt: '2026-11-17T10:00:00',
          },
        },
      });

      const result = await notificationApi.registerPushTokenWithBackend(
        'ExponentPushToken[xyz]',
        'ANDROID',
        'pixel-7'
      );
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/notifications/tokens', {
        token: 'ExponentPushToken[xyz]',
        platform: 'ANDROID',
        deviceId: 'pixel-7',
      });
      expect(result.status).toBe('REGISTERED');
      expect(result.token).toBe('ExponentPushToken[xyz]');
      expect(result.message).toContain('thành công');
    });

    it('registerPushTokenWithBackend handles error gracefully when network fails', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

      const result = await notificationApi.registerPushTokenWithBackend('ExponentPushToken[xyz]');
      expect(result.status).toBe('ERROR');
      expect(result.token).toBe('ExponentPushToken[xyz]');
      expect(result.message).toBe('Network Error');
    });

    it('revokePushTokenWithBackend sends DELETE /api/v1/notifications/tokens and returns REVOKED on success', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 200, message: 'Thu hồi device token thành công' },
      });

      const result = await notificationApi.revokePushTokenWithBackend('ExponentPushToken[xyz]');
      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/notifications/tokens', {
        data: { token: 'ExponentPushToken[xyz]' },
      });
      expect(result.status).toBe('REVOKED');
      expect(result.token).toBeNull();
    });
  });

  describe('2. Deep Link RBAC Routing Guard', () => {
    it('redirects unauthenticated user to /login regardless of linkUrl', () => {
      const res = resolveNotificationRoute('/(student)/grades', null, false);
      expect(res.isAllowed).toBe(false);
      expect(res.targetRoute).toBe('/(auth)/login');
      expect(res.reason).toBe('UNAUTHENTICATED');
    });

    it('allows STUDENT to navigate to valid student route', () => {
      const res = resolveNotificationRoute('/(student)/exams', 'STUDENT', true);
      expect(res.isAllowed).toBe(true);
      expect(res.targetRoute).toBe('/(student)/exams');
    });

    it('blocks STUDENT from accessing LECTURER screen and redirects safely to student dashboard', () => {
      const res = resolveNotificationRoute('/(lecturer)/classes', 'STUDENT', true);
      expect(res.isAllowed).toBe(false);
      expect(res.targetRoute).toBe('/(student)/dashboard');
      expect(res.reason).toBe('ROLE_MISMATCH');
    });

    it('allows LECTURER to navigate to valid lecturer route', () => {
      const res = resolveNotificationRoute('/(lecturer)/attendance', 'LECTURER', true);
      expect(res.isAllowed).toBe(true);
      expect(res.targetRoute).toBe('/(lecturer)/attendance');
    });

    it('blocks LECTURER from accessing STUDENT screen and redirects safely to lecturer dashboard', () => {
      const res = resolveNotificationRoute('/(student)/tuition', 'LECTURER', true);
      expect(res.isAllowed).toBe(false);
      expect(res.targetRoute).toBe('/(lecturer)/dashboard');
      expect(res.reason).toBe('ROLE_MISMATCH');
    });

    it('falls back to default dashboard if linkUrl is null or empty', () => {
      const res = resolveNotificationRoute(null, 'STUDENT', true);
      expect(res.isAllowed).toBe(true);
      expect(res.targetRoute).toBe('/(student)/dashboard');
    });
  });

  describe('3. Notification UI Components', () => {
    it('NotificationBellButton renders icon and unread count badge', () => {
      (useNotifications as jest.Mock).mockReturnValue({
        notifications: [
          { id: 1, title: 'Thông báo 1', message: 'M', isRead: false, createdAt: '2026-11-10' },
          { id: 2, title: 'Thông báo 2', message: 'M', isRead: false, createdAt: '2026-11-10' },
        ],
        unreadCount: 2,
        isLoading: false,
        refetch: jest.fn(),
        isRefetching: false,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        isMarkingRead: false,
      });

      const html = renderToStaticMarkup(
        <OfflineProvider>
          <NotificationBellButton tintColor="#FFFFFF" />
        </OfflineProvider>
      );

      expect(html).toContain('2');
    });

    it('NotificationCenterModal renders notification items and category badges', () => {
      (useNotifications as jest.Mock).mockReturnValue({
        notifications: [
          {
            id: 10,
            title: 'Học phí kỳ 2',
            message: 'Hạn thanh toán 05/12/2026',
            type: 'TUITION',
            isRead: false,
            linkUrl: '/(student)/tuition',
            createdAt: '2026-11-09T08:00:00',
          },
        ],
        unreadCount: 1,
        isLoading: false,
        refetch: jest.fn(),
        isRefetching: false,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        isMarkingRead: false,
      });

      const html = renderToStaticMarkup(
        <OfflineProvider>
          <NotificationCenterModal visible={true} onClose={jest.fn()} />
        </OfflineProvider>
      );

      expect(html).toContain('Hộp thư thông báo');
      expect(html).toContain('Học phí kỳ 2');
      expect(html).toContain('Hạn thanh toán 05/12/2026');
      expect(html).toContain('Chi tiết');
    });
  });

  describe('4. Native Push Token & Permission Lifecycle', () => {
    it('requests permission and extracts native FCM device token via getDevicePushTokenAsync', async () => {
      let hookResult: ReturnType<typeof useNotificationPermission> = null as any;
      function Harness() {
        hookResult = useNotificationPermission();
        return null;
      }

      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
        granted: true,
        canAskAgain: true,
      });

      (Notifications.getDevicePushTokenAsync as jest.Mock).mockResolvedValueOnce({
        type: 'fcm',
        data: 'fcm_native_device_token_xyz',
      });

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          status: 200,
          message: 'Đăng ký device token thành công',
          data: {
            id: 1,
            userId: 4,
            token: 'fcm_native_device_token_xyz',
            platform: 'ANDROID',
            isActive: true,
          },
        },
      });

      renderToStaticMarkup(<Harness />);

      const granted = await hookResult.requestPermission();
      expect(granted).toBe(true);
      expect(Notifications.getDevicePushTokenAsync).toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/notifications/tokens',
        expect.objectContaining({
          token: 'fcm_native_device_token_xyz',
        })
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'rikkei_eduportal_push_token',
        'fcm_native_device_token_xyz'
      );
    });

    it('falls back to getExpoPushTokenAsync if getDevicePushTokenAsync fails', async () => {
      let hookResult: ReturnType<typeof useNotificationPermission> = null as any;
      function Harness() {
        hookResult = useNotificationPermission();
        return null;
      }

      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
        granted: true,
        canAskAgain: true,
      });

      (Notifications.getDevicePushTokenAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Device token unavailable in simulator')
      );

      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({
        data: 'ExponentPushToken[fallback_token_123]',
      });

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          status: 200,
          message: 'Đăng ký device token thành công',
          data: {
            id: 2,
            token: 'ExponentPushToken[fallback_token_123]',
            platform: 'ANDROID',
            isActive: true,
          },
        },
      });

      renderToStaticMarkup(<Harness />);

      const granted = await hookResult.requestPermission();
      expect(granted).toBe(true);
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/notifications/tokens',
        expect.objectContaining({
          token: 'ExponentPushToken[fallback_token_123]',
        })
      );
    });

    it('registers token rotation listener and synchronizes rotated token with backend', async () => {
      let rotationHandler: ((token: any) => Promise<void>) | null = null;
      (Notifications.addPushTokenListener as jest.Mock).mockImplementationOnce((cb: any) => {
        rotationHandler = cb;
        return { remove: jest.fn() };
      });

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          status: 200,
          message: 'Đăng ký device token thành công',
          data: {
            id: 3,
            token: 'fcm_rotated_token_999',
            platform: 'ANDROID',
            isActive: true,
          },
        },
      });

      const onRotatedMock = jest.fn();
      const subscription = setupPushTokenRotationListener(onRotatedMock);

      expect(Notifications.addPushTokenListener).toHaveBeenCalled();
      expect(rotationHandler).not.toBeNull();

      if (rotationHandler) {
        await (rotationHandler as (t: any) => Promise<void>)({ data: 'fcm_rotated_token_999', type: 'fcm' });
      }

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/notifications/tokens',
        expect.objectContaining({
          token: 'fcm_rotated_token_999',
        })
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'rikkei_eduportal_push_token',
        'fcm_rotated_token_999'
      );
      expect(onRotatedMock).toHaveBeenCalledWith(
        'fcm_rotated_token_999',
        expect.objectContaining({ status: 'REGISTERED' })
      );
      expect(subscription?.remove).toBeDefined();
    });
  });
});
