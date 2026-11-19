/**
 * Student Screens Rendering & Component Unit Tests
 * Uses react-dom/server renderToStaticMarkup to test screen outputs without extra dependencies.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import { OfflineProvider } from '@/features/offline';
import DashboardScreen from '@/app/(student)/dashboard';
import TimetableScreen from '@/app/(student)/timetable';
import ExamsScreen from '@/app/(student)/exams';
import GradesScreen from '@/app/(student)/grades';
import TuitionScreen from '@/app/(student)/tuition';
import ProfileScreen from '@/app/(student)/profile';

function renderWithProviders(ui: React.ReactElement) {
  return renderToStaticMarkup(<OfflineProvider>{ui}</OfflineProvider>);
}
import { useAuthStore } from '@/stores/authStore';
import {
  useStudentDashboard,
  useStudentTimetable,
  useStudentExams,
  useStudentGrades,
  useStudentTuition,
  useStudentAcademicContext,
} from '@/features/student/hooks';
import { useProfile } from '@/features/auth/hooks/useProfile';

// Mock student hooks
jest.mock('@/features/student/hooks', () => ({
  useStudentDashboard: jest.fn(),
  useStudentTimetable: jest.fn(),
  useStudentExams: jest.fn(),
  useStudentGrades: jest.fn(),
  useStudentTuition: jest.fn(),
  usePayOSPayment: jest.fn(() => ({
    state: { status: 'idle', paymentData: null, verifiedTuition: null, errorMessage: null },
    isCreating: false,
    isCheckoutReady: false,
    isVerifying: false,
    isSuccess: false,
    initiateCheckout: jest.fn(),
    verifyPaymentWithBackend: jest.fn(),
    resetCheckout: jest.fn(),
    reset: jest.fn(),
  })),
  useStudentAttendanceHistory: jest.fn(() => ({ data: { records: [] }, isLoading: false, isError: false })),
  useSemesters: jest.fn(() => ({
    data: [
      { id: 1, semesterCode: '2024.1', semesterName: 'Học kỳ 1 2024-2025', isActive: true },
    ],
    isLoading: false,
    isError: false,
  })),
  useStudentAcademicContext: jest.fn(() => ({
    data: {
      studentCode: 'SV2026001',
      fullName: 'Nguyễn Văn A',
      major: 'Công nghệ thông tin',
      currentCgpa: 3.45,
      completedCredits: 84,
      totalRequiredCredits: 130,
      academicStanding: 'Giỏi',
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    isRefetching: false,
  })),
}));

// Mock auth hook
jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

// Mock notifications hook for AppNotificationHeader
jest.mock('@/features/notifications/hooks/useNotifications', () => ({
  useNotifications: () => ({
    unreadCount: 4,
    notifications: [],
    isLoading: false,
    markAsRead: jest.fn(),
  }),
}));

// Mock router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-icon={props.name} />,
}));

// Mock auth store
let mockAuthState = {
  user: {
    id: 4,
    username: 'sv2024001',
    email: 'sv2024001@rikkei.edu.vn',
    fullName: 'Nguyễn Văn C',
    role: 'STUDENT',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
  },
  studentProfile: {
    studentCode: 'SV2024001',
    major: 'B.Tech - Computer Science',
    currentSemester: 6,
    creditsEarned: 84,
    totalRequiredCredits: 160,
    currentCgpa: 8.74,
    previousCgpa: 8.62,
  },
  lecturerProfile: null,
  role: 'STUDENT',
  isAuthenticated: true,
  isInitializing: false,
};

jest.mock('@/stores/authStore', () => {
  const store = (selector: any) => (typeof selector === 'function' ? selector(mockAuthState) : mockAuthState);
  store.getState = () => mockAuthState;
  store.setState = (partial: any) => {
    mockAuthState = { ...mockAuthState, ...partial };
  };
  return {
    useAuthStore: store,
  };
});

describe('Student Screens Rendering & UX Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = {
      user: {
        id: 4,
        username: 'sv2024001',
        email: 'sv2024001@rikkei.edu.vn',
        fullName: 'Nguyễn Văn C',
        role: 'STUDENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01',
      },
      studentProfile: {
        studentCode: 'SV2024001',
        major: 'B.Tech - Computer Science',
        currentSemester: 6,
        creditsEarned: 84,
        totalRequiredCredits: 160,
        currentCgpa: 8.74,
        previousCgpa: 8.62,
      },
      lecturerProfile: null,
      role: 'STUDENT',
      isAuthenticated: true,
      isInitializing: false,
    };
  });

  describe('DashboardScreen', () => {
    it('renders dashboard with student card, KPIs, and upcoming classes', () => {
      (useStudentDashboard as jest.Mock).mockReturnValue({
        data: {
          stats: { registeredCourses: 6, weeklyClasses: 23, pendingRegistrations: 0, scheduleConflicts: 0 },
          upcomingClasses: [
            {
              id: 1,
              courseCode: 'CS201',
              courseName: 'Data Structures and Algorithms',
              dayOfWeek: 'MON',
              startTime: '09:00',
              endTime: '10:30',
              roomName: 'Room A-204',
              lecturerName: 'TS. Nguyễn Văn A',
              credits: 3,
            },
          ],
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
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderWithProviders(<DashboardScreen />);
      expect(html).toContain('HỌC VIỆN CÔNG NGHỆ RIKKEI');
      expect(html).toContain('Nguyễn Văn C');
      expect(html).toContain('SV2024001');
      expect(html).toContain('Data Structures and Algorithms');
      expect(html).toContain('CS201');
      expect(html).toContain('Xuất sắc');
      expect(html).toContain('8.74');
      // REDS v2.0 component testIDs and section checks
      expect(html).toContain('student-id-card');
      expect(html).toContain('quick-action-timetable');
      expect(html).toContain('quick-action-exams');
      expect(html).toContain('quick-action-grades');
      expect(html).toContain('quick-action-tuition');
      expect(html).toContain('Chỉ số học tập kỳ này');
      expect(html).toContain('Lớp học sắp tới');
    });

    it('renders ErrorView when Dashboard API fails', () => {
      (useStudentDashboard as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Không thể kết nối API Gateway'),
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderWithProviders(<DashboardScreen />);
      expect(html).toContain('Không thể tải tổng quan học vụ');
      expect(html).toContain('Không thể kết nối API Gateway');
      expect(html).toContain('Thử lại');
    });

    it('renders loading indicator while fetching', () => {
      (useStudentDashboard as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderWithProviders(<DashboardScreen />);
      expect(html).toContain('Đang cập nhật chỉ số học vụ...');
    });
  });

  describe('TimetableScreen', () => {
    it('renders timetable classes with course and room information', () => {
      const mockTimetable = [
        {
          id: 1,
          courseCode: 'CS201',
          courseName: 'Data Structures and Algorithms',
          dayOfWeek: 'MON',
          startTime: '09:00',
          endTime: '10:30',
          roomName: 'Room A-204',
          lecturerName: 'TS. Nguyễn Văn A',
          credits: 3,
          status: 'REGISTERED',
        },
        {
          id: 2,
          courseCode: 'CS301',
          courseName: 'Database Management Systems',
          dayOfWeek: 'TUE',
          startTime: '07:30',
          endTime: '09:00',
          roomName: 'Room B-101',
          lecturerName: 'ThS. Trần Thị B',
          credits: 3,
          status: 'REGISTERED',
        },
      ];

      (useStudentTimetable as jest.Mock).mockReturnValue({
        data: mockTimetable,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderWithProviders(<TimetableScreen />);
      expect(html).toContain('Data Structures and Algorithms');
      expect(html).toContain('Database Management Systems');
      expect(html).toContain('Room A-204');
      expect(html).toContain('TS. Nguyễn Văn A');
      expect(html).toContain('Đã duyệt');
      // REDS v2.0 component testIDs and weekday selector checks
      expect(html).toContain('day-selector-ALL');
      expect(html).toContain('day-selector-MON');
      expect(html).toContain('timetable-class-1');
      expect(html).toContain('timetable-class-2');
    });

    it('shows empty state when no classes are scheduled', () => {
      (useStudentTimetable as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderWithProviders(<TimetableScreen />);
      expect(html).toContain('Không có lịch học');
    });
  });

  describe('ExamsScreen', () => {
    it('renders native exam schedule with upcoming banner and venue details', () => {
      const mockExams = [
        {
          id: 1,
          courseCode: 'CS101',
          courseName: 'Lập trình Java căn bản',
          sectionCode: 'CS101-01',
          credits: 3,
          examDate: '2026-12-20',
          startTime: '08:00',
          endTime: '09:30',
          roomName: 'P.302 - Nhà A1',
          examType: 'Trắc nghiệm máy',
          lecturerName: 'TS. Nguyễn Văn A',
        },
      ];

      (useStudentExams as jest.Mock).mockReturnValue({
        data: mockExams,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderWithProviders(<ExamsScreen />);
      expect(html).toContain('student-exams-screen');
      expect(html).toContain('exams-hero-banner');
      expect(html).toContain('Lập trình Java căn bản');
      expect(html).toContain('P.302 - Nhà A1');
      expect(html).toContain('Trắc nghiệm máy');
    });
  });

  describe('GradesScreen', () => {
    it('renders native grades screen with GPA summary and course grades', () => {
      const mockGrades = [
        {
          enrollmentId: 101,
          courseCode: 'CS101',
          courseName: 'Lập trình Java căn bản',
          credits: 3,
          semesterName: 'Học kỳ 1 2026-2027',
          attendanceScore: 9.0,
          midtermScore: 8.5,
          finalScore: 8.0,
          totalScore: 8.3,
          letterGrade: 'B+',
          isLocked: true,
        },
      ];

      (useStudentGrades as jest.Mock).mockReturnValue({
        data: mockGrades,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderWithProviders(<GradesScreen />);
      expect(html).toContain('student-grades-screen');
      expect(html).toContain('grades-summary-card');
      expect(html).toContain('Lập trình Java căn bản');
      expect(html).toContain('CS101');
      expect(html).toContain('B+');
      expect(html).toContain('ĐẠT');
    });
  });

  describe('TuitionScreen', () => {
    it('renders tuition overview, formatted VND currency, and VietQR details', () => {
      const mockTuition = {
        id: 1,
        semesterName: '2024-25_SEM2',
        totalCredits: 19,
        creditUnitPrice: 100,
        facilityFee: 1000,
        totalAmount: 2900,
        paidAmount: 0,
        remainingAmount: 2900,
        excessAmount: 0,
        status: 'UNPAID',
        dueDate: '2026-12-05',
        bankName: 'MB Bank (Ngân hàng TMCP Quân đội)',
        accountNumber: '999988882025',
        accountName: 'HOC VIEN CONG NGHE RIKKEI',
        transferContent: 'HP SV2024001 2024-25_SEM2',
        vietQrQuickLink: 'https://img.vietqr.io/image/test.png',
        courses: [
          {
            courseCode: 'CS201',
            courseName: 'Data Structures and Algorithms',
            credits: 3,
            fee: 300,
          },
        ],
      };

      (useStudentTuition as jest.Mock).mockReturnValue({
        data: mockTuition,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderWithProviders(<TuitionScreen />);
      expect(html).toContain('Chưa thanh toán');
      expect(html).toContain('999988882025');
      expect(html).toContain('HOC VIEN CONG NGHE RIKKEI');
      expect(html).toContain('HP SV2024001 2024-25_SEM2');
      expect(html).toContain('Data Structures and Algorithms');
      expect(html).toContain('Chuyển khoản VietQR Napas247');
    });

    it('shows completed badge when tuition is PAID', () => {
      const mockPaidTuition = {
        id: 1,
        semesterName: '2024-25_SEM2',
        totalCredits: 19,
        creditUnitPrice: 100,
        facilityFee: 1000,
        totalAmount: 2900,
        paidAmount: 2900,
        remainingAmount: 0,
        excessAmount: 0,
        status: 'PAID',
        courses: [],
      };

      (useStudentTuition as jest.Mock).mockReturnValue({
        data: mockPaidTuition,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderWithProviders(<TuitionScreen />);
      expect(html).toContain('Đã hoàn thành');
    });
  });

  describe('ProfileScreen', () => {
    it('renders profile card, student academic info, and logout action', () => {
      (useProfile as jest.Mock).mockReturnValue({
        profile: {
          user: {
            id: 4,
            username: 'sv2024001',
            email: 'nguyenvanc@rikkei.edu.vn',
            fullName: 'Nguyễn Văn C',
            role: 'STUDENT',
            status: 'ACTIVE',
            createdAt: '2026-01-01',
          },
          studentProfile: {
            studentCode: 'SV2024001',
            major: 'B.Tech - Computer Science',
            currentSemester: 6,
            creditsEarned: 84,
            totalRequiredCredits: 160,
            currentCgpa: 8.74,
            previousCgpa: 8.62,
          },
          lecturerProfile: null,
        },
        refetch: jest.fn(),
        isRefetching: false,
        updateProfile: jest.fn(),
        isUpdating: false,
        updateError: null,
      });

      const html = renderWithProviders(<ProfileScreen />);
      expect(html).toContain('Nguyễn Văn C');
      expect(html).toContain('SV2024001');
      expect(html).toContain('Đăng xuất');
      expect(html).toContain('hybrid-profile-webview');
      expect(html).toContain('mock-webview');
    });
  });
});
