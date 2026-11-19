/**
 * Semesters Hook
 * Fetches available academic semesters for selection across grades, tuition, exams.
 */

import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../services/studentApi';

export function useSemesters() {
  return useQuery({
    queryKey: ['system', 'semesters'],
    queryFn: () => studentApi.getSemesters(),
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    gcTime: 24 * 60 * 60 * 1000,
  });
}
