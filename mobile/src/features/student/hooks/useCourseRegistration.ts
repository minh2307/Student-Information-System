/**
 * Course Registration Hooks & State Machine (TASK ST-05)
 * Manages class sections query, slot reservations, 1-tap batch enrollment,
 * 24-credit hard limit validation, and schedule conflict detection.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../services/studentApi';
import { ClassSection, SlotReservation, EnrollmentResult } from '../types';

export const MAX_CREDITS_PER_SEMESTER = 24;
export const MIN_RECOMMENDED_CREDITS = 12;

/**
 * Checks whether two class sections have conflicting schedules.
 */
export function isTimeOverlapping(
  day1: string,
  start1: string,
  end1: string,
  day2: string,
  start2: string,
  end2: string
): boolean {
  if (day1 !== day2) return false;
  // Format "HH:mm" or "HH:mm:ss"
  const s1 = start1.substring(0, 5);
  const e1 = end1.substring(0, 5);
  const s2 = start2.substring(0, 5);
  const e2 = end2.substring(0, 5);

  return s1 < e2 && s2 < e1;
}

/**
 * Hook to query available class sections with optional semester and keyword filters.
 */
export function useClassSections(semester?: string, keyword?: string) {
  return useQuery<ClassSection[], Error>({
    queryKey: ['student', 'class-sections', semester, keyword],
    queryFn: () => studentApi.getAvailableSections({ semester, keyword }),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to query active 5-minute slot reservations.
 */
export function useMyReservations() {
  return useQuery<SlotReservation[], Error>({
    queryKey: ['student', 'reservations'],
    queryFn: () => studentApi.getMyReservations(),
    refetchInterval: 10000, // Refresh countdown every 10 seconds
    staleTime: 5 * 1000,
  });
}

/**
 * Comprehensive Course Registration Controller Hook.
 */
export function useCourseRegistration(semester?: string, keyword?: string) {
  const queryClient = useQueryClient();

  const sectionsQuery = useClassSections(semester, keyword);
  const reservationsQuery = useMyReservations();

  const sections = sectionsQuery.data || [];
  const reservations = reservationsQuery.data || [];

  // Calculate enrolled credits
  const enrolledSections = sections.filter((s) => s.isEnrolled);
  const totalEnrolledCredits = enrolledSections.reduce((sum, s) => sum + (s.credits || 0), 0);

  // Invalidate related student queries on mutation success
  const invalidateRegistrationData = () => {
    queryClient.invalidateQueries({ queryKey: ['student', 'class-sections'] });
    queryClient.invalidateQueries({ queryKey: ['student', 'reservations'] });
    queryClient.invalidateQueries({ queryKey: ['student', 'timetable'] });
    queryClient.invalidateQueries({ queryKey: ['student', 'dashboard'] });
  };

  // 1. Direct Enroll Mutation (with 24-credit hard limit check)
  const enrollMutation = useMutation<EnrollmentResult, Error, ClassSection>({
    mutationFn: async (section: ClassSection) => {
      const nextCredits = totalEnrolledCredits + (section.credits || 0);
      if (nextCredits > MAX_CREDITS_PER_SEMESTER) {
        throw new Error(
          `Vượt quá giới hạn tối đa ${MAX_CREDITS_PER_SEMESTER} tín chỉ/học kỳ. Bạn hiện có ${totalEnrolledCredits} TC, thêm môn này (${section.credits} TC) sẽ là ${nextCredits} TC.`
        );
      }
      return studentApi.enrollSection(section.id);
    },
    onSuccess: () => {
      invalidateRegistrationData();
    },
  });

  // 2. Cancel Enrollment Mutation
  const cancelEnrollMutation = useMutation<void, Error, number>({
    mutationFn: (enrollmentId: number) => studentApi.cancelEnrollment(enrollmentId),
    onSuccess: () => {
      invalidateRegistrationData();
    },
  });

  // 3. 5-Minute Slot Reservation Mutation
  const reserveSlotMutation = useMutation<SlotReservation, Error, ClassSection>({
    mutationFn: async (section: ClassSection) => {
      const nextCredits = totalEnrolledCredits + (section.credits || 0);
      if (nextCredits > MAX_CREDITS_PER_SEMESTER) {
        throw new Error(
          `Không thể giữ chỗ: Đăng ký sẽ vượt quá trần ${MAX_CREDITS_PER_SEMESTER} tín chỉ.`
        );
      }
      return studentApi.reserveSlot(section.id);
    },
    onSuccess: () => {
      invalidateRegistrationData();
    },
  });

  // 4. Cancel Slot Reservation Mutation
  const cancelReservationMutation = useMutation<void, Error, number>({
    mutationFn: (sectionId: number) => studentApi.cancelSlotReservation(sectionId),
    onSuccess: () => {
      invalidateRegistrationData();
    },
  });

  // 5. 1-Tap Batch Enroll Held Reservations
  const batchEnrollMutation = useMutation<EnrollmentResult[], Error, void>({
    mutationFn: () => studentApi.batchEnrollReservations(),
    onSuccess: () => {
      invalidateRegistrationData();
    },
  });

  // Conflict detection helper
  const detectConflicts = (candidate: ClassSection): ClassSection[] => {
    return enrolledSections.filter(
      (enrolled) =>
        enrolled.id !== candidate.id &&
        isTimeOverlapping(
          candidate.dayOfWeek,
          candidate.startTime,
          candidate.endTime,
          enrolled.dayOfWeek,
          enrolled.startTime,
          enrolled.endTime
        )
    );
  };

  return {
    sections,
    reservations,
    enrolledSections,
    totalEnrolledCredits,
    isBelowMinCredits: totalEnrolledCredits > 0 && totalEnrolledCredits < MIN_RECOMMENDED_CREDITS,
    isAtMaxLimit: totalEnrolledCredits >= MAX_CREDITS_PER_SEMESTER,
    isLoading: sectionsQuery.isLoading || reservationsQuery.isLoading,
    isError: sectionsQuery.isError || reservationsQuery.isError,
    error: sectionsQuery.error || reservationsQuery.error,
    refetch: async () => {
      await Promise.all([sectionsQuery.refetch(), reservationsQuery.refetch()]);
    },
    isRefetching: sectionsQuery.isRefetching || reservationsQuery.isRefetching,
    enrollMutation,
    cancelEnrollMutation,
    reserveSlotMutation,
    cancelReservationMutation,
    batchEnrollMutation,
    detectConflicts,
  };
}
