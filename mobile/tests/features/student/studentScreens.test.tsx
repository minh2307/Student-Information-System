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
} from '@/features/student/hooks';
import { useProfile } from '@/features/auth/hooks/useProfile';

// Mock student hooks
jest.mock('@/features/student/hooks', () => ({
  useStudentDashboard: jest.fn(),
  useStudentTimetable: jest.fn(),
  useStudentExams: jest.fn(),
  useStudentGrades: jest.fn(),
  useStudentTuition: jest.fn(),
}));

// Mock auth hook
jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: jest.fn(),
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
    it('renders personal exams sorted with exam type', () => {
      const mockExams = [
        {
          id: 10,
          courseCode: 'CS405',
          courseName: 'Cloud Computing & DevOps',
          credits: 4,
          examDate: '2025-06-15',
          startTime: '13:00:00',
          endTime: '14:30:00',
          roomName: 'Lab Cloud-1',
          examType: 'THI MÁY',
          notes: 'Mang theo thẻ sinh viên',
        },
        {
          id: 1,
          courseCode: 'CS201',
          courseName: 'Data Structures and Algorithms',
          credits: 3,
          examDate: '2025-06-16',
          startTime: '10:30:00',
          endTime: '12:00:00',
          roomName: 'Room A-204',
          examType: 'TỰ LUẬN',
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
      expect(html).toContain('Cloud Computing &amp; DevOps');
      expect(html).toContain('THI MÁY');
      expect(html).toContain('Lab Cloud-1');
      expect(html).toContain('Data Structures and Algorithms');
      expect(html).toContain('TỰ LUẬN');
      expect(html).toContain('15/06/2025');
    });

    it('renders empty state when no exam schedule is available', () => {
      (useStudentExams as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderWithProviders(<ExamsScreen />);
      expect(html).toContain('Chưa có lịch thi');
    });
  });

  describe('GradesScreen', () => {
    it('renders component grades, letter grade, and C-GPA', () => {
      const mockGrades = [
        {
          enrollmentId: 1,
          courseCode: 'CS201',
          courseName: 'Data Structures and Algorithms',
          credits: 3,
          semesterName: '2024-25_SEM2',
          attendanceScore: 9.5,
          midtermScore: 8.5,
          finalScore: 8.78,
          totalScore: 8.78,
          letterGrade: 'A',
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
      expect(html).toContain('8.74');
      expect(html).toContain('Data Structures and Algorithms');
      expect(html).toContain('8.78');
      expect(html).toContain('9.5');
      expect(html).toContain('8.5');
      expect(html).toContain('A');
    });

    it('shows empty state when student has no grades', () => {
      (useStudentGrades as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderWithProviders(<GradesScreen />);
      expect(html).toContain('Chưa có kết quả học tập');
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
