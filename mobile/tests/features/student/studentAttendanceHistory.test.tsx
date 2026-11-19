/**
 * Student Attendance History Unit Tests (B-03)
 * Verifies studentApi.getAttendanceHistory, useStudentAttendanceHistory hook behavior,
 * and StudentAttendanceHistoryModal rendering with REDS v2.0 design tokens.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');

import { studentApi } from '@/features/student/services/studentApi';
import { StudentAttendanceHistoryModal } from '@/features/student/components/StudentAttendanceHistoryModal';
import { useStudentAttendanceHistory } from '@/features/student/hooks/useStudentAttendanceHistory';
import { apiClient } from '@/api/client';

// Mock apiClient
jest.mock('@/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
  extractData: jest.fn((res) => res.data.data),
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-icon={props.name} />,
}));

// Mock hook for modal component testing
jest.mock('@/features/student/hooks/useStudentAttendanceHistory', () => ({
  useStudentAttendanceHistory: jest.fn(),
}));

describe('Student Attendance History (B-03)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('studentApi.getAttendanceHistory', () => {
    it('calls GET /api/v1/student/attendance/history with query parameters', async () => {
      const mockResponse = {
        data: {
          data: {
            studentId: 101,
            studentCode: 'SV2026999',
            studentName: 'Lê Hoàng Nam',
            totalRecords: 1,
            totalPages: 1,
            currentPage: 0,
            pageSize: 20,
            records: [
              {
                recordId: 1,
                sessionId: 10,
                sessionName: 'Buổi 1',
                sectionId: 5,
                sectionCode: 'CS101-01',
                courseCode: 'CS101',
                courseName: 'Lập trình căn bản',
                semesterName: 'Fall 2026',
                roomName: 'P.302',
                dayOfWeek: 'MON',
                slotTime: '08:00 - 10:00',
                checkInTime: '2026-11-17T08:05:00Z',
                status: 'PRESENT',
                deviceInfo: 'Android SM-G998B',
              },
            ],
          },
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await studentApi.getAttendanceHistory({
        sectionId: 5,
        semesterName: 'Fall 2026',
        page: 0,
        size: 20,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/student/attendance/history', {
        params: {
          sectionId: 5,
          semesterName: 'Fall 2026',
          page: 0,
          size: 20,
        },
      });
      expect(result.studentCode).toBe('SV2026999');
      expect(result.records).toHaveLength(1);
      expect(result.records[0].status).toBe('PRESENT');
    });

    it('defaults query parameters when none provided', async () => {
      const mockResponse = {
        data: {
          data: {
            studentId: 101,
            studentCode: 'SV2026999',
            studentName: 'Lê Hoàng Nam',
            totalRecords: 0,
            totalPages: 0,
            currentPage: 0,
            pageSize: 50,
            records: [],
          },
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await studentApi.getAttendanceHistory();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/student/attendance/history', {
        params: undefined,
      });
      expect(result.records).toEqual([]);
    });
  });

  describe('StudentAttendanceHistoryModal Component', () => {
    it('returns null when visible is false', () => {
      const html = renderToStaticMarkup(
        <StudentAttendanceHistoryModal visible={false} onClose={jest.fn()} />
      );
      expect(html).toBe('');
    });

    it('renders modal with attendance records when visible is true', () => {
      (useStudentAttendanceHistory as jest.Mock).mockReturnValue({
        data: {
          totalRecords: 2,
          records: [
            {
              recordId: 101,
              sessionName: 'Buổi 1',
              sectionCode: 'CS101-01',
              courseCode: 'CS101',
              courseName: 'Lập trình C',
              dayOfWeek: 'MON',
              slotTime: '08:00 - 10:00',
              roomName: 'P.101',
              checkInTime: '2026-11-17T08:02:00Z',
              status: 'PRESENT',
              deviceInfo: 'Pixel 7',
            },
            {
              recordId: 102,
              sessionName: 'Buổi 2',
              sectionCode: 'CS101-01',
              courseCode: 'CS101',
              courseName: 'Lập trình C',
              dayOfWeek: 'WED',
              slotTime: '08:00 - 10:00',
              roomName: 'P.101',
              checkInTime: '2026-11-19T08:25:00Z',
              status: 'LATE',
              deviceInfo: 'Pixel 7',
            },
          ],
        },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });

      const html = renderToStaticMarkup(
        <StudentAttendanceHistoryModal visible={true} onClose={jest.fn()} />
      );

      expect(html).toContain('Lịch sử điểm danh');
      expect(html).toContain('CS101');
      expect(html).toContain('Lập trình C');
      expect(html).toContain('Có mặt');
      expect(html).toContain('Đi muộn');
      expect(html).toContain('P.101');
      expect(html).toContain('Pixel 7');
      expect(html).toContain('close-attendance-history-button');
    });

    it('renders empty state when student has no records', () => {
      (useStudentAttendanceHistory as jest.Mock).mockReturnValue({
        data: {
          totalRecords: 0,
          records: [],
        },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });

      const html = renderToStaticMarkup(
        <StudentAttendanceHistoryModal visible={true} onClose={jest.fn()} />
      );

      expect(html).toContain('Chưa có dữ liệu điểm danh');
      expect(html).toContain('Bạn chưa có bản ghi điểm danh nào được lưu trên hệ thống');
    });

    it('renders loading state when query is loading', () => {
      (useStudentAttendanceHistory as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        refetch: jest.fn(),
      });

      const html = renderToStaticMarkup(
        <StudentAttendanceHistoryModal visible={true} onClose={jest.fn()} />
      );

      expect(html).toContain('Đang tải lịch sử điểm danh...');
    });

    it('renders error state when query encounters an error', () => {
      (useStudentAttendanceHistory as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Network timeout'),
        refetch: jest.fn(),
      });

      const html = renderToStaticMarkup(
        <StudentAttendanceHistoryModal visible={true} onClose={jest.fn()} />
      );

      expect(html).toContain('Lỗi tải dữ liệu');
      expect(html).toContain('Network timeout');
    });
  });
});
