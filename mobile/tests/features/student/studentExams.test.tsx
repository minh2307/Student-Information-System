/**
 * Student Examination Schedule Unit & Integration Tests (TASK ST-03)
 * Validates nearest upcoming exam banner, venue & room information,
 * status filtering (Upcoming/All/Past), countdown badges, and empty/error states.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import ExamsScreen from '@/app/(student)/exams';
import { useStudentExams } from '@/features/student/hooks';
import { ExamSchedule } from '@/features/student/types';

jest.mock('@/features/student/hooks', () => ({
  useStudentExams: jest.fn(),
}));

describe('Student Examination Schedule Subsystem (TASK ST-03)', () => {
  const mockExams: ExamSchedule[] = [
    {
      id: 10,
      courseCode: 'CS102',
      courseName: 'Cấu trúc dữ liệu và giải thuật',
      sectionCode: 'CS102-01',
      credits: 4,
      examDate: '2026-12-15',
      startTime: '07:30',
      endTime: '09:00',
      roomName: 'Phòng Lab 301',
      examType: 'Thực hành máy',
      notes: 'Sinh viên có mặt trước 15 phút, xuất trình Thẻ SV.',
      lecturerName: 'TS. Lê Văn B',
      semesterName: 'Học kỳ 1 2026-2027',
    },
    {
      id: 11,
      courseCode: 'CS204',
      courseName: 'Hệ điều hành nâng cao',
      sectionCode: 'CS204-02',
      credits: 3,
      examDate: '2026-12-22',
      startTime: '13:30',
      endTime: '15:00',
      roomName: 'P.205 - Nhà C',
      examType: 'Tự luận',
      notes: 'Được sử dụng 01 tờ tài liệu A4 viết tay.',
      lecturerName: 'ThS. Hoàng Thị C',
      semesterName: 'Học kỳ 1 2026-2027',
    },
    {
      id: 12,
      courseCode: 'MATH101',
      courseName: 'Đại số tuyến tính',
      sectionCode: 'MATH101-01',
      credits: 3,
      examDate: '2025-06-10', // Past exam
      startTime: '08:00',
      endTime: '09:30',
      roomName: 'P.101 - Nhà A',
      examType: 'Trắc nghiệm',
      lecturerName: 'TS. Trần Văn D',
      semesterName: 'Học kỳ 2 2024-2025',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useStudentExams as jest.Mock).mockReturnValue({
      data: mockExams,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });
  });

  // ── 1. Hero Upcoming Exam Banner ──
  describe('Group 1: Nearest Upcoming Exam Banner', () => {
    it('renders nearest upcoming exam highlight banner with room and time', () => {
      const html = renderToStaticMarkup(<ExamsScreen />);

      expect(html).toContain('exams-hero-banner');
      expect(html).toContain('Môn thi sắp diễn ra');
      expect(html).toContain('Cấu trúc dữ liệu và giải thuật');
      expect(html).toContain('CS102');
      expect(html).toContain('Phòng Lab 301');
      expect(html).toContain('07:30 - 09:00');
    });
  });

  // ── 2. Exam List & Venue Grid Details ──
  describe('Group 2: Exam List & Venue Details', () => {
    it('renders all upcoming exams with course codes and titles', () => {
      const html = renderToStaticMarkup(<ExamsScreen />);

      expect(html).toContain('exam-card-CS102');
      expect(html).toContain('exam-card-CS204');
      expect(html).toContain('Hệ điều hành nâng cao');
      expect(html).toContain('P.205 - Nhà C');
      expect(html).toContain('Tự luận');
      expect(html).toContain('ThS. Hoàng Thị C');
    });

    it('renders supervisor name and exam notes/instructions when provided', () => {
      const html = renderToStaticMarkup(<ExamsScreen />);

      expect(html).toContain('Cán bộ coi thi: TS. Lê Văn B');
      expect(html).toContain('Sinh viên có mặt trước 15 phút, xuất trình Thẻ SV.');
      expect(html).toContain('Được sử dụng 01 tờ tài liệu A4 viết tay.');
    });
  });

  // ── 3. Status Tabs & Semester Filtering ──
  describe('Group 3: Status Tabs & Semester Filtering', () => {
    it('renders status tab controls (Sắp thi, Tất cả, Đã kết thúc)', () => {
      const html = renderToStaticMarkup(<ExamsScreen />);

      expect(html).toContain('exams-status-tabs');
      expect(html).toContain('exams-tab-upcoming');
      expect(html).toContain('exams-tab-all');
      expect(html).toContain('exams-tab-past');
    });

    it('renders dynamic semester filter pills', () => {
      const html = renderToStaticMarkup(<ExamsScreen />);

      expect(html).toContain('exams-semester-all');
      expect(html).toContain('Học kỳ 1 2026-2027');
      expect(html).toContain('Học kỳ 2 2024-2025');
    });
  });

  // ── 4. Loading, Error, and Empty States ──
  describe('Group 4: Loading, Error, and Empty States', () => {
    it('renders loading indicator while fetching exam schedules', () => {
      (useStudentExams as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderToStaticMarkup(<ExamsScreen />);
      expect(html).toContain('exams-loading');
      expect(html).toContain('Đang tải lịch thi học kỳ...');
    });

    it('renders error view with retry button when query fails', () => {
      (useStudentExams as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Không thể kết nối đến máy chủ lịch thi'),
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderToStaticMarkup(<ExamsScreen />);
      expect(html).toContain('exams-error');
      expect(html).toContain('Không thể tải lịch thi');
      expect(html).toContain('Không thể kết nối đến máy chủ lịch thi');
      expect(html).toContain('Thử lại');
    });

    it('renders empty state when no exams match criteria', () => {
      (useStudentExams as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderToStaticMarkup(<ExamsScreen />);
      expect(html).toContain('exams-empty');
      expect(html).toContain('Không có lịch thi');
    });
  });
});
