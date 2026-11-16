/**
 * Student Dashboard Hook
 * Fetches dashboard KPIs, upcoming classes, and academic progress via TanStack Query.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { studentApi } from '../services/studentApi';
import { StudentDashboardResponse } from '../types';

export const useStudentDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const studentProfile = useAuthStore((state) => state.studentProfile);
  const scope = studentProfile?.studentCode || (user ? String(user.id) : undefined);

  return useQuery<StudentDashboardResponse, Error>({
    queryKey: queryKeys.student.dashboard(scope),
    queryFn: () => studentApi.getDashboard(),
    enabled: Boolean(user && user.role === 'STUDENT'),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
};
