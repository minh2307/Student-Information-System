/**
 * Student Custom Hooks Unit Tests
 * Uses react-dom/server TestHarness to test TanStack Query hooks without extra dependencies.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useStudentDashboard,
  useStudentTimetable,
  useStudentExams,
  useStudentGrades,
  useStudentTuition,
} from '@/features/student';
import { studentApi } from '@/features/student/services/studentApi';
import { useAuthStore } from '@/stores/authStore';

jest.mock('@/features/student/services/studentApi');

function renderHookWithQuery<T>(useHookFn: () => T) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  let hookResult: T = null as any;

  function Harness() {
    hookResult = useHookFn();
    return null;
  }

  renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>
  );

  return { hookResult, queryClient };
}

describe('Student Domain Query Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
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
        major: 'Computer Science',
        currentSemester: 6,
        creditsEarned: 84,
        totalRequiredCredits: 160,
        currentCgpa: 8.74,
        previousCgpa: 8.62,
      },
      isAuthenticated: true,
      isInitializing: false,
    });
  });

  it('useStudentDashboard initiates query and returns pending/loading state', () => {
    (studentApi.getDashboard as jest.Mock).mockResolvedValueOnce({
      stats: { registeredCourses: 6, weeklyClasses: 23, pendingRegistrations: 0, scheduleConflicts: 0 },
      upcomingClasses: [],
      semesterProgress: {
        creditsEarned: 84,
        totalRequiredCredits: 160,
        attendanceRate: 99.2,
        currentCgpa: 8.74,
        previousCgpa: 8.62,
        academicStanding: 'Xuất sắc',
      },
    });

    const { hookResult } = renderHookWithQuery(() => useStudentDashboard());
    expect(hookResult.isLoading || hookResult.isPending).toBe(true);
  });

  it('useStudentTimetable initiates query for student timetable', () => {
    (studentApi.getTimetable as jest.Mock).mockResolvedValueOnce([]);

    const { hookResult } = renderHookWithQuery(() => useStudentTimetable('2024-25_SEM2'));
    expect(hookResult.isLoading || hookResult.isPending).toBe(true);
  });

  it('useStudentExams initiates query for personal exam schedules', () => {
    (studentApi.getExams as jest.Mock).mockResolvedValueOnce([]);

    const { hookResult } = renderHookWithQuery(() => useStudentExams());
    expect(hookResult.isLoading || hookResult.isPending).toBe(true);
  });

  it('useStudentGrades initiates query for student grades', () => {
    (studentApi.getGrades as jest.Mock).mockResolvedValueOnce([]);

    const { hookResult } = renderHookWithQuery(() => useStudentGrades());
    expect(hookResult.isLoading || hookResult.isPending).toBe(true);
  });

  it('useStudentTuition initiates query for tuition billing statement', () => {
    (studentApi.getTuition as jest.Mock).mockResolvedValueOnce({
      id: 1,
      totalAmount: 2900,
      status: 'UNPAID',
    });

    const { hookResult } = renderHookWithQuery(() => useStudentTuition('2024-25_SEM2', '970422'));
    expect(hookResult.isLoading || hookResult.isPending).toBe(true);
  });

  it('useStudentDashboard is disabled when user role is not STUDENT', () => {
    useAuthStore.setState({
      user: {
        id: 2,
        username: 'gv001',
        email: 'gv001@rikkei.edu.vn',
        fullName: 'Giảng viên',
        role: 'LECTURER',
        status: 'ACTIVE',
        createdAt: '2026-01-01',
      },
    });

    const { hookResult } = renderHookWithQuery(() => useStudentDashboard());
    expect(hookResult.fetchStatus).toBe('idle');
  });
});
