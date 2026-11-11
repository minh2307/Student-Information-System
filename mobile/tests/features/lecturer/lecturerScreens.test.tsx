/**
 * Lecturer Screens Component Unit Tests
 * Uses react-dom/server renderToStaticMarkup to validate UI presentation,
 * empty states, error states, and user interactions without native browser dependencies.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OfflineProvider } from '@/features/offline';
import LecturerDashboardScreen from '../../../app/(lecturer)/dashboard';
import LecturerScheduleScreen from '../../../app/(lecturer)/schedule';
import LecturerClassesScreen from '../../../app/(lecturer)/classes';
import LecturerAttendanceScreen from '../../../app/(lecturer)/attendance';
import LecturerProfileScreen from '../../../app/(lecturer)/profile';
import { useAuthStore } from '@/stores/authStore';
import * as LecturerHooks from '@/features/lecturer/hooks/useLecturerQueries';
import * as AuthHooks from '@/features/auth/hooks/useProfile';

jest.mock('@/features/lecturer/hooks/useLecturerQueries', () => {
  const actual = jest.requireActual('@/features/lecturer/hooks/useLecturerQueries');
  return {
    ...actual,
    useLecturerClasses: jest.fn(() => ({ data: [], isLoading: false })),
    useClassStudents: jest.fn(() => ({ data: [], isLoading: false })),
    useAttendanceSession: jest.fn(() => ({ data: null, isLoading: false, refetch: jest.fn() })),
    useRotatingQr: jest.fn(() => ({ data: null, isLoading: false, refetch: jest.fn() })),
    useStartAttendanceSession: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
    useCloseAttendanceSession: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
    useSectionRisks: jest.fn(() => ({ data: null, isLoading: false })),
    useDispatchWarnings: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
    useUpdateAttendance: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
    useUpdateGrade: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
    useLockGrades: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  };
});
jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: jest.fn(() => ({ data: null, isLoading: false })),
}));

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: (props: any) => <img alt="mock" {...props} />,
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-icon={props.name} />,
}));

const mockLecturerUser = {
  id: 2,
  username: 'gv001',
  email: 'nguyenvana@rikkei.edu.vn',
  fullName: 'TS. Nguyễn Văn A',
  role: 'LECTURER' as const,
  status: 'ACTIVE' as const,
  avatarUrl: 'https://example.com/avatar.png',
};

const mockLecturerProfile = {
  lecturerCode: 'GV001',
  department: 'Khoa Công nghệ Thông tin',
  degree: 'Tiến sĩ',
};

const mockClasses = [
  {
    sectionId: 1,
    sectionCode: 'CS201-2025-01',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'CS201',
    credits: 3,
    semesterName: '2024-25_SEM2',
    dayOfWeek: 'MON',
    startTime: '09:00:00',
    endTime: '10:30:00',
    roomName: 'Room A-204',
    currentEnrolled: 2,
    maxCapacity: 40,
    status: 'OPEN' as const,
  },
  {
    sectionId: 2,
    sectionCode: 'CS401-2025-01',
    courseName: 'Web Application Development',
    courseCode: 'CS401',
    credits: 3,
    semesterName: '2024-25_SEM2',
    dayOfWeek: 'WED',
    startTime: '13:30:00',
    endTime: '15:00:00',
    roomName: 'Lab 3',
    currentEnrolled: 1,
    maxCapacity: 35,
    status: 'OPEN' as const,
  },
];

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  });

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <OfflineProvider>{ui}</OfflineProvider>
    </QueryClientProvider>
  );
}

describe('Lecturer Screens Component Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    const mockProfileData = {
      user: mockLecturerUser,
      studentProfile: null,
      lecturerProfile: mockLecturerProfile,
    };

    await useAuthStore.getState().login({
      accessToken: 'mock_token',
      user: mockLecturerUser,
      lecturerProfile: mockLecturerProfile,
    });

    jest.spyOn(AuthHooks, 'useProfile').mockReturnValue({
      data: mockProfileData,
      profile: mockProfileData,
      refetch: jest.fn(),
      isRefetching: false,
      updateProfile: jest.fn(),
      isUpdating: false,
    } as any);
  });

  describe('LecturerDashboardScreen', () => {
    it('renders lecturer profile info, metrics, and upcoming class on success', () => {
      jest.spyOn(LecturerHooks, 'useLecturerClasses').mockReturnValue({
        data: mockClasses,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      const html = renderWithClient(<LecturerDashboardScreen />);

      // Lecturer identity
      expect(html).toContain('TS. Nguyễn Văn A');
      expect(html).toContain('GV001');
      expect(html).toContain('Khoa Công nghệ Thông tin');
      expect(html).toContain('Tiến sĩ');

      // Metric numbers
      expect(html).toContain('2'); // total classes
      expect(html).toContain('3'); // total students (2 + 1)
      expect(html).toContain('Lớp phụ trách');
      expect(html).toContain('Tổng sinh viên');

      // Upcoming class (either today's section or first section)
      expect(html).toContain('Web Application Development');
      expect(html).toContain('CS401-2025-01');
      expect(html).toContain('Lab 3');
    });

    it('renders error banner when classes query fails without breaking the screen', () => {
      jest.spyOn(LecturerHooks, 'useLecturerClasses').mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Network timeout'),
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      const html = renderWithClient(<LecturerDashboardScreen />);

      // Lecturer identity still displays safely
      expect(html).toContain('TS. Nguyễn Văn A');
      expect(html).toContain('Network timeout');
      expect(html).toContain('Thử lại');
    });

    it('renders empty state when lecturer has no assigned classes', () => {
      jest.spyOn(LecturerHooks, 'useLecturerClasses').mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      const html = renderWithClient(<LecturerDashboardScreen />);
      expect(html).toContain('Chưa có lịch giảng dạy');
    });
  });

  describe('LecturerScheduleScreen', () => {
    it('renders schedule day filters and class session cards', () => {
      jest.spyOn(LecturerHooks, 'useLecturerClasses').mockReturnValue({
        data: mockClasses,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      const html = renderWithClient(<LecturerScheduleScreen />);

      expect(html).toContain('Tất cả');
      expect(html).toContain('Thứ 2');
      expect(html).toContain('Thứ 4');
      expect(html).toContain('CS201-2025-01');
      expect(html).toContain('CS401-2025-01');
      expect(html).toContain('Room A-204');
      expect(html).toContain('Lab 3');
    });

    it('renders empty schedule message when no classes exist for selected day', () => {
      jest.spyOn(LecturerHooks, 'useLecturerClasses').mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      const html = renderWithClient(<LecturerScheduleScreen />);
      expect(html).toContain('Không có lịch giảng dạy');
    });
  });

  describe('LecturerClassesScreen', () => {
    it('renders class sections list with search box', () => {
      jest.spyOn(LecturerHooks, 'useLecturerClasses').mockReturnValue({
        data: mockClasses,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      jest.spyOn(LecturerHooks, 'useClassStudents').mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      jest.spyOn(LecturerHooks, 'useSectionRisks').mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      const html = renderWithClient(<LecturerClassesScreen />);
      expect(html).toContain('Các lớp được phân công (2)');
      expect(html).toContain('CS201-2025-01');
      expect(html).toContain('CS401-2025-01');
      expect(html).toContain('Xem chi tiết');
    });
  });

  describe('LecturerAttendanceScreen', () => {
    it('renders inactive session state when no open session exists', () => {
      jest.spyOn(LecturerHooks, 'useLecturerClasses').mockReturnValue({
        data: mockClasses,
        isLoading: false,
      } as any);

      jest.spyOn(LecturerHooks, 'useAttendanceSession').mockReturnValue({
        data: {
          sessionId: 1,
          status: 'CLOSED',
          records: [],
        },
        isLoading: false,
        refetch: jest.fn(),
      } as any);

      jest.spyOn(LecturerHooks, 'useRotatingQr').mockReturnValue({
        data: null,
        isLoading: false,
        refetch: jest.fn(),
      } as any);

      const html = renderWithClient(<LecturerAttendanceScreen />);
      expect(html).toContain('Phiên điểm danh chưa bắt đầu');
      expect(html).toContain('Bắt đầu phiên điểm danh QR');
    });

    it('renders dynamic QR box and active countdown when session is ACTIVE', () => {
      jest.spyOn(LecturerHooks, 'useLecturerClasses').mockReturnValue({
        data: mockClasses,
        isLoading: false,
      } as any);

      jest.spyOn(LecturerHooks, 'useAttendanceSession').mockReturnValue({
        data: {
          sessionId: 5,
          sectionId: 1,
          sectionCode: 'CS201-2025-01',
          courseName: 'Data Structures and Algorithms',
          status: 'ACTIVE',
          stepSeconds: 15,
          totalAttendees: 1,
          records: [
            {
              recordId: 101,
              studentCode: 'SV2024001',
              studentName: 'Nguyễn Văn C',
              checkInTime: '2026-11-11T05:31:00',
            },
          ],
        },
        isLoading: false,
        refetch: jest.fn(),
      } as any);

      jest.spyOn(LecturerHooks, 'useRotatingQr').mockReturnValue({
        data: {
          sessionId: 5,
          sectionId: 1,
          qrToken: '5.1.11962495.c3ab897...',
          qrImageBase64: 'data:image/png;base64,iVBORw0KGgo...',
          stepSeconds: 15,
          remainingSeconds: 12,
        },
        isLoading: false,
        refetch: jest.fn(),
      } as any);

      const html = renderWithClient(<LecturerAttendanceScreen />);

      expect(html).toContain('Mã làm mới sau:');
      expect(html).toContain('Đóng phiên điểm danh');
      expect(html).toContain('Nguyễn Văn C');
      expect(html).toContain('SV2024001');
      expect(html).toContain('Đã quét thành công');
    });
  });

  describe('LecturerProfileScreen', () => {
    it('renders faculty credentials and logout action', () => {
      const html = renderWithClient(<LecturerProfileScreen />);

      expect(html).toContain('TS. Nguyễn Văn A');
      expect(html).toContain('nguyenvana@rikkei.edu.vn');
      expect(html).toContain('GIẢNG VIÊN (LECTURER)');
      expect(html).toContain('GV001');
      expect(html).toContain('Khoa Công nghệ Thông tin');
      expect(html).toContain('Tiến sĩ');
      expect(html).toContain('Đang hoạt động');
      expect(html).toContain('Đăng xuất khỏi thiết bị');
    });
  });
});
