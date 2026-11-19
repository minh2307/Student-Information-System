/**
 * Student Course Registration Unit & Integration Tests (TASK ST-05)
 * Validates course catalog, 24-credit hard limit, 12-credit soft advisory warning,
 * schedule conflict soft-warning, 5-minute slot reservation, and 1-tap batch enrollment.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import RegistrationScreen from '@/app/(student)/registration';
import {
  useCourseRegistration,
  isTimeOverlapping,
} from '@/features/student/hooks/useCourseRegistration';
import { ClassSection, SlotReservation } from '@/features/student/types';

jest.mock('@/features/student/hooks/useCourseRegistration', () => {
  const actual = jest.requireActual('@/features/student/hooks/useCourseRegistration');
  return {
    ...actual,
    useCourseRegistration: jest.fn(),
  };
});

describe('Student Course Registration Subsystem (TASK ST-05)', () => {
  const mockSections: ClassSection[] = [
    {
      id: 101,
      sectionCode: 'CS101-01',
      courseId: 1,
      courseCode: 'CS101',
      courseName: 'Lập trình Java căn bản',
      credits: 4,
      weeklyHours: 4,
      dayOfWeek: 'Thứ Hai',
      startTime: '08:00',
      endTime: '10:00',
      roomName: 'P.301 - Nhà A',
      maxCapacity: 40,
      currentEnrolled: 25,
      availableSeats: 15,
      lecturerName: 'TS. Nguyễn Văn A',
      status: 'OPEN',
      isEnrolled: true,
      enrollmentId: 501,
      hasConflict: false,
    },
    {
      id: 102,
      sectionCode: 'CS201-01',
      courseId: 2,
      courseCode: 'CS201',
      courseName: 'Cấu trúc dữ liệu và giải thuật',
      credits: 4,
      weeklyHours: 4,
      dayOfWeek: 'Thứ Ba',
      startTime: '13:30',
      endTime: '15:30',
      roomName: 'P.202 - Nhà C',
      maxCapacity: 50,
      currentEnrolled: 50,
      availableSeats: 0,
      lecturerName: 'PGS. Trần Thị B',
      status: 'FULL',
      isEnrolled: false,
      hasConflict: false,
    },
    {
      id: 103,
      sectionCode: 'CS301-01',
      courseId: 3,
      courseCode: 'CS301',
      courseName: 'Lập trình Web chuyên sâu',
      credits: 3,
      weeklyHours: 3,
      dayOfWeek: 'Thứ Hai', // Same day as CS101-01
      startTime: '09:00', // Overlaps 08:00 - 10:00
      endTime: '11:00',
      roomName: 'Lab 102 - Nhà B',
      maxCapacity: 45,
      currentEnrolled: 30,
      availableSeats: 15,
      lecturerName: 'ThS. Lê Hoàng C',
      status: 'OPEN',
      isEnrolled: false,
      hasConflict: true,
    },
    {
      id: 104,
      sectionCode: 'MATH101-01',
      courseId: 4,
      courseCode: 'MATH101',
      courseName: 'Giải tích 1',
      credits: 3,
      weeklyHours: 3,
      dayOfWeek: 'Thứ Tư',
      startTime: '08:00',
      endTime: '10:00',
      roomName: 'P.101 - Nhà D',
      maxCapacity: 60,
      currentEnrolled: 40,
      availableSeats: 20,
      lecturerName: 'TS. Phạm Minh D',
      status: 'OPEN',
      isEnrolled: false,
      hasConflict: false,
      isReservedByMe: true,
      myReservationRemainingSeconds: 245,
    },
  ];

  const mockReservations: SlotReservation[] = [
    {
      reservationId: 901,
      classSectionId: 104,
      sectionCode: 'MATH101-01',
      courseName: 'Giải tích 1',
      reservedAt: '2026-11-19T10:00:00',
      expiresAt: '2026-11-19T10:05:00',
      remainingSeconds: 245,
      status: 'ACTIVE',
    },
  ];

  const defaultMockRegistration = {
    sections: mockSections,
    reservations: mockReservations,
    enrolledSections: [mockSections[0]],
    totalEnrolledCredits: 4,
    isBelowMinCredits: true, // 4 < 12 credits
    isAtMaxLimit: false,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    isRefetching: false,
    enrollMutation: { mutate: jest.fn(), isPending: false },
    cancelEnrollMutation: { mutate: jest.fn(), isPending: false },
    reserveSlotMutation: { mutate: jest.fn(), isPending: false },
    cancelReservationMutation: { mutate: jest.fn(), isPending: false },
    batchEnrollMutation: { mutate: jest.fn(), isPending: false },
    detectConflicts: (candidate: ClassSection) => {
      if (candidate.id === 103) return [mockSections[0]];
      return [];
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useCourseRegistration as jest.Mock).mockReturnValue(defaultMockRegistration);
  });

  describe('Group 1: Catalog & Course Section Presentation', () => {
    test('TC-ST05-01: Renders course list with codes, titles, credits, schedules, and lecturers', () => {
      const html = renderToStaticMarkup(<RegistrationScreen />);

      expect(html).toContain('CS101');
      expect(html).toContain('Lập trình Java căn bản');
      expect(html).toContain('4 TC');
      expect(html).toContain('Thứ Hai • 08:00 - 10:00');
      expect(html).toContain('P.301 - Nhà A');
      expect(html).toContain('TS. Nguyễn Văn A');

      expect(html).toContain('CS201');
      expect(html).toContain('Cấu trúc dữ liệu và giải thuật');
      expect(html).toContain('Hết chỗ');
    });

    test('TC-ST05-02: Renders search box and filter tabs', () => {
      const html = renderToStaticMarkup(<RegistrationScreen />);

      expect(html).toContain('Tìm mã môn, tên môn học, giảng viên...');
      expect(html).toContain('Tất cả (4)');
      expect(html).toContain('Còn chỗ');
      expect(html).toContain('Đã đăng ký (1)');
    });
  });

  describe('Group 2: Credit Rules & Academic Advisory', () => {
    test('TC-ST05-03: Displays credit progress bar and advisory warning when under 12 credits', () => {
      const html = renderToStaticMarkup(<RegistrationScreen />);

      expect(html).toContain('4 / 24 TC');
      expect(html).toContain('Cảnh báo học vụ: Bạn hiện đăng ký 4 TC, dưới ngưỡng khuyến nghị tối thiểu 12 TC.');
    });

    test('TC-ST05-04: Hides advisory warning when enrolled credits reach >= 12 credits', () => {
      (useCourseRegistration as jest.Mock).mockReturnValue({
        ...defaultMockRegistration,
        totalEnrolledCredits: 16,
        isBelowMinCredits: false,
      });

      const html = renderToStaticMarkup(<RegistrationScreen />);

      expect(html).toContain('16 / 24 TC');
      expect(html).not.toContain('dưới ngưỡng khuyến nghị tối thiểu 12 TC');
    });

    test('TC-ST05-05: Displays max credit ceiling warning when 24-credit hard limit is reached', () => {
      (useCourseRegistration as jest.Mock).mockReturnValue({
        ...defaultMockRegistration,
        totalEnrolledCredits: 24,
        isBelowMinCredits: false,
        isAtMaxLimit: true,
      });

      const html = renderToStaticMarkup(<RegistrationScreen />);

      expect(html).toContain('24 / 24 TC');
      expect(html).toContain('Bạn đã đạt giới hạn tối đa 24 TC trong kỳ. Không thể đăng ký thêm môn mới.');
    });
  });

  describe('Group 3: Schedule Conflict Soft-Warning', () => {
    test('TC-ST05-06: Identifies schedule conflict and displays conflict badge', () => {
      const html = renderToStaticMarkup(<RegistrationScreen />);

      expect(html).toContain('Trùng lịch');
    });

    test('TC-ST05-07: isTimeOverlapping logic correctly detects overlapping vs non-overlapping intervals', () => {
      // Different days -> no overlap
      expect(isTimeOverlapping('Thứ Hai', '08:00', '10:00', 'Thứ Ba', '08:00', '10:00')).toBe(false);

      // Same day, overlapping -> true
      expect(isTimeOverlapping('Thứ Hai', '08:00', '10:00', 'Thứ Hai', '09:00', '11:00')).toBe(true);

      // Same day, consecutive but not overlapping -> false
      expect(isTimeOverlapping('Thứ Hai', '08:00', '10:00', 'Thứ Hai', '10:00', '12:00')).toBe(false);

      // Same day, completely inside -> true
      expect(isTimeOverlapping('Thứ Hai', '08:00', '12:00', 'Thứ Hai', '09:00', '10:00')).toBe(true);
    });
  });

  describe('Group 4: 5-Minute Slot Reservation (EDUP-203, F-06)', () => {
    test('TC-ST05-08: Renders active slot reservations with remaining countdown and 1-tap batch enroll button', () => {
      const html = renderToStaticMarkup(<RegistrationScreen />);

      expect(html).toContain('Đang giữ chỗ (1 môn)');
      expect(html).toContain('Giải tích 1');
      expect(html).toContain('Còn lại: 4:05');
      expect(html).toContain('1-Chạm Đăng ký tất cả');
    });

    test('TC-ST05-09: Displays action buttons correctly per section state', () => {
      const html = renderToStaticMarkup(<RegistrationScreen />);

      // Enrolled section
      expect(html).toContain('Đã đăng ký');
      expect(html).toContain('Hủy môn');

      // Reserved section
      expect(html).toContain('Đang giữ chỗ');
      expect(html).toContain('Xác nhận');

      // Available section
      expect(html).toContain('Giữ chỗ 5p');
      expect(html).toContain('Đăng ký ngay');
    });
  });

  describe('Group 5: Error & Empty States', () => {
    test('TC-ST05-10: Renders ErrorView with retry button when query fails', () => {
      (useCourseRegistration as jest.Mock).mockReturnValue({
        ...defaultMockRegistration,
        sections: [],
        isLoading: false,
        isError: true,
        error: new Error('Không thể kết nối máy chủ đào tạo'),
      });

      const html = renderToStaticMarkup(<RegistrationScreen />);

      expect(html).toContain('Không thể tải danh sách môn học');
      expect(html).toContain('Không thể kết nối máy chủ đào tạo');
    });
  });
});
