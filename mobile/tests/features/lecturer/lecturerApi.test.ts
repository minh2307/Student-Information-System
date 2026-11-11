/**
 * Lecturer API Service Unit Tests
 * Validates endpoints, parameters, request/response mapping, and error handling.
 */

import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { lecturerApi } from '@/features/lecturer/services/lecturerApi';

jest.mock('@/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Lecturer API Service (lecturerApi)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyClasses', () => {
    it('calls GET /api/v1/lecturer/classes without semester param when omitted', async () => {
      const mockClasses = [
        {
          sectionId: 1,
          sectionCode: 'CS201-2025-01',
          courseName: 'Data Structures and Algorithms',
          courseCode: 'CS201',
          credits: 3,
          semesterName: '2024-25_SEM2',
          dayOfWeek: 'MON',
          startTime: '09:00:00',
          endTime: '10:30:00',
          roomName: 'Room A-204',
          currentEnrolled: 2,
          maxCapacity: 40,
          status: 'OPEN',
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          status: 200,
          message: 'Danh sách lớp học phần',
          data: mockClasses,
          success: true,
        },
      });

      const result = await lecturerApi.getMyClasses();
      expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.LECTURER.CLASSES, {
        params: undefined,
      });
      expect(result).toEqual(mockClasses);
    });

    it('passes semester query param when provided', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [] },
      });

      await lecturerApi.getMyClasses('2024-25_SEM2');
      expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.LECTURER.CLASSES, {
        params: { semester: '2024-25_SEM2' },
      });
    });
  });

  describe('getStudentsOfSection', () => {
    it('calls GET /api/v1/lecturer/classes/{sectionId}/students and returns student roster', async () => {
      const mockStudents = [
        {
          enrollmentId: 1,
          studentCode: 'SV2024001',
          fullName: 'Nguyễn Văn C',
          attendanceRate: 95.0,
          attendanceScore: 9.5,
          midtermScore: 8.5,
          finalScore: 8.8,
          totalScore: 8.78,
          letterGrade: 'A',
          isLocked: false,
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          status: 200,
          message: 'Danh sách sinh viên và điểm',
          data: mockStudents,
          success: true,
        },
      });

      const result = await lecturerApi.getStudentsOfSection(1);
      expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.LECTURER.CLASS_STUDENTS(1));
      expect(result).toEqual(mockStudents);
    });
  });

  describe('updateAttendance', () => {
    it('calls PUT /api/v1/lecturer/enrollments/{enrollmentId}/attendance with rate', async () => {
      const mockUpdated = {
        enrollmentId: 1,
        studentCode: 'SV2024001',
        fullName: 'Nguyễn Văn C',
        attendanceRate: 92.5,
        attendanceScore: 9.25,
        midtermScore: 8.5,
        finalScore: 8.8,
        totalScore: 8.78,
        letterGrade: 'A',
        isLocked: false,
      };

      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: { data: mockUpdated },
      });

      const result = await lecturerApi.updateAttendance(1, { attendanceRate: 92.5 });
      expect(apiClient.put).toHaveBeenCalledWith(
        ENDPOINTS.LECTURER.UPDATE_ATTENDANCE(1),
        { attendanceRate: 92.5 }
      );
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('updateGrade', () => {
    it('calls PUT /api/v1/lecturer/grades/{enrollmentId} with grade components', async () => {
      const mockUpdated = {
        enrollmentId: 1,
        studentCode: 'SV2024001',
        fullName: 'Nguyễn Văn C',
        attendanceRate: 95.0,
        attendanceScore: 9.5,
        midtermScore: 9.0,
        finalScore: 9.0,
        totalScore: 9.1,
        letterGrade: 'A+',
        isLocked: false,
      };

      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: { data: mockUpdated },
      });

      const result = await lecturerApi.updateGrade(1, {
        midtermScore: 9.0,
        finalScore: 9.0,
      });

      expect(apiClient.put).toHaveBeenCalledWith(
        ENDPOINTS.LECTURER.UPDATE_GRADE(1),
        { midtermScore: 9.0, finalScore: 9.0 }
      );
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('lockGrades', () => {
    it('calls POST /api/v1/lecturer/classes/{sectionId}/lock-grades', async () => {
      const mockLockResponse = {
        sectionId: 1,
        lockedCount: 2,
        locked: true,
        message: 'Đã chốt điểm thành công cho 2 sinh viên.',
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: mockLockResponse },
      });

      const result = await lecturerApi.lockGrades(1);
      expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.LECTURER.LOCK_GRADES(1));
      expect(result).toEqual(mockLockResponse);
    });
  });

  describe('Attendance Session Lifecycle', () => {
    it('startAttendanceSession calls POST session endpoint with sessionName', async () => {
      const mockSession = {
        sessionId: 10,
        sectionId: 1,
        sectionCode: 'CS201-2025-01',
        courseName: 'Data Structures and Algorithms',
        sessionName: 'Buổi 1',
        status: 'ACTIVE',
        stepSeconds: 15,
        totalAttendees: 0,
        createdAt: '2026-11-11T05:30:00',
        closedAt: null,
        records: [],
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: mockSession },
      });

      const result = await lecturerApi.startAttendanceSession(1, 'Buổi 1');
      expect(apiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.LECTURER.START_ATTENDANCE_SESSION(1),
        { sessionName: 'Buổi 1' }
      );
      expect(result).toEqual(mockSession);
    });

    it('getCurrentAttendanceSession calls GET session endpoint', async () => {
      const mockSession = {
        sessionId: 10,
        sectionId: 1,
        sectionCode: 'CS201-2025-01',
        courseName: 'Data Structures and Algorithms',
        sessionName: 'Buổi 1',
        status: 'ACTIVE',
        stepSeconds: 15,
        totalAttendees: 1,
        createdAt: '2026-11-11T05:30:00',
        closedAt: null,
        records: [
          {
            recordId: 1,
            studentCode: 'SV2024001',
            studentName: 'Nguyễn Văn C',
            checkInTime: '2026-11-11T05:31:00',
            deviceInfo: 'Android Mobile',
          },
        ],
      };

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: mockSession },
      });

      const result = await lecturerApi.getCurrentAttendanceSession(1);
      expect(apiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.LECTURER.GET_ATTENDANCE_SESSION(1)
      );
      expect(result).toEqual(mockSession);
    });

    it('getRotatingQrCode calls GET qr-code endpoint', async () => {
      const mockQr = {
        sessionId: 10,
        sectionId: 1,
        qrToken: '10.1.11962495.c3ab897...',
        qrImageBase64: 'data:image/png;base64,iVBORw0KGgo...',
        stepSeconds: 15,
        remainingSeconds: 14,
        expiresAtEpochMs: 1794374355000,
      };

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: mockQr },
      });

      const result = await lecturerApi.getRotatingQrCode(1);
      expect(apiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.LECTURER.GET_ROTATING_QR(1)
      );
      expect(result).toEqual(mockQr);
    });

    it('closeAttendanceSession calls POST close-session endpoint', async () => {
      const mockClosedSession = {
        sessionId: 10,
        sectionId: 1,
        status: 'CLOSED',
        closedAt: '2026-11-11T05:45:00',
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: mockClosedSession },
      });

      const result = await lecturerApi.closeAttendanceSession(1);
      expect(apiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.LECTURER.CLOSE_ATTENDANCE_SESSION(1)
      );
      expect(result).toEqual(mockClosedSession);
    });
  });

  describe('Early Warnings', () => {
    it('getSectionRisks calls GET /api/v1/lecturer/early-warnings/section/{sectionId}', async () => {
      const mockSummary = {
        sectionId: 1,
        sectionCode: 'CS201-2025-01',
        courseName: 'Data Structures and Algorithms',
        totalStudents: 2,
        criticalCount: 2,
        warningCount: 0,
        safeCount: 0,
        attendanceRiskCount: 2,
        gradeRiskCount: 0,
        students: [],
      };

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: mockSummary },
      });

      const result = await lecturerApi.getSectionRisks(1);
      expect(apiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.LECTURER.EARLY_WARNING_SECTION(1)
      );
      expect(result).toEqual(mockSummary);
    });

    it('dispatchWarnings calls POST /api/v1/lecturer/early-warnings/dispatch', async () => {
      const mockDispatchRes = {
        sentCount: 2,
        status: 'SENT',
        dispatchedAt: '2026-11-11T05:40:00',
        recipientNames: ['Nguyễn Văn C', 'Lê Thị D'],
        message: 'Đã phát 2 cảnh báo học vụ.',
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: mockDispatchRes },
      });

      const result = await lecturerApi.dispatchWarnings({
        sectionId: 1,
        studentIds: [1, 2],
        customMessage: 'Nhắc nhở chuyên cần',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.LECTURER.DISPATCH_WARNINGS,
        {
          sectionId: 1,
          studentIds: [1, 2],
          customMessage: 'Nhắc nhở chuyên cần',
        }
      );
      expect(result).toEqual(mockDispatchRes);
    });

    it('getMyAlerts calls GET /api/v1/lecturer/early-warnings/my-alerts', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [] },
      });

      const result = await lecturerApi.getMyAlerts();
      expect(apiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.LECTURER.EARLY_WARNINGS
      );
      expect(result).toEqual([]);
    });
  });
});
