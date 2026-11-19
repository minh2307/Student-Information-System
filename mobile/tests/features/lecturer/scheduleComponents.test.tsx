/**
 * Component Tests for Lecturer Schedule Presentation Components
 * Tests ScheduleDaySelector, LecturerScheduleCard, and ScheduleDetailModal.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import {
  ScheduleDaySelector,
  SCHEDULE_DAYS,
  LecturerScheduleCard,
  ScheduleDetailModal,
  LecturerClassSection,
} from '@/features/lecturer';

const mockClassSection: LecturerClassSection = {
  sectionId: 101,
  sectionCode: 'CS101-2025-01',
  courseName: 'Lập trình Cơ bản',
  courseCode: 'CS101',
  credits: 3,
  semesterName: 'Học kỳ 1 2025-2026',
  dayOfWeek: 'MON',
  startTime: '08:00:00',
  endTime: '10:30:00',
  roomName: 'P.302-A1',
  currentEnrolled: 42,
  maxCapacity: 50,
  status: 'OPEN',
};

describe('Schedule Presentation Components', () => {
  describe('ScheduleDaySelector', () => {
    it('renders all day options with labels and accessibility attributes', () => {
      const onSelect = jest.fn();
      const html = renderToStaticMarkup(
        <ScheduleDaySelector
          selectedDay="MON"
          todayDayCode="TUE"
          onSelectDay={onSelect}
        />
      );

      SCHEDULE_DAYS.forEach((day) => {
        expect(html).toContain(day.label);
      });
      expect(html).toContain('lecturer-day-MON');
      expect(html).toContain('lecturer-day-ALL');
    });
  });

  describe('LecturerScheduleCard', () => {
    it('renders class details, academic border, time, and room info', () => {
      const onPress = jest.fn();
      const html = renderToStaticMarkup(
        <LecturerScheduleCard
          item={mockClassSection}
          onPress={onPress}
        />
      );

      expect(html).toContain('CS101-2025-01');
      expect(html).toContain('Lập trình Cơ bản');
      expect(html).toContain('CS101');
      expect(html).toContain('3 tín chỉ');
      expect(html).toContain('Đang mở');
      expect(html).toContain('P.302-A1');
      expect(html).toContain('42/50 SV');
    });

    it('renders closed badge when section status is CLOSED', () => {
      const closedSection: LecturerClassSection = {
        ...mockClassSection,
        status: 'CLOSED',
      };
      const html = renderToStaticMarkup(
        <LecturerScheduleCard
          item={closedSection}
          onPress={jest.fn()}
        />
      );

      expect(html).toContain('Đã đóng');
    });
  });

  describe('ScheduleDetailModal', () => {
    it('renders null when selectedClass is null', () => {
      const html = renderToStaticMarkup(
        <ScheduleDetailModal
          visible={false}
          selectedClass={null}
          onClose={jest.fn()}
          onNavigateToClasses={jest.fn()}
          onNavigateToAttendance={jest.fn()}
        />
      );

      expect(html).toBe('');
    });

    it('renders full class details and action buttons when class is selected', () => {
      const html = renderToStaticMarkup(
        <ScheduleDetailModal
          visible={true}
          selectedClass={mockClassSection}
          onClose={jest.fn()}
          onNavigateToClasses={jest.fn()}
          onNavigateToAttendance={jest.fn()}
        />
      );

      expect(html).toContain('Chi tiết lớp học phần');
      expect(html).toContain('CS101-2025-01');
      expect(html).toContain('Lập trình Cơ bản');
      expect(html).toContain('Mã môn học: CS101');
      expect(html).toContain('P.302-A1');
      expect(html).toContain('42 / 50 sinh viên');
      expect(html).toContain('Quản lý lớp &amp; Điểm');
      expect(html).toContain('Mở điểm danh QR');
    });
  });
});
