/**
 * Lecturer React Query Hooks
 * Type-safe data fetching, caching, and cache invalidation.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { lecturerApi } from '../services/lecturerApi';
import {
  AttendanceSession,
  AttendanceUpdateRequest,
  DispatchWarningRequest,
  DynamicQrResponse,
  EarlyWarningSummary,
  GradeUpdateRequest,
  LecturerClassSection,
  StudentGrade,
} from '../types';

/**
 * Fetch all assigned classes for logged-in lecturer
 */
export function useLecturerClasses(semester?: string) {
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userId ? `user_${userId}` : 'current';

  return useQuery({
    queryKey: queryKeys.lecturer.classes(semester, scope),
    queryFn: async (): Promise<LecturerClassSection[]> => {
      return await lecturerApi.getMyClasses(semester);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch enrolled students and their scores for a section
 */
export function useClassStudents(sectionId: number, enabled: boolean = true) {
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userId ? `user_${userId}` : 'current';

  return useQuery({
    queryKey: queryKeys.lecturer.classStudents(sectionId, scope),
    queryFn: async (): Promise<StudentGrade[]> => {
      return await lecturerApi.getStudentsOfSection(sectionId);
    },
    enabled: enabled && sectionId > 0,
    staleTime: 60 * 1000,
  });
}

/**
 * Mutation: Update attendance rate for student
 */
export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userId ? `user_${userId}` : 'current';

  return useMutation({
    mutationFn: ({
      enrollmentId,
      request,
    }: {
      enrollmentId: number;
      sectionId?: number;
      request: AttendanceUpdateRequest;
    }) => lecturerApi.updateAttendance(enrollmentId, request),
    onSuccess: (_, variables) => {
      if (variables.sectionId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.lecturer.classStudents(variables.sectionId, scope),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.lecturer.sectionRisks(variables.sectionId, scope),
        });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.lecturer.all(scope) });
      }
    },
  });
}

/**
 * Mutation: Update student grade
 */
export function useUpdateGrade() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userId ? `user_${userId}` : 'current';

  return useMutation({
    mutationFn: ({
      enrollmentId,
      request,
    }: {
      enrollmentId: number;
      sectionId?: number;
      request: GradeUpdateRequest;
    }) => lecturerApi.updateGrade(enrollmentId, request),
    onSuccess: (_, variables) => {
      if (variables.sectionId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.lecturer.classStudents(variables.sectionId, scope),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.lecturer.sectionRisks(variables.sectionId, scope),
        });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.lecturer.all(scope) });
      }
    },
  });
}

/**
 * Mutation: Lock all grades of a class section
 */
export function useLockGrades() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userId ? `user_${userId}` : 'current';

  return useMutation({
    mutationFn: (sectionId: number) => lecturerApi.lockGrades(sectionId),
    onSuccess: (_, sectionId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lecturer.classStudents(sectionId, scope),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.lecturer.classes(undefined, scope),
      });
    },
  });
}

/**
 * Fetch current attendance session and scanned attendee roster
 */
export function useAttendanceSession(
  sectionId: number,
  enabled: boolean = true,
  refetchInterval: number | false = false
) {
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userId ? `user_${userId}` : 'current';

  return useQuery({
    queryKey: queryKeys.lecturer.attendanceSession(sectionId, scope),
    queryFn: async (): Promise<AttendanceSession> => {
      return await lecturerApi.getCurrentAttendanceSession(sectionId);
    },
    enabled: enabled && sectionId > 0,
    refetchInterval,
    retry: 1,
  });
}

/**
 * Fetch rotating TOTP QR code (changes every 15s)
 */
export function useRotatingQr(sectionId: number, enabled: boolean = true) {
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userId ? `user_${userId}` : 'current';

  return useQuery({
    queryKey: queryKeys.lecturer.rotatingQr(sectionId, scope),
    queryFn: async (): Promise<DynamicQrResponse> => {
      return await lecturerApi.getRotatingQrCode(sectionId);
    },
    enabled: enabled && sectionId > 0,
    retry: 1,
    staleTime: 5000, // 5s stale time for rotating QR
  });
}

/**
 * Mutation: Start dynamic attendance session
 */
export function useStartAttendanceSession() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userId ? `user_${userId}` : 'current';

  return useMutation({
    mutationFn: ({
      sectionId,
      sessionName,
    }: {
      sectionId: number;
      sessionName?: string;
    }) => lecturerApi.startAttendanceSession(sectionId, sessionName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lecturer.attendanceSession(variables.sectionId, scope),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.lecturer.rotatingQr(variables.sectionId, scope),
      });
    },
  });
}

/**
 * Mutation: Close active attendance session
 */
export function useCloseAttendanceSession() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userId ? `user_${userId}` : 'current';

  return useMutation({
    mutationFn: (sectionId: number) => lecturerApi.closeAttendanceSession(sectionId),
    onSuccess: (_, sectionId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lecturer.attendanceSession(sectionId, scope),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.lecturer.rotatingQr(sectionId, scope),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.lecturer.classStudents(sectionId, scope),
      });
    },
  });
}

/**
 * Fetch early warning risk summary for a section
 */
export function useSectionRisks(sectionId: number, enabled: boolean = true) {
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userId ? `user_${userId}` : 'current';

  return useQuery({
    queryKey: queryKeys.lecturer.sectionRisks(sectionId, scope),
    queryFn: async (): Promise<EarlyWarningSummary> => {
      return await lecturerApi.getSectionRisks(sectionId);
    },
    enabled: enabled && sectionId > 0,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Mutation: Dispatch early warning alerts
 */
export function useDispatchWarnings() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const scope = userId ? `user_${userId}` : 'current';

  return useMutation({
    mutationFn: (request: DispatchWarningRequest) => lecturerApi.dispatchWarnings(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lecturer.sectionRisks(variables.sectionId, scope),
      });
    },
  });
}
