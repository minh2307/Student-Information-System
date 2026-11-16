/**
 * Student Tuition Hook
 * Fetches tuition statement, fee breakdown, and payment details via TanStack Query.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { studentApi } from '../services/studentApi';
import { Tuition } from '../types';

export const useStudentTuition = (semester?: string, bank?: string) => {
  const user = useAuthStore((state) => state.user);
  const studentProfile = useAuthStore((state) => state.studentProfile);
  const scope = studentProfile?.studentCode || (user ? String(user.id) : undefined);

  return useQuery<Tuition, Error>({
    queryKey: queryKeys.student.tuition(semester, scope),
    queryFn: () => studentApi.getTuition(semester, bank),
    enabled: Boolean(user && user.role === 'STUDENT'),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
};
