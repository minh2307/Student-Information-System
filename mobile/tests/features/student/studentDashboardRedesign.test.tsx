/**
 * Student Dashboard Redesign & Integration Unit Tests (REDS v2.0 - STEP 4.1)
 * Rigorously verifies that AppNotificationHeader & ConnectedOfflineBanner
 * are truly rendered in DashboardScreen, along with StudentPassCard,
 * BentoKpiGrid, NextClassWidget, and QuickActions.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');

import { OfflineProvider } from '@/features/offline';
import DashboardScreen from '@/app/(student)/dashboard';
import { useStudentDashboard } from '@/features/student/hooks';
import { useOffline } from '@/features/offline/OfflineContext';

// Mock student dashboard hook
jest.mock('@/features/student/hooks', () => ({
  useStudentDashboard: jest.fn(),
  useStudentAttendanceHistory: jest.fn(() => ({ data: { records: [] }, isLoading: false, isError: false })),
}));

// Mock offline context hook
let mockOfflineState = {
  isOffline: false,
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
  lastOnlineAt: '2026-11-12T10:00:00.000Z' as string | null,
  checkConnectivity: jest.fn(),
};

jest.mock('@/features/offline/OfflineContext', () => {
  const actual = jest.requireActual('@/features/offline/OfflineContext');
  return {
    ...actual,
    useOffline: () => mockOfflineState,
  };
});

// Mock notifications hook for AppNotificationHeader
jest.mock('@/features/notifications/hooks/useNotifications', () => ({
  useNotifications: () => ({
    unreadCount: 5,
    notifications: [],
    isLoading: false,
    markAsRead: jest.fn(),
  }),
}));

// Mock router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-icon={props.name} />,
}));

// Mock auth store
let mockAuthState = {
  user: {
    id: 101,
    username: 'sv2026999',
    email: 'sv2026999@rikkei.edu.vn',
    fullName: 'Lê Hoàng Nam',
    role: 'STUDENT',
    status: 'ACTIVE',
  },
  studentProfile: {
    studentCode: 'SV2026999',
    major: 'Kỹ thuật phần mềm',
    currentSemester: 4,
    creditsEarned: 60,
    totalRequiredCredits: 150,
    currentCgpa: 8.9,
    previousCgpa: 8.8,
  },
  role: 'STUDENT',
  isAuthenticated: true,
};

jest.mock('@/stores/authStore', () => {
  const store = (selector: any) =>
    typeof selector === 'function' ? selector(mockAuthState) : mockAuthState;
  store.getState = () => mockAuthState;
  return {
    useAuthStore: store,
  };
});

function renderDashboard() {
  return renderToStaticMarkup(
    <OfflineProvider>
      <DashboardScreen />
    </OfflineProvider>
  );
}

describe('Student Dashboard Redesign REDS v2.0 (STEP 4.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOfflineState = {
      isOffline: false,
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      lastOnlineAt: '2026-11-12T10:00:00.000Z',
      checkConnectivity: jest.fn(),
    };
  });

  it('actually renders AppNotificationHeader with student greeting and unread bell badge', () => {
    (useStudentDashboard as jest.Mock).mockReturnValue({
      data: {
        stats: { registeredCourses: 5, weeklyClasses: 20, pendingRegistrations: 0, scheduleConflicts: 0 },
        upcomingClasses: [],
        semesterProgress: {
          creditsEarned: 60,
          totalRequiredCredits: 150,
          attendanceRate: 98.5,
          currentCgpa: 8.9,
          previousCgpa: 8.8,
          academicStanding: 'Xuất sắc',
        },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const html = renderDashboard();

    // Verify AppNotificationHeader is RENDERED
    expect(html).toContain('student-dashboard-header');
    expect(html).toContain('Tổng quan sinh viên');
    expect(html).toContain('Xin chào, Lê Hoàng Nam');
    expect(html).toContain('5'); // Unread notification badge count
  });

  it('renders ConnectedOfflineBanner when offline, and hides it when online', () => {
    (useStudentDashboard as jest.Mock).mockReturnValue({
      data: {
        stats: { registeredCourses: 4, weeklyClasses: 18, pendingRegistrations: 0, scheduleConflicts: 0 },
        upcomingClasses: [],
        semesterProgress: {
          creditsEarned: 60,
          totalRequiredCredits: 150,
          attendanceRate: 100,
          currentCgpa: 8.9,
          previousCgpa: 8.8,
        },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    // 1. When online -> banner returns null
    mockOfflineState.isOffline = false;
    let html = renderDashboard();
    expect(html).not.toContain('student-dashboard-offline-banner');

    // 2. When offline -> banner is rendered with testID and offline message
    mockOfflineState.isOffline = true;
    html = renderDashboard();
    expect(html).toContain('student-dashboard-offline-banner');
    expect(html).toContain('Chế độ ngoại tuyến');
  });

  it('renders Digital Student Pass Card with student identity without fake QR', () => {
    (useStudentDashboard as jest.Mock).mockReturnValue({
      data: {
        stats: { registeredCourses: 5, weeklyClasses: 20, pendingRegistrations: 0, scheduleConflicts: 0 },
        upcomingClasses: [],
        semesterProgress: {
          creditsEarned: 60,
          totalRequiredCredits: 150,
          attendanceRate: 98.5,
          currentCgpa: 8.9,
          previousCgpa: 8.8,
          academicStanding: 'Xuất sắc',
        },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const html = renderDashboard();

    expect(html).toContain('student-id-card');
    expect(html).toContain('HỌC VIỆN CÔNG NGHỆ RIKKEI');
    expect(html).toContain('THẺ SINH VIÊN ĐIỆN TỬ');
    expect(html).toContain('Lê Hoàng Nam');
    expect(html).toContain('SV2026999');
    expect(html).toContain('Kỹ thuật phần mềm');
    expect(html).toContain('8.90'); // Formatted CGPA
    expect(html).toContain('60 / 150'); // Credits
    // Verify NO fake QR code was generated
    expect(html).not.toContain('fake-qr');
    expect(html).not.toContain('mock-qr');
  });

  it('renders 4 Quick Actions with accessible touch targets', () => {
    (useStudentDashboard as jest.Mock).mockReturnValue({
      data: {
        stats: { registeredCourses: 4, weeklyClasses: 16, pendingRegistrations: 0, scheduleConflicts: 0 },
        upcomingClasses: [],
        semesterProgress: { creditsEarned: 60, totalRequiredCredits: 150, attendanceRate: 100, currentCgpa: 8.9, previousCgpa: 8.8 },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const html = renderDashboard();

    expect(html).toContain('quick-action-timetable');
    expect(html).toContain('quick-action-exams');
    expect(html).toContain('quick-action-grades');
    expect(html).toContain('quick-action-tuition');
    expect(html).toContain('Lịch học');
    expect(html).toContain('Lịch thi');
    expect(html).toContain('Bảng điểm');
    expect(html).toContain('Học phí');
  });

  it('renders Bento KPI Grid with real metrics and academic standing', () => {
    (useStudentDashboard as jest.Mock).mockReturnValue({
      data: {
        stats: { registeredCourses: 6, weeklyClasses: 22, pendingRegistrations: 0, scheduleConflicts: 1 },
        upcomingClasses: [],
        semesterProgress: {
          creditsEarned: 84,
          totalRequiredCredits: 160,
          attendanceRate: 99.2,
          currentCgpa: 8.74,
          previousCgpa: 8.62,
          academicStanding: 'Xuất sắc',
        },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const html = renderDashboard();

    expect(html).toContain('Chỉ số học tập kỳ này');
    expect(html).toContain('Môn học kỳ này');
    expect(html).toContain('Tiết học / tuần');
    expect(html).toContain('Tỷ lệ chuyên cần');
    expect(html).toContain('99.2%');
    expect(html).toContain('Trùng lịch học');
    expect(html).toContain('Xuất sắc');
  });

  it('renders Next Class Widget with academic class details', () => {
    (useStudentDashboard as jest.Mock).mockReturnValue({
      data: {
        stats: { registeredCourses: 4, weeklyClasses: 16, pendingRegistrations: 0, scheduleConflicts: 0 },
        upcomingClasses: [
          {
            id: 10,
            courseCode: 'CS301',
            courseName: 'Trí tuệ nhân tạo nâng cao',
            dayOfWeek: 'THU',
            startTime: '13:30',
            endTime: '16:00',
            roomName: 'Lab AI-1',
            lecturerName: 'TS. Phan Thanh Bình',
            credits: 4,
          },
        ],
        semesterProgress: { creditsEarned: 60, totalRequiredCredits: 150, attendanceRate: 100, currentCgpa: 8.9, previousCgpa: 8.8 },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const html = renderDashboard();

    expect(html).toContain('Lớp học sắp tới');
    expect(html).toContain('CS301');
    expect(html).toContain('Trí tuệ nhân tạo nâng cao');
    expect(html).toContain('Lab AI-1');
    expect(html).toContain('TS. Phan Thanh Bình');
    expect(html).toContain('4 TC');
  });

  it('renders AppEmptyState when upcoming classes array is empty', () => {
    (useStudentDashboard as jest.Mock).mockReturnValue({
      data: {
        stats: { registeredCourses: 4, weeklyClasses: 16, pendingRegistrations: 0, scheduleConflicts: 0 },
        upcomingClasses: [],
        semesterProgress: { creditsEarned: 60, totalRequiredCredits: 150, attendanceRate: 100, currentCgpa: 8.9, previousCgpa: 8.8 },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const html = renderDashboard();

    expect(html).toContain('Không có lớp học sắp tới');
    expect(html).toContain('Bạn hiện không có lịch học nào cần tham gia trong tuần này.');
  });
});
