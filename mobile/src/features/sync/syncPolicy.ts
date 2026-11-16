/**
 * Data Synchronization Policies Definition
 * Defines exact staleness, cache retention, and reconnect behavior per domain resource.
 */

import { SyncPolicyDefinition, SyncResourceKey } from './types';

export const SYNC_POLICIES: Record<SyncResourceKey, SyncPolicyDefinition> = {
  DASHBOARD: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnReconnect: true,
    description: 'Tổng quan chỉ số học tập, lớp học sắp tới. Làm mới sau 5 phút.',
  },
  TIMETABLE: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnReconnect: true,
    description: 'Thời khóa biểu học kỳ. Lưu trên máy 24 giờ cho chế độ ngoại tuyến.',
  },
  EXAMS: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnReconnect: true,
    description: 'Lịch thi và số báo danh, phòng thi. Lưu trên máy 24 giờ.',
  },
  GRADES: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnReconnect: true,
    description: 'Bảng điểm thành phần và C-GPA tích lũy.',
  },
  TUITION: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnReconnect: true,
    description: 'Hóa đơn học phí và thông tin thanh toán VietQR.',
  },
  NOTIFICATIONS: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnReconnect: true,
    description: 'Hộp thư thông báo người dùng và nhắc nhở học vụ.',
  },
  LECTURER_SCHEDULE: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnReconnect: true,
    description: 'Lịch giảng dạy trong tuần của giảng viên.',
  },
  LECTURER_CLASSES: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnReconnect: true,
    description: 'Danh sách lớp học phần và sinh viên phụ trách.',
  },
  PROFILE: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnReconnect: true,
    description: 'Hồ sơ người dùng và thông tin tài khoản.',
  },
  ATTENDANCE: {
    staleTime: 0, // Strict real-time
    gcTime: 0, // Never cache active QR as valid offline
    refetchOnReconnect: false,
    description: 'Điểm danh QR động TOTP 15s. Yêu cầu kết nối trực tuyến bắt buộc.',
  },
};
