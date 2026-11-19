/**
 * Notification API Service
 * Interacts with /api/v1/notifications and /api/v1/announcements via API Gateway.
 */

import { apiClient, extractData } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { ApiResponse } from '@/types';
import {
  AnnouncementDto,
  NotificationDto,
  PushRegistrationResult,
  DeviceTokenResponse,
} from '../types';

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
   * POST /api/v1/notifications/tokens
   * Register or refresh FCM device token with backend.
   */
  async registerPushTokenWithBackend(
    deviceToken: string,
    platform: string = 'ANDROID',
    deviceId?: string
  ): Promise<PushRegistrationResult> {
    try {
      const response = await apiClient.post<ApiResponse<DeviceTokenResponse>>(
        ENDPOINTS.NOTIFICATIONS.REGISTER_TOKEN,
        {
          token: deviceToken,
          platform,
          deviceId,
        }
      );
      if (response.data && response.data.success) {
        return {
          status: 'REGISTERED',
          token: deviceToken,
          message: response.data.message || 'Đăng ký device token thành công',
        };
      }
      return {
        status: 'ERROR',
        token: deviceToken,
        message: response.data?.message || 'Không thể đăng ký device token',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        token: deviceToken,
        message:
          error?.response?.data?.message ||
          error?.message ||
          'Lỗi kết nối khi đăng ký device token',
      };
    }
  },

  /**
   * DELETE /api/v1/notifications/tokens
   * Revoke FCM device token on logout.
   */
  async revokePushTokenWithBackend(deviceToken: string): Promise<PushRegistrationResult> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(
        ENDPOINTS.NOTIFICATIONS.REVOKE_TOKEN,
        {
          data: { token: deviceToken },
        }
      );
      return {
        status: 'REVOKED',
        token: null,
        message: response.data?.message || 'Thu hồi device token thành công',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        token: deviceToken,
        message:
          error?.response?.data?.message ||
          error?.message ||
          'Lỗi khi thu hồi device token',
      };
    }
  },
};
