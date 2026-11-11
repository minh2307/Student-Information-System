/**
 * Student Timetable Hook
 * Fetches student schedule filtered by semester with user-scoped caching.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { studentApi } from '../services/studentApi';
import { UpcomingClass } from '../types';

export const useStudentTimetable = (semester?: string) => {
  const user = useAuthStore((state) => state.user);
  const studentProfile = useAuthStore((state) => state.studentProfile);
  const scope = studentProfile?.studentCode || (user ? String(user.id) : undefined);

  return useQuery<UpcomingClass[], Error>({
    queryKey: queryKeys.student.timetable(semester, scope),
    queryFn: () => studentApi.getTimetable(semester),
    enabled: Boolean(user && user.role === 'STUDENT'),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
};
