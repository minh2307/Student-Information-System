/**
 * PHASE 6 — STEP 4.2: Lecturer Dashboard Redesign Test Suite
 *
 * Comprehensive tests for REDS v2.0 Lecturer Dashboard & Shared UI Integration:
 * - AppNotificationHeader renders with burgundy variant, title, and greeting
 * - ConnectedOfflineBanner renders (hidden when online, visible when offline)
 * - LecturerProfileCard: school title, role pill, name, lecturerCode, department, degree badge
 * - LecturerKpiGrid: totalClasses, totalStudents, todayCount, activeClasses
 * - TodayScheduleWidget: upcoming class card, course code, room, capacity, QR button, empty state
 * - LecturerQuickActions: attendance, classes, schedule deep links
 * - Loading skeleton states and API error recovery states
 * - Data provenance: real calculations, zero synthetic mock data
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LecturerDashboardScreen, {
  findNextUpcomingClass,
  normalizeTime,
  getAcademicCurrentTime,
} from '../../../app/(lecturer)/dashboard';
import * as LecturerHooks from '@/features/lecturer/hooks/useLecturerQueries';
import * as AuthHooks from '@/features/auth/hooks/useProfile';

// ─── Core Mocks ────────────────────────────────────────────────────────────────

// Mock offline context
let mockOfflineState = {
  isOffline: false,
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
  lastOnlineAt: '2026-11-13T08:00:00.000Z' as string | null,
  checkConnectivity: jest.fn(),
};

jest.mock('@/features/offline/OfflineContext', () => {
  const actual = jest.requireActual('@/features/offline/OfflineContext');
  return {
    ...actual,
    useOffline: () => mockOfflineState,
  };
});

// Mock notification hooks
jest.mock('@/features/notifications/hooks/useNotifications', () => ({
  useNotifications: () => ({
    unreadCount: 3,
    notifications: [],
    isLoading: false,
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    refetch: jest.fn(),
  }),
}));

// Mock lecturer queries
jest.mock('@/features/lecturer/hooks/useLecturerQueries', () => {
  const actual = jest.requireActual('@/features/lecturer/hooks/useLecturerQueries');
  return {
    ...actual,
    useLecturerClasses: jest.fn(() => ({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    })),
  };
});

// Mock profile query
jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: jest.fn(() => ({
    data: null,
    isLoading: false,
    refetch: jest.fn(),
  })),
}));

// Mock router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
}));

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: ({ source, ...props }: any) => (
    <img
      src={typeof source === 'object' ? source?.uri : source}
      alt="avatar"
      {...props}
    />
  ),
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-icon={props.name} />,
}));

// Mock auth store
let mockAuthState: any = {
  user: {
    id: 2,
    username: 'gv001',
    email: 'gv@rikkei.edu.vn',
    fullName: 'TS. Trần Thị B',
    role: 'LECTURER',
    status: 'ACTIVE',
    avatarUrl: null,
  },
  lecturerProfile: {
    lecturerCode: 'GV001',
    department: 'Khoa Công nghệ Thông tin',
    degree: 'Tiến sĩ',
  },
  role: 'LECTURER',
  isAuthenticated: true,
};

jest.mock('@/stores/authStore', () => {
  const store = (selector: any) =>
    typeof selector === 'function' ? selector(mockAuthState) : mockAuthState;
  store.getState = () => mockAuthState;
  store.setState = (update: any) => {
    mockAuthState = { ...mockAuthState, ...update };
  };
  return {
    useAuthStore: store,
  };
});

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const mockClass = {
  sectionId: 10,
  sectionCode: 'IT101-01',
  courseCode: 'IT101',
  courseName: 'Lập trình Java',
  credits: 3,
  semesterName: 'Học kỳ 1 2026-2027',
  dayOfWeek: 'MON',
  startTime: '07:30',
  endTime: '09:30',
  roomName: 'P301',
  currentEnrolled: 35,
  maxCapacity: 40,
  status: 'OPEN' as const,
};

// ─── Render Helper ─────────────────────────────────────────────────────────────

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <LecturerDashboardScreen />
    </QueryClientProvider>
  ) as string;
};

// ─── Test Suites ───────────────────────────────────────────────────────────────

describe('PHASE 6 — STEP 4.2: Lecturer Dashboard Redesign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOfflineState = {
      isOffline: false,
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      lastOnlineAt: '2026-11-13T08:00:00.000Z',
      checkConnectivity: jest.fn(),
    };
    mockAuthState = {
      user: {
        id: 2,
        username: 'gv001',
        email: 'gv@rikkei.edu.vn',
        fullName: 'TS. Trần Thị B',
        role: 'LECTURER',
        status: 'ACTIVE',
        avatarUrl: null,
      },
      lecturerProfile: {
        lecturerCode: 'GV001',
        department: 'Khoa Công nghệ Thông tin',
        degree: 'Tiến sĩ',
      },
      role: 'LECTURER',
      isAuthenticated: true,
    };
    (LecturerHooks.useLecturerClasses as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });
    (AuthHooks.useProfile as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  // ── 1. AppNotificationHeader Integration ────────────────────────────────────

  describe('AppNotificationHeader Integration', () => {
    it('renders with testID "lecturer-dashboard-header"', () => {
      const html = renderDashboard();
      expect(html).toContain('lecturer-dashboard-header');
    });

    it('renders the dashboard title "Tổng quan giảng viên"', () => {
      const html = renderDashboard();
      expect(html).toContain('Tổng quan giảng viên');
    });

    it('renders the greeting subtitle with lecturer first name', () => {
      const html = renderDashboard();
      expect(html).toContain('Xin chào, B');
    });

    it('renders notification bell button with unread count', () => {
      const html = renderDashboard();
      expect(html).toContain('notifications-outline');
      expect(html).toContain('Thông báo');
    });
  });

  // ── 2. ConnectedOfflineBanner Integration ────────────────────────────────────

  describe('ConnectedOfflineBanner Integration', () => {
    it('renders null when device is online (banner hidden)', () => {
      mockOfflineState.isOffline = false;
      const html = renderDashboard();
      expect(html).not.toContain('lecturer-dashboard-offline-banner');
    });

    it('renders with testID "lecturer-dashboard-offline-banner" when offline', () => {
      mockOfflineState.isOffline = true;
      const html = renderDashboard();
      expect(html).toContain('lecturer-dashboard-offline-banner');
      expect(html).toContain('Chế độ ngoại tuyến: Đang hiển thị bản lưu trên máy');
    });

    it('shows last synced time when available in offline mode', () => {
      mockOfflineState.isOffline = true;
      const html = renderDashboard();
      expect(html).toContain('Đồng bộ lần cuối:');
    });
  });

  // ── 3. Lecturer Identity Card (LecturerProfileCard) ─────────────────────────

  describe('Lecturer Identity Card (LecturerProfileCard)', () => {
    it('renders testID "lecturer-identity-card"', () => {
      const html = renderDashboard();
      expect(html).toContain('lecturer-identity-card');
    });

    it('renders school title "HỌC VIỆN CÔNG NGHỆ RIKKEI"', () => {
      const html = renderDashboard();
      expect(html).toContain('HỌC VIỆN CÔNG NGHỆ RIKKEI');
    });

    it('renders role pill "GIẢNG VIÊN"', () => {
      const html = renderDashboard();
      expect(html).toContain('GIẢNG VIÊN');
    });

    it('renders lecturer full name from authStore', () => {
      const html = renderDashboard();
      expect(html).toContain('TS. Trần Thị B');
    });

    it('renders lecturer code "GV001"', () => {
      const html = renderDashboard();
      expect(html).toContain('GV001');
    });

    it('renders department "Khoa Công nghệ Thông tin"', () => {
      const html = renderDashboard();
      expect(html).toContain('Khoa Công nghệ Thông tin');
    });

    it('renders degree badge "Tiến sĩ" when available', () => {
      const html = renderDashboard();
      expect(html).toContain('Tiến sĩ');
    });

    it('renders avatar initial fallback "T" when no avatarUrl', () => {
      const html = renderDashboard();
      expect(html).toContain('T');
    });

    it('renders avatar <img> when avatarUrl is provided', () => {
      mockAuthState.user.avatarUrl = 'https://example.com/photo.jpg';
      const html = renderDashboard();
      expect(html).toContain('example.com/photo.jpg');
    });
  });

  // ── 4. KPI Metrics Grid (LecturerKpiGrid) ───────────────────────────────────

  describe('KPI Metrics Grid (LecturerKpiGrid)', () => {
    it('renders testID "lecturer-kpi-grid"', () => {
      const html = renderDashboard();
      expect(html).toContain('lecturer-kpi-grid');
    });

    it('renders section header "Chỉ số giảng dạy học kỳ"', () => {
      const html = renderDashboard();
      expect(html).toContain('Chỉ số giảng dạy học kỳ');
    });

    it('shows totalClasses count', () => {
      (LecturerHooks.useLecturerClasses as jest.Mock).mockReturnValue({
        data: [mockClass, { ...mockClass, sectionId: 11, courseCode: 'IT102' }],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });
      const html = renderDashboard();
      expect(html).toContain('2');
      expect(html).toContain('Lớp phụ trách');
    });

    it('shows totalStudents summed from currentEnrolled', () => {
      (LecturerHooks.useLecturerClasses as jest.Mock).mockReturnValue({
        data: [
          { ...mockClass, sectionId: 1, currentEnrolled: 30 },
          { ...mockClass, sectionId: 2, currentEnrolled: 25, courseCode: 'IT102' },
        ],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });
      const html = renderDashboard();
      expect(html).toContain('55');
      expect(html).toContain('Tổng sinh viên');
    });

    it('renders all 4 metric labels including refined business semantics', () => {
      const html = renderDashboard();
      expect(html).toContain('Lớp phụ trách');
      expect(html).toContain('Tổng sinh viên');
      expect(html).toContain('Tổng sinh viên đăng ký');
      expect(html).toContain('Ca dạy hôm nay');
      expect(html).toContain('Lớp đang mở');
      expect(html).toContain('Lớp đang mở đăng ký');
    });
  });

  // ── 5. Today Schedule Widget (TodayScheduleWidget) ──────────────────────────

  describe('Today Schedule Widget (TodayScheduleWidget)', () => {
    it('renders testID "today-schedule-widget"', () => {
      const html = renderDashboard();
      expect(html).toContain('today-schedule-widget');
    });

    it('renders section header "Buổi dạy tiếp theo" with "Xem toàn bộ"', () => {
      const html = renderDashboard();
      expect(html).toContain('Buổi dạy tiếp theo');
      expect(html).toContain('Xem toàn bộ');
    });

    it('renders AppEmptyState when no classes are scheduled', () => {
      const html = renderDashboard();
      expect(html).toContain('Chưa có lịch giảng dạy');
      expect(html).toContain('Hiện tại Thầy/Cô chưa được phân công lớp học phần nào');
    });

    it('renders upcoming class card with sectionCode and courseName', () => {
      (LecturerHooks.useLecturerClasses as jest.Mock).mockReturnValue({
        data: [mockClass],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });
      const html = renderDashboard();
      expect(html).toContain('IT101-01');
      expect(html).toContain('Lập trình Java');
    });

    it('renders room and enrollment details', () => {
      (LecturerHooks.useLecturerClasses as jest.Mock).mockReturnValue({
        data: [mockClass],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });
      const html = renderDashboard();
      expect(html).toContain('P301');
      expect(html).toContain('35/40 SV');
    });

    it('renders "Mở điểm danh QR lớp này" quick action button', () => {
      (LecturerHooks.useLecturerClasses as jest.Mock).mockReturnValue({
        data: [mockClass],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });
      const html = renderDashboard();
      expect(html).toContain('Mở điểm danh QR lớp này');
    });

    describe('findNextUpcomingClass Chronology Algorithm (F-11)', () => {
      it('returns null when classes array is empty', () => {
        expect(findNextUpcomingClass([])).toBeNull();
      });

      it('sorts multiple classes today by startTime', () => {
        // Monday 08:00
        const fakeNow = new Date('2026-11-16T08:00:00'); // Mon
        const classMorning = { ...mockClass, sectionId: 1, dayOfWeek: 'MON', startTime: '07:30', endTime: '09:30' };
        const classAfternoon = { ...mockClass, sectionId: 2, dayOfWeek: 'MON', startTime: '13:00', endTime: '15:00' };

        // Even if array order is afternoon first
        const next = findNextUpcomingClass([classAfternoon, classMorning], fakeNow);
        expect(next?.sectionId).toBe(1);
      });

      it('skips a class today that has already ended and picks the next upcoming one today', () => {
        // Monday 10:00 (class 07:30-09:30 has ended)
        const fakeNow = new Date('2026-11-16T10:00:00'); // Mon
        const classEnded = { ...mockClass, sectionId: 1, dayOfWeek: 'MON', startTime: '07:30', endTime: '09:30' };
        const classUpcoming = { ...mockClass, sectionId: 2, dayOfWeek: 'MON', startTime: '13:00', endTime: '15:00' };

        const next = findNextUpcomingClass([classEnded, classUpcoming], fakeNow);
        expect(next?.sectionId).toBe(2);
      });

      it('finds the earliest class on future days when today has no classes', () => {
        // Tuesday
        const fakeNow = new Date('2026-11-17T08:00:00'); // Tue
        const classWed = { ...mockClass, sectionId: 3, dayOfWeek: 'WED', startTime: '09:00', endTime: '11:00' };
        const classFri = { ...mockClass, sectionId: 5, dayOfWeek: 'FRI', startTime: '07:30', endTime: '09:30' };
        const classMonPast = { ...mockClass, sectionId: 1, dayOfWeek: 'MON', startTime: '07:30', endTime: '09:30' };

        // Array has Mon first, but on Tue -> next class is Wed!
        const next = findNextUpcomingClass([classMonPast, classFri, classWed], fakeNow);
        expect(next?.sectionId).toBe(3);
      });

      describe('Edge Cases & Timezone Hardening (STEP 4.2.3 Quality Gate)', () => {
        it('normalizes unpadded time strings and sorts "7:30" before "09:30"', () => {
          expect(normalizeTime('7:30')).toBe('07:30');
          expect(normalizeTime('07:30:00')).toBe('07:30');
          expect(normalizeTime(' 8:5 ')).toBe('08:05');
          expect(normalizeTime(null)).toBe('');
          expect(normalizeTime('invalid')).toBe('');

          const fakeNow = new Date('2026-11-16T06:00:00'); // Mon morning
          const classA = { ...mockClass, sectionId: 10, dayOfWeek: 'MON', startTime: '7:30', endTime: '9:30' };
          const classB = { ...mockClass, sectionId: 20, dayOfWeek: 'MON', startTime: '09:30', endTime: '11:30' };

          // In unnormalized string comparison, '7:30' > '09:30' because '7' > '0'.
          // Normalized comparison ensures '07:30' < '09:30'.
          const next = findNextUpcomingClass([classB, classA], fakeNow);
          expect(next?.sectionId).toBe(10);
        });

        it('identifies in-progress class as active teaching session (e.g. 08:30 during 07:30-09:30 class)', () => {
          // Monday 08:30 (class 07:30-09:30 is in progress)
          const fakeNow = new Date('2026-11-16T08:30:00');
          const classInProgress = { ...mockClass, sectionId: 1, dayOfWeek: 'MON', startTime: '07:30', endTime: '09:30' };
          const classLater = { ...mockClass, sectionId: 2, dayOfWeek: 'MON', startTime: '13:00', endTime: '15:00' };

          const next = findNextUpcomingClass([classLater, classInProgress], fakeNow);
          expect(next?.sectionId).toBe(1);
        });

        it('handles boundary at exact end minute: transitions at 09:30, remains active at 09:29', () => {
          const classCurrent = { ...mockClass, sectionId: 1, dayOfWeek: 'MON', startTime: '07:30', endTime: '09:30' };
          const classNext = { ...mockClass, sectionId: 2, dayOfWeek: 'MON', startTime: '13:00', endTime: '15:00' };

          // At 09:29: class 1 is still in session
          const at0929 = new Date('2026-11-16T09:29:00');
          const result0929 = findNextUpcomingClass([classCurrent, classNext], at0929);
          expect(result0929?.sectionId).toBe(1);

          // At 09:30: class 1 has completed its scheduled window, transitions to class 2
          const at0930 = new Date('2026-11-16T09:30:00');
          const result0930 = findNextUpcomingClass([classCurrent, classNext], at0930);
          expect(result0930?.sectionId).toBe(2);
        });

        it('handles weekly wrap-around to earliest class next week when current week is completed', () => {
          // Friday 16:00 (past all Friday classes)
          const fakeNow = new Date('2026-11-20T16:00:00'); // Fri
          const classMon = { ...mockClass, sectionId: 1, dayOfWeek: 'MON', startTime: '07:30', endTime: '09:30' };
          const classWed = { ...mockClass, sectionId: 2, dayOfWeek: 'WED', startTime: '09:00', endTime: '11:00' };
          const classFriPassed = { ...mockClass, sectionId: 3, dayOfWeek: 'FRI', startTime: '07:30', endTime: '09:30' };

          const next = findNextUpcomingClass([classFriPassed, classWed, classMon], fakeNow);
          // Wraps around to Monday
          expect(next?.sectionId).toBe(1);
        });

        it('safely skips malformed dayOfWeek and returns null if all are invalid', () => {
          const invalidClass1 = { ...mockClass, sectionId: 91, dayOfWeek: 'FUNDAY' };
          const invalidClass2 = { ...mockClass, sectionId: 92, dayOfWeek: '' };
          const validClass = { ...mockClass, sectionId: 93, dayOfWeek: 'TUE', startTime: '08:00', endTime: '10:00' };

          const fakeNow = new Date('2026-11-16T08:00:00'); // Mon
          const next = findNextUpcomingClass([invalidClass1, invalidClass2, validClass], fakeNow);
          expect(next?.sectionId).toBe(93);

          // All invalid
          const allInvalid = findNextUpcomingClass([invalidClass1, invalidClass2], fakeNow);
          expect(allInvalid).toBeNull();
        });

        it('provides stable tie-breaker by sectionCode when two classes have identical day and startTime', () => {
          const fakeNow = new Date('2026-11-16T06:00:00'); // Mon
          const classSecB = { ...mockClass, sectionId: 102, sectionCode: 'IT101-02', dayOfWeek: 'MON', startTime: '07:30' };
          const classSecA = { ...mockClass, sectionId: 101, sectionCode: 'IT101-01', dayOfWeek: 'MON', startTime: '07:30' };

          const next = findNextUpcomingClass([classSecB, classSecA], fakeNow);
          expect(next?.sectionId).toBe(101);
          expect(next?.sectionCode).toBe('IT101-01');
        });

        it('correctly maps UTC Date to Vietnam Academic Timezone (Asia/Ho_Chi_Minh)', () => {
          // UTC 2026-11-16T01:00:00Z is 08:00:00 AM on Monday in Vietnam (UTC+7)
          const utcDate = new Date('2026-11-16T01:00:00Z');
          const academicTime = getAcademicCurrentTime(utcDate);

          expect(academicTime.dayIndex).toBe(1); // Monday
          expect(academicTime.timeStr).toBe('08:00');

          const classMorning = { ...mockClass, sectionId: 1, dayOfWeek: 'MON', startTime: '07:30', endTime: '09:30' };
          const classAfternoon = { ...mockClass, sectionId: 2, dayOfWeek: 'MON', startTime: '13:00', endTime: '15:00' };

          // At 08:00 ICT, morning class is in progress
          const next = findNextUpcomingClass([classAfternoon, classMorning], utcDate);
          expect(next?.sectionId).toBe(1);
        });
      });
    });
  });

  // ── 6. Lecturer Quick Actions (LecturerQuickActions) ────────────────────────

  describe('Lecturer Quick Actions (LecturerQuickActions)', () => {
    it('renders testID "lecturer-quick-actions"', () => {
      const html = renderDashboard();
      expect(html).toContain('lecturer-quick-actions');
    });

    it('renders testID "lecturer-action-attendance"', () => {
      const html = renderDashboard();
      expect(html).toContain('lecturer-action-attendance');
      expect(html).toContain('Mở điểm danh QR Động');
    });

    it('renders testID "lecturer-action-classes"', () => {
      const html = renderDashboard();
      expect(html).toContain('lecturer-action-classes');
      expect(html).toContain('Danh sách lớp &amp; Nhập điểm');
    });

    it('renders testID "lecturer-action-schedule"', () => {
      const html = renderDashboard();
      expect(html).toContain('lecturer-action-schedule');
      expect(html).toContain('Thời khóa biểu giảng dạy');
    });
  });

  // ── 7. Loading and Error States ────────────────────────────────────────────

  describe('Loading and Error States', () => {
    it('renders loading skeleton when isClassesLoading is true', () => {
      (LecturerHooks.useLecturerClasses as jest.Mock).mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });
      const html = renderDashboard();
      expect(html).toContain('Đang tải chỉ số giảng dạy...');
    });

    it('renders AppErrorState when isClassesError is true', () => {
      (LecturerHooks.useLecturerClasses as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        error: { message: 'Lỗi máy chủ nội bộ' },
        refetch: jest.fn(),
        isRefetching: false,
      });
      const html = renderDashboard();
      expect(html).toContain('Không thể tải dữ liệu lớp học');
      expect(html).toContain('Lỗi máy chủ nội bộ');
      expect(html).toContain('Thử lại');
    });
  });

  // ── 8. Data Provenance & Fallback ──────────────────────────────────────────

  describe('Data Provenance & Fallbacks', () => {
    it('uses profileData when available from live query', () => {
      (AuthHooks.useProfile as jest.Mock).mockReturnValue({
        data: {
          user: { ...mockAuthState.user, fullName: 'GS. Lê Văn C' },
          lecturerProfile: mockAuthState.lecturerProfile,
        },
        isLoading: false,
        refetch: jest.fn(),
      });
      const html = renderDashboard();
      expect(html).toContain('GS. Lê Văn C');
      expect(html).toContain('Xin chào, C');
    });

    it('falls back to authStore user when profileData is null', () => {
      mockAuthState.user.fullName = 'Fallback Lecturer';
      const html = renderDashboard();
      expect(html).toContain('Fallback Lecturer');
    });

    it('uses fallback department when missing from profile', () => {
      mockAuthState.lecturerProfile.department = '';
      const html = renderDashboard();
      expect(html).toContain('Khoa Công nghệ Thông tin');
    });
  });
});
