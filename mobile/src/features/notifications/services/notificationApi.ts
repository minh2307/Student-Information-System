/**
 * Notification API Service
 * Interacts with /api/v1/notifications and /api/v1/announcements via API Gateway.
 */

import { apiClient, extractData } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { ApiResponse } from '@/types';
import { AnnouncementDto, NotificationDto, PushRegistrationResult } from '../types';

export const notificationApi = {
  /**
   * GET /api/v1/notifications
   * Retrieve in-app notifications for authenticated user.
   */
  async getNotifications(): Promise<NotificationDto[]> {
    const response = await apiClient.get<ApiResponse<NotificationDto[]>>(
      ENDPOINTS.NOTIFICATIONS.LIST
    );
    return extractData(response);
  },

  /**
   * PUT /api/v1/notifications/{id}/read
   * Mark a single notification as read.
   */
  async markAsRead(id: number): Promise<void> {
    await apiClient.put<ApiResponse<void>>(
      ENDPOINTS.NOTIFICATIONS.MARK_READ(id)
    );
  },

  /**
   * PUT /api/v1/notifications/read-all
   * Mark all notifications for authenticated user as read.
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.put<ApiResponse<void>>(
      ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ
    );
  },

  /**
   * GET /api/v1/announcements
   * Retrieve school-wide announcements (public bulletin).
   */
  async getAnnouncements(category?: string): Promise<AnnouncementDto[]> {
    const params = category ? { category } : undefined;
    const response = await apiClient.get<ApiResponse<AnnouncementDto[]>>(
      ENDPOINTS.NOTIFICATIONS.ANNOUNCEMENTS,
      { params }
    );
    return extractData(response);
  },

  /**
   * Push Token Registration (Graceful Degradation / Backend Contract Boundary)
   *
   * As audited in phase-5-notification-api-contract.md:
   * The backend does NOT currently have a device token registration endpoint or push notification delivery mechanism.
   * This method captures the token, records the blocked status transparently,
   * and never simulates or claims successful remote backend registration.
   */
  async registerPushTokenWithBackend(deviceToken: string): Promise<PushRegistrationResult> {
    // Explicitly document non-implementation by backend without fabricating success
    return {
      status: 'BLOCKED_BY_BACKEND',
      token: deviceToken,
      message: 'Backend chưa hỗ trợ API lưu Device Token (/api/v1/notifications/tokens). Thông báo đẩy từ xa bị giới hạn.',
    };
  },
};
