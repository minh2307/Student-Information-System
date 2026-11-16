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

    it('registerPushTokenWithBackend records BLOCKED_BY_BACKEND status without pretending success', async () => {
      const result = await notificationApi.registerPushTokenWithBackend('ExponentPushToken[xyz]');
      expect(result.status).toBe('BLOCKED_BY_BACKEND');
      expect(result.token).toBe('ExponentPushToken[xyz]');
      expect(result.message).toContain('Backend chưa hỗ trợ');
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
});
