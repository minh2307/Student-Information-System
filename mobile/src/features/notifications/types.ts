/**
 * Notification Subsystem Types & DTO Contracts
 * Verified against services/enrollment-service AnnouncementAndNotificationService.
 */

export interface NotificationDto {
  id: number;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
}

export interface AnnouncementDto {
  id: number;
  title: string;
  category: string;
  content: string;
  author: string;
  isPinned: boolean;
  createdAt: string;
}

export type NotificationFilter = 'ALL' | 'UNREAD';

export type PushTokenStatus =
  | 'GRANTED_LOCAL_ONLY'
  | 'BLOCKED_BY_BACKEND'
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_SUPPORTED';

export interface PushRegistrationResult {
  status: PushTokenStatus;
  token: string | null;
  message: string;
}
