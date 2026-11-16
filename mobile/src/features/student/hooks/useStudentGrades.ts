/**
 * Student Grades Hook
 * Fetches academic grades across semesters with user-scoped caching.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { studentApi } from '../services/studentApi';
import { StudentGrade } from '../types';

export const useStudentGrades = (semester?: string) => {
  const user = useAuthStore((state) => state.user);
  const studentProfile = useAuthStore((state) => state.studentProfile);
  const scope = studentProfile?.studentCode || (user ? String(user.id) : undefined);

  return useQuery<StudentGrade[], Error>({
    queryKey: queryKeys.student.grades(semester, scope),
    queryFn: () => studentApi.getGrades(),
    enabled: Boolean(user && user.role === 'STUDENT'),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
};
