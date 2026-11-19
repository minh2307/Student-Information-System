/**
 * Student Academic Context Hook
 * Fetches comprehensive academic profile (CGPA, completed credits, standing) with user-scoped caching.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { studentApi } from '../services/studentApi';
import { StudentAcademicContext } from '../types';

export const useStudentAcademicContext = () => {
  const user = useAuthStore((state) => state.user);
  const studentProfile = useAuthStore((state) => state.studentProfile);
  const scope = studentProfile?.studentCode || (user ? String(user.id) : undefined);

  return useQuery<StudentAcademicContext, Error>({
    queryKey: queryKeys.student.academicContext(scope),
    queryFn: () => studentApi.getAcademicContext(),
    enabled: Boolean(user && user.role === 'STUDENT'),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
};
