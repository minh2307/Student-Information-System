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
  Tuition,
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
};
