/**
 * Student Attendance History Hook
 * Fetches attendance check-in records for the authenticated student.
 * Scoped to user identity with TanStack Query caching.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { studentApi } from '../services/studentApi';
import { StudentAttendanceHistoryResponse } from '../types';

export interface UseStudentAttendanceHistoryParams {
  sectionId?: number;
  semesterName?: string;
  page?: number;
  size?: number;
}

export const useStudentAttendanceHistory = (params?: UseStudentAttendanceHistoryParams) => {
  const user = useAuthStore((state) => state.user);
  const studentProfile = useAuthStore((state) => state.studentProfile);
  const scope = studentProfile?.studentCode || (user ? String(user.id) : undefined);

  return useQuery<StudentAttendanceHistoryResponse, Error>({
    queryKey: [
      ...queryKeys.student.attendanceHistory(params?.sectionId, params?.semesterName, scope),
      params?.page ?? 0,
      params?.size ?? 50,
    ] as const,
    queryFn: () => studentApi.getAttendanceHistory(params),
    enabled: Boolean(user && user.role === 'STUDENT'),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
};
