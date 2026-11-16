/**
 * Student API Service Unit Tests
 */

import { studentApi } from '@/features/student/services/studentApi';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';

jest.mock('@/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  extractData: jest.fn((res) => res.data.data),
}));

describe('Student API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls GET /api/v1/student/dashboard and returns dashboard payload', async () => {
    const mockData = {
      stats: { registeredCourses: 5, weeklyClasses: 20, pendingRegistrations: 0, scheduleConflicts: 0 },
      upcomingClasses: [],
      semesterProgress: {
        creditsEarned: 84,
        totalRequiredCredits: 160,
        attendanceRate: 98.5,
        currentCgpa: 8.5,
        previousCgpa: 8.4,
        academicStanding: 'Xuất sắc',
      },
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockData, success: true },
    });

    const result = await studentApi.getDashboard();
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.STUDENT.DASHBOARD);
    expect(result).toEqual(mockData);
    expect(result.stats.registeredCourses).toBe(5);
  });

  it('calls GET /api/v1/student/timetable with optional semester param', async () => {
    const mockClasses = [
      {
        id: 101,
        courseCode: 'CS201',
        courseName: 'Data Structures',
        dayOfWeek: 'MON',
        startTime: '08:00',
        endTime: '10:00',
        roomName: 'A-201',
        lecturerName: 'TS. Nguyễn Văn A',
      },
    ];

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockClasses, success: true },
    });

    const result = await studentApi.getTimetable('2024-25_SEM2');
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.STUDENT.TIMETABLE, {
      params: { semester: '2024-25_SEM2' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].courseCode).toBe('CS201');
  });

  it('calls GET /api/v1/student/exams and returns exam schedules', async () => {
    const mockExams = [
      {
        id: 201,
        courseCode: 'CS301',
        courseName: 'Database Systems',
        examDate: '2025-06-20',
        startTime: '08:00:00',
        endTime: '09:30:00',
        roomName: 'LAB-2',
        examType: 'THI MÁY',
      },
    ];

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockExams, success: true },
    });

    const result = await studentApi.getExams();
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.STUDENT.EXAMS, { params: undefined });
    expect(result).toEqual(mockExams);
  });

  it('calls GET /api/v1/student/grades and returns grade list', async () => {
    const mockGrades = [
      {
        enrollmentId: 1,
        courseCode: 'CS201',
        courseName: 'Data Structures',
        credits: 3,
        semesterName: '2024-25_SEM2',
        attendanceScore: 10,
        midtermScore: 9,
        finalScore: 8.5,
        totalScore: 8.9,
        letterGrade: 'A',
        isLocked: true,
      },
    ];

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockGrades, success: true },
    });

    const result = await studentApi.getGrades();
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.STUDENT.GRADES);
    expect(result).toEqual(mockGrades);
  });

  it('calls GET /api/v1/student/tuition with semester and bank query params', async () => {
    const mockTuition = {
      id: 1,
      semesterName: '2024-25_SEM2',
      totalCredits: 15,
      creditUnitPrice: 100,
      facilityFee: 1000,
      totalAmount: 2500,
      paidAmount: 2500,
      remainingAmount: 0,
      excessAmount: 0,
      status: 'PAID',
      dueDate: '2026-12-01',
      courses: [],
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockTuition, success: true },
    });

    const result = await studentApi.getTuition('2024-25_SEM2', '970422');
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.STUDENT.TUITION, {
      params: { semester: '2024-25_SEM2', bank: '970422' },
    });
    expect(result.status).toBe('PAID');
  });
});
