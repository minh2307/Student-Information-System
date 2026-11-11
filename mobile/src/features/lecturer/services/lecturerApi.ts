/**
 * Lecturer API Service
 * Centralized API integration for Lecturer domain functions.
 */

import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { ApiResponse } from '@/types';
import {
  AttendanceSession,
  AttendanceUpdateRequest,
  DispatchWarningRequest,
  DispatchWarningResponse,
  DynamicQrResponse,
  EarlyWarningSummary,
  GradeUpdateRequest,
  LecturerClassSection,
  LockGradesResponse,
  StudentGrade,
  StudentRisk,
} from '../types';

export const lecturerApi = {
  /**
   * GET /api/v1/lecturer/classes?semester={semesterName}
   * Retrieve all assigned class sections for current logged-in lecturer.
   */
  getMyClasses: async (semester?: string): Promise<LecturerClassSection[]> => {
    const params = semester ? { semester } : undefined;
    const response = await apiClient.get<ApiResponse<LecturerClassSection[]>>(
      ENDPOINTS.LECTURER.CLASSES,
      { params }
    );
    return response.data?.data ?? [];
  },

  /**
   * GET /api/v1/lecturer/classes/{sectionId}/students
   * Retrieve registered students and their grades for a specific section.
   */
  getStudentsOfSection: async (sectionId: number): Promise<StudentGrade[]> => {
    const response = await apiClient.get<ApiResponse<StudentGrade[]>>(
      ENDPOINTS.LECTURER.CLASS_STUDENTS(sectionId)
    );
    return response.data?.data ?? [];
  },

  /**
   * PUT /api/v1/lecturer/enrollments/{enrollmentId}/attendance
   * Update attendance rate for a student in a class.
   */
  updateAttendance: async (
    enrollmentId: number,
    request: AttendanceUpdateRequest
  ): Promise<StudentGrade> => {
    const response = await apiClient.put<ApiResponse<StudentGrade>>(
      ENDPOINTS.LECTURER.UPDATE_ATTENDANCE(enrollmentId),
      request
    );
    return response.data.data;
  },

  /**
   * PUT /api/v1/lecturer/grades/{enrollmentId}
   * Update attendance, midterm, or final scores.
   */
  updateGrade: async (
    enrollmentId: number,
    request: GradeUpdateRequest
  ): Promise<StudentGrade> => {
    const response = await apiClient.put<ApiResponse<StudentGrade>>(
      ENDPOINTS.LECTURER.UPDATE_GRADE(enrollmentId),
      request
    );
    return response.data.data;
  },

  /**
   * POST /api/v1/lecturer/classes/{sectionId}/lock-grades
   * Finalize and lock all student grades for a section.
   */
  lockGrades: async (sectionId: number): Promise<LockGradesResponse> => {
    const response = await apiClient.post<ApiResponse<LockGradesResponse>>(
      ENDPOINTS.LECTURER.LOCK_GRADES(sectionId)
    );
    return response.data.data;
  },

  /**
   * POST /api/v1/lecturer/classes/{sectionId}/attendance/session
   * Start a new dynamic QR attendance session for a class.
   */
  startAttendanceSession: async (
    sectionId: number,
    sessionName?: string
  ): Promise<AttendanceSession> => {
    const payload = sessionName ? { sessionName } : {};
    const response = await apiClient.post<ApiResponse<AttendanceSession>>(
      ENDPOINTS.LECTURER.START_ATTENDANCE_SESSION(sectionId),
      payload
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/lecturer/classes/{sectionId}/attendance/session
   * Retrieve active session details and real-time scanned students.
   */
  getCurrentAttendanceSession: async (sectionId: number): Promise<AttendanceSession> => {
    const response = await apiClient.get<ApiResponse<AttendanceSession>>(
      ENDPOINTS.LECTURER.GET_ATTENDANCE_SESSION(sectionId)
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/lecturer/classes/{sectionId}/attendance/qr-code
   * Retrieve rotating TOTP dynamic QR code (changes every 15s).
   */
  getRotatingQrCode: async (sectionId: number): Promise<DynamicQrResponse> => {
    const response = await apiClient.get<ApiResponse<DynamicQrResponse>>(
      ENDPOINTS.LECTURER.GET_ROTATING_QR(sectionId)
    );
    return response.data.data;
  },

  /**
   * POST /api/v1/lecturer/classes/{sectionId}/attendance/close-session
   * Finalize and close the open attendance session.
   */
  closeAttendanceSession: async (sectionId: number): Promise<AttendanceSession> => {
    const response = await apiClient.post<ApiResponse<AttendanceSession>>(
      ENDPOINTS.LECTURER.CLOSE_ATTENDANCE_SESSION(sectionId)
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/lecturer/early-warnings/section/{sectionId}
   * Get academic early warning risk report for a class section.
   */
  getSectionRisks: async (sectionId: number): Promise<EarlyWarningSummary> => {
    const response = await apiClient.get<ApiResponse<EarlyWarningSummary>>(
      ENDPOINTS.LECTURER.EARLY_WARNING_SECTION(sectionId)
    );
    return response.data.data;
  },

  /**
   * POST /api/v1/lecturer/early-warnings/dispatch
   * Dispatch 1-touch early warnings to high-risk students.
   */
  dispatchWarnings: async (
    request: DispatchWarningRequest
  ): Promise<DispatchWarningResponse> => {
    const response = await apiClient.post<ApiResponse<DispatchWarningResponse>>(
      ENDPOINTS.LECTURER.DISPATCH_WARNINGS,
      request
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/lecturer/early-warnings/my-alerts
   * Self-risk alerts.
   */
  getMyAlerts: async (): Promise<StudentRisk[]> => {
    const response = await apiClient.get<ApiResponse<StudentRisk[]>>(
      ENDPOINTS.LECTURER.EARLY_WARNINGS
    );
    return response.data?.data ?? [];
  },
};
