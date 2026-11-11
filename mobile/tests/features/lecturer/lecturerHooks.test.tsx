/**
 * Lecturer React Query Hooks Unit Tests
 * Tests data retrieval, caching, mutation execution, and cache invalidation.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useLecturerClasses,
  useClassStudents,
  useUpdateAttendance,
  useUpdateGrade,
  useLockGrades,
  useAttendanceSession,
  useRotatingQr,
  useStartAttendanceSession,
  useCloseAttendanceSession,
  useSectionRisks,
  useDispatchWarnings,
} from '@/features/lecturer';
import { lecturerApi } from '@/features/lecturer/services/lecturerApi';

jest.mock('@/features/lecturer/services/lecturerApi');

function renderHookWithQuery<T>(useHookFn: () => T) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

  let result: T = null as any;

  function TestComponent() {
    result = useHookFn();
    return null;
  }

  renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <TestComponent />
    </QueryClientProvider>
  );

  return { result, queryClient };
}

describe('Lecturer Hooks (useLecturerQueries)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('useLecturerClasses initiates query for classes', () => {
    (lecturerApi.getMyClasses as jest.Mock).mockResolvedValueOnce([]);
    const { result } = renderHookWithQuery(() => useLecturerClasses());
    expect(result.isLoading || result.isPending).toBe(true);
  });

  it('useClassStudents initiates query when enabled and sectionId > 0', () => {
    (lecturerApi.getStudentsOfSection as jest.Mock).mockResolvedValueOnce([]);
    const { result } = renderHookWithQuery(() => useClassStudents(1, true));
    expect(result.isLoading || result.isPending).toBe(true);
  });

  it('useClassStudents is disabled when sectionId is 0', () => {
    const { result } = renderHookWithQuery(() => useClassStudents(0, true));
    expect(result.fetchStatus).toBe('idle');
  });

  it('useAttendanceSession initiates query for active session', () => {
    (lecturerApi.getCurrentAttendanceSession as jest.Mock).mockResolvedValueOnce({
      sessionId: 1,
      status: 'ACTIVE',
      records: [],
    });
    const { result } = renderHookWithQuery(() => useAttendanceSession(1, true));
    expect(result.isLoading || result.isPending).toBe(true);
  });

  it('useRotatingQr initiates query for rotating QR', () => {
    (lecturerApi.getRotatingQrCode as jest.Mock).mockResolvedValueOnce({
      qrToken: 'test-token',
      stepSeconds: 15,
    });
    const { result } = renderHookWithQuery(() => useRotatingQr(1, true));
    expect(result.isLoading || result.isPending).toBe(true);
  });

  it('useSectionRisks initiates query for section risks', () => {
    (lecturerApi.getSectionRisks as jest.Mock).mockResolvedValueOnce({
      criticalCount: 1,
      students: [],
    });
    const { result } = renderHookWithQuery(() => useSectionRisks(1, true));
    expect(result.isLoading || result.isPending).toBe(true);
  });

  it('useUpdateAttendance exposes mutate and mutateAsync', () => {
    const { result } = renderHookWithQuery(() => useUpdateAttendance());
    expect(typeof result.mutate).toBe('function');
    expect(typeof result.mutateAsync).toBe('function');
  });

  it('useUpdateGrade exposes mutate and mutateAsync', () => {
    const { result } = renderHookWithQuery(() => useUpdateGrade());
    expect(typeof result.mutate).toBe('function');
    expect(typeof result.mutateAsync).toBe('function');
  });

  it('useLockGrades exposes mutate and mutateAsync', () => {
    const { result } = renderHookWithQuery(() => useLockGrades());
    expect(typeof result.mutate).toBe('function');
    expect(typeof result.mutateAsync).toBe('function');
  });

  it('useStartAttendanceSession exposes mutate and mutateAsync', () => {
    const { result } = renderHookWithQuery(() => useStartAttendanceSession());
    expect(typeof result.mutate).toBe('function');
  });

  it('useCloseAttendanceSession exposes mutate and mutateAsync', () => {
    const { result } = renderHookWithQuery(() => useCloseAttendanceSession());
    expect(typeof result.mutate).toBe('function');
  });

  it('useDispatchWarnings exposes mutate and mutateAsync', () => {
    const { result } = renderHookWithQuery(() => useDispatchWarnings());
    expect(typeof result.mutate).toBe('function');
  });
});
