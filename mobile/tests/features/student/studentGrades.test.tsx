/**
 * Student Grades & Academic Performance Unit & Integration Tests (TASK ST-02)
 * Validates GPA/CPA summary, component score matrix, semester filtering,
 * letter grade rendering, locked/pending indicators, and error/empty states.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import GradesScreen from '@/app/(student)/grades';
import { useStudentGrades, useStudentAcademicContext } from '@/features/student/hooks';
import { StudentGrade, StudentAcademicContext } from '@/features/student/types';

jest.mock('@/features/student/hooks', () => ({
  useStudentGrades: jest.fn(),
  useStudentAcademicContext: jest.fn(),
}));

describe('Student Grades & Academic Performance (TASK ST-02)', () => {
  const mockAcademicContext: StudentAcademicContext = {
    studentCode: 'SV2026001',
    fullName: 'Nguyễn Văn A',
    major: 'Công nghệ thông tin',
    currentSemester: 5,
    completedCredits: 85,
    registeredCredits: 18,
    totalRequiredCredits: 130,
    currentCgpa: 3.42,
    previousCgpa: 3.38,
    academicStanding: 'Giỏi',
    attendanceRate: 94.5,
  };

  const mockGrades: StudentGrade[] = [
    {
      enrollmentId: 1,
      courseCode: 'CS101',
      courseName: 'Lập trình Java căn bản',
      credits: 3,
      semesterName: 'Học kỳ 1 2026-2027',
      attendanceScore: 9.5,
      midtermScore: 8.5,
      finalScore: 9.0,
      totalScore: 8.9,
      letterGrade: 'A',
      isLocked: true,
    },
    {
      enrollmentId: 2,
      courseCode: 'CS201',
      courseName: 'Cấu trúc dữ liệu và giải thuật',
      credits: 4,
      semesterName: 'Học kỳ 1 2026-2027',
      attendanceScore: 8.0,
      midtermScore: 7.5,
      finalScore: 8.0,
      totalScore: 7.8,
      letterGrade: 'B',
      isLocked: true,
    },
    {
      enrollmentId: 3,
      courseCode: 'MATH101',
      courseName: 'Giải tích 1',
      credits: 3,
      semesterName: 'Học kỳ 2 2025-2026',
      attendanceScore: 5.0,
      midtermScore: 4.0,
      finalScore: 3.5,
      totalScore: 3.8,
      letterGrade: 'F',
      isLocked: true,
    },
    {
      enrollmentId: 4,
      courseCode: 'ENG201',
      courseName: 'Tiếng Anh chuyên ngành',
      credits: 2,
      semesterName: 'Học kỳ 1 2026-2027',
      attendanceScore: 9.0,
      midtermScore: 8.0,
      finalScore: null,
      totalScore: null,
      letterGrade: null,
      isLocked: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useStudentAcademicContext as jest.Mock).mockReturnValue({
      data: mockAcademicContext,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    (useStudentGrades as jest.Mock).mockReturnValue({
      data: mockGrades,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });
  });

  // ── 1. KPI Summary Card ──
  describe('Group 1: Academic Standing & CPA/GPA KPI Summary', () => {
    it('renders CPA, completed credits, and academic standing badge', () => {
      const html = renderToStaticMarkup(<GradesScreen />);

      expect(html).toContain('grades-summary-card');
      expect(html).toContain('Kết quả học tập tích lũy');
      expect(html).toContain('Công nghệ thông tin');
      expect(html).toContain('Giỏi');
      expect(html).toContain('3.42');
      expect(html).toContain('85');
      expect(html).toContain('130');
    });

    it('calculates course pass rate percentage correctly', () => {
      const html = renderToStaticMarkup(<GradesScreen />);
      // 2 passed (CS101, CS201), 1 failed (MATH101), 1 pending (ENG201) -> 2/4 = 50%
      expect(html).toContain('50%');
    });
  });

  // ── 2. Semester Filter Tabs ──
  describe('Group 2: Semester Filtering', () => {
    it('renders unique semester filter tabs dynamically extracted from grades', () => {
      const html = renderToStaticMarkup(<GradesScreen />);

      expect(html).toContain('semester-filter-section');
      expect(html).toContain('semester-filter-all');
      expect(html).toContain('Học kỳ 1 2026-2027');
      expect(html).toContain('Học kỳ 2 2025-2026');
    });
  });

  // ── 3. Course Grades Breakdown ──
  describe('Group 3: Course Grades & Component Score Matrix', () => {
    it('renders course codes, names, and credits', () => {
      const html = renderToStaticMarkup(<GradesScreen />);

      expect(html).toContain('CS101');
      expect(html).toContain('Lập trình Java căn bản');
      expect(html).toContain('CS201');
      expect(html).toContain('Cấu trúc dữ liệu và giải thuật');
      expect(html).toContain('MATH101');
      expect(html).toContain('Giải tích 1');
      expect(html).toContain('ENG201');
      expect(html).toContain('Tiếng Anh chuyên ngành');
    });

    it('renders full component score breakdown: chuyên cần, giữa kỳ, cuối kỳ, tổng kết', () => {
      const html = renderToStaticMarkup(<GradesScreen />);

      expect(html).toContain('Chuyên cần');
      expect(html).toContain('Giữa kỳ');
      expect(html).toContain('Cuối kỳ');
      expect(html).toContain('Tổng kết');

      // CS101 scores
      expect(html).toContain('9.5');
      expect(html).toContain('8.5');
      expect(html).toContain('9.0');
      expect(html).toContain('8.9');
    });

    it('renders correct letter grade badges with appropriate status', () => {
      const html = renderToStaticMarkup(<GradesScreen />);

      // CS101: A -> ĐẠT
      expect(html).toContain('>A<');
      expect(html).toContain('ĐẠT');

      // MATH101: F -> HỌC LẠI
      expect(html).toContain('>F<');
      expect(html).toContain('HỌC LẠI');

      // ENG201: null -> CHỜ ĐIỂM
      expect(html).toContain('CHỜ ĐIỂM');
    });

    it('renders pending review notice for unlocked grades (isLocked = false)', () => {
      const html = renderToStaticMarkup(<GradesScreen />);

      expect(html).toContain('Điểm đang trong thời gian phúc khảo / chưa khóa chính thức.');
    });
  });

  // ── 4. Loading, Error, and Empty States ──
  describe('Group 4: Loading, Error, and Empty States', () => {
    it('renders loading indicator when fetching grades', () => {
      (useStudentGrades as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderToStaticMarkup(<GradesScreen />);
      expect(html).toContain('grades-loading');
      expect(html).toContain('Đang tải bảng điểm học vụ...');
    });

    it('renders error view with retry button when query fails', () => {
      (useStudentGrades as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Mất kết nối tới API Gateway'),
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderToStaticMarkup(<GradesScreen />);
      expect(html).toContain('grades-error');
      expect(html).toContain('Không thể tải bảng điểm');
      expect(html).toContain('Mất kết nối tới API Gateway');
      expect(html).toContain('Thử lại');
    });

    it('renders empty state when student has no grades', () => {
      (useStudentGrades as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
        isRefetching: false,
      });

      const html = renderToStaticMarkup(<GradesScreen />);
      expect(html).toContain('grades-empty');
      expect(html).toContain('Chưa có điểm học phần');
    });
  });
});
