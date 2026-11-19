/**
 * Student Domain API Service
 * Interacts with enrollment-service and auth-service endpoints via API Gateway.
 */

import { apiClient, extractData } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { ApiResponse } from '@/types';
import {
  StudentDashboardResponse,
  UpcomingClass,
  ExamSchedule,
  StudentGrade,
  StudentAcademicContext,
  Tuition,
  PayOSPaymentLinkResponse,
  StudentAttendanceHistoryResponse,
  AttendanceCheckInRequest,
  AttendanceCheckInResponse,
  ClassSection,
  SlotReservation,
  EnrollmentResult,
  CalendarSubscriptionInfo,
  AcademicAdvisorRequest,
  AcademicAdvisorResponse,
} from '../types';

export const studentApi = {
  /**
   * Fetch complete student dashboard metrics, upcoming classes, and semester progress.
   */
  async getDashboard(): Promise<StudentDashboardResponse> {
    const response = await apiClient.get<ApiResponse<StudentDashboardResponse>>(
      ENDPOINTS.STUDENT.DASHBOARD
    );
    return extractData(response);
  },

  /**
   * Fetch active and historical academic semesters from system.
   */
  async getSemesters(): Promise<Array<{ id: number; semesterCode: string; semesterName: string; isActive: boolean; isRegistrationOpen?: boolean }>> {
    const response = await apiClient.get<ApiResponse<Array<{ id: number; semesterCode: string; semesterName: string; isActive: boolean; isRegistrationOpen?: boolean }>>>(
      '/api/v1/semesters'
    );
    return extractData(response);
  },

  /**
   * Fetch student timetable for the current or specified semester.
   */
  async getTimetable(semester?: string): Promise<UpcomingClass[]> {
    const params = semester ? { semester } : undefined;
    const response = await apiClient.get<ApiResponse<UpcomingClass[]>>(
      ENDPOINTS.STUDENT.TIMETABLE,
      { params }
    );
    return extractData(response);
  },

  /**
   * Fetch personal examination schedule for the current or specified semester.
   */
  async getExams(semester?: string): Promise<ExamSchedule[]> {
    const params = semester ? { semester } : undefined;
    const response = await apiClient.get<ApiResponse<ExamSchedule[]>>(
      ENDPOINTS.STUDENT.EXAMS,
      { params }
    );
    return extractData(response);
  },

  /**
   * Fetch cumulative and semester grades for all enrolled courses.
   */
  async getGrades(): Promise<StudentGrade[]> {
    const response = await apiClient.get<ApiResponse<StudentGrade[]>>(
      ENDPOINTS.STUDENT.GRADES
    );
    return extractData(response);
  },

  /**
   * Fetch student academic context including CPA/GPA, credits, and standing.
   */
  async getAcademicContext(): Promise<StudentAcademicContext> {
    const response = await apiClient.get<ApiResponse<StudentAcademicContext>>(
      ENDPOINTS.STUDENT.ACADEMIC_CONTEXT
    );
    return extractData(response);
  },

  /**
   * Fetch tuition balance, invoice breakdown, and VietQR payment information.
   */
  async getTuition(semester?: string, bank?: string): Promise<Tuition> {
    const params: Record<string, string> = {};
    if (semester) params.semester = semester;
    if (bank) params.bank = bank;

    const response = await apiClient.get<ApiResponse<Tuition>>(
      ENDPOINTS.STUDENT.TUITION,
      { params: Object.keys(params).length > 0 ? params : undefined }
    );
    return extractData(response);
  },

  /**
   * Create PayOS online checkout link & dynamic QR payment code.
   */
  async createPayOSPaymentLink(params?: {
    semester?: string;
    returnUrl?: string;
    cancelUrl?: string;
  }): Promise<PayOSPaymentLinkResponse> {
    const response = await apiClient.post<ApiResponse<PayOSPaymentLinkResponse>>(
      ENDPOINTS.STUDENT.PAYOS_CREATE_PAYMENT,
      params
    );
    return extractData(response);
  },

  /**
   * Sync and verify payment status with backend (Backend is the authoritative source).
   */
  async checkPayOSStatus(orderCode?: number, semester?: string): Promise<Tuition> {
    const params: Record<string, any> = {};
    if (orderCode) params.orderCode = orderCode;
    if (semester) params.semester = semester;

    const response = await apiClient.get<ApiResponse<Tuition>>(
      '/api/v1/student/tuition/payos/status',
      { params }
    );
    return extractData(response);
  },

  /**
   * Fetch attendance check-in history for authenticated student.
   * Filters by sectionId, semesterName, and supports pagination.
   */
  async getAttendanceHistory(params?: {
    sectionId?: number;
    semesterName?: string;
    page?: number;
    size?: number;
  }): Promise<StudentAttendanceHistoryResponse> {
    const response = await apiClient.get<ApiResponse<StudentAttendanceHistoryResponse>>(
      ENDPOINTS.STUDENT.ATTENDANCE_HISTORY,
      { params }
    );
    return extractData(response);
  },

  /**
   * Submit QR attendance check-in for authenticated student.
   * Sends dynamic TOTP token, device information, and client timestamp.
   */
  async checkInAttendance(request: AttendanceCheckInRequest): Promise<AttendanceCheckInResponse> {
    const response = await apiClient.post<ApiResponse<AttendanceCheckInResponse>>(
      ENDPOINTS.STUDENT.ATTENDANCE_CHECK_IN,
      request
    );
    return extractData(response);
  },

  /**
   * Fetch available class sections for registration (FR-03, F-05, EDUP-204).
   */
  async getAvailableSections(params?: {
    semester?: string;
    keyword?: string;
  }): Promise<ClassSection[]> {
    const response = await apiClient.get<ApiResponse<ClassSection[]>>(
      '/api/v1/student/class-sections',
      { params }
    );
    return extractData(response);
  },

  /**
   * Reserve a 5-minute slot for a class section (EDUP-203, F-06).
   */
  async reserveSlot(sectionId: number): Promise<SlotReservation> {
    const response = await apiClient.post<ApiResponse<SlotReservation>>(
      `/api/v1/student/class-sections/${sectionId}/reserve`
    );
    return extractData(response);
  },

  /**
   * Cancel slot reservation for a class section.
   */
  async cancelSlotReservation(sectionId: number): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(
      `/api/v1/student/class-sections/${sectionId}/reserve`
    );
  },

  /**
   * Fetch all active slot reservations for the authenticated student.
   */
  async getMyReservations(): Promise<SlotReservation[]> {
    const response = await apiClient.get<ApiResponse<SlotReservation[]>>(
      '/api/v1/student/class-sections/my-reservations'
    );
    return extractData(response);
  },

  /**
   * 1-Chạm: Batch enroll all currently held slot reservations.
   */
  async batchEnrollReservations(): Promise<EnrollmentResult[]> {
    const response = await apiClient.post<ApiResponse<EnrollmentResult[]>>(
      '/api/v1/student/class-sections/batch-enroll-reservations'
    );
    return extractData(response);
  },

  /**
   * Directly enroll into a class section (FR-03).
   */
  async enrollSection(classSectionId: number): Promise<EnrollmentResult> {
    const response = await apiClient.post<ApiResponse<EnrollmentResult>>(
      '/api/v1/student/enrollments',
      { classSectionId }
    );
    return extractData(response);
  },

  /**
   * Cancel an enrolled class section (FR-03).
   */
  async cancelEnrollment(enrollmentId: number): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(
      `/api/v1/student/enrollments/${enrollmentId}`
    );
  },

  /**
   * Fetch calendar subscription feed URLs and integration instructions (TASK ST-06).
   */
  async getCalendarSubscriptionInfo(): Promise<CalendarSubscriptionInfo> {
    const response = await apiClient.get<ApiResponse<CalendarSubscriptionInfo>>(
      '/api/v1/student/calendar/subscription-info'
    );
    return extractData(response);
  },

  /**
   * Fetch raw ICS calendar file export content for manual import.
   */
  async exportCalendarIcs(semester?: string): Promise<string> {
    const response = await apiClient.get<string>(
      '/api/v1/student/calendar/export.ics',
      {
        params: semester ? { semester } : undefined,
        responseType: 'text',
      }
    );
    return response.data;
  },

  /**
   * Send question and conversation history to AI Academic Advisor (TASK ST-07).
   */
  async askAcademicAdvisor(request: AcademicAdvisorRequest): Promise<AcademicAdvisorResponse> {
    const response = await apiClient.post<ApiResponse<AcademicAdvisorResponse>>(
      '/api/v1/ai/academic-advisor',
      request
    );
    return extractData(response);
  },
};
