/**
 * Student Calendar Synchronization Unit & Integration Tests (TASK ST-06)
 * Validates Webcal 1-click subscription, subscription URL copy card,
 * manual .ics file export, and multi-platform integration guides.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import CalendarSyncScreen from '@/app/(student)/calendar-sync';
import { useCalendarSync } from '@/features/student/hooks/useCalendarSync';
import { CalendarSubscriptionInfo } from '@/features/student/types';

jest.mock('@/features/student/hooks/useCalendarSync', () => ({
  useCalendarSync: jest.fn(),
}));

describe('Student Calendar Synchronization Subsystem (TASK ST-06)', () => {
  const mockSubscriptionInfo: CalendarSubscriptionInfo = {
    studentCode: 'SV2026001',
    feedToken: 'feed_token_xyz123',
    subscriptionUrl: 'https://api.eduportal.rikkei.edu.vn/api/v1/student/calendar/feed/SV2026001?token=feed_token_xyz123',
    webcalUrl: 'webcal://api.eduportal.rikkei.edu.vn/api/v1/student/calendar/feed/SV2026001?token=feed_token_xyz123',
    exportUrl: 'https://api.eduportal.rikkei.edu.vn/api/v1/student/calendar/export.ics',
    instructions: {
      googleCalendar: 'Mở Google Calendar trên máy tính > Cài đặt > Thêm lịch > Từ URL > Dán đường link Subscription URL.',
      appleCalendar: 'Trên iPhone hoặc Mac, mở ứng dụng Lịch > Tệp > Đăng ký Lịch Mới > Dán Webcal URL.',
      outlook: 'Vào Outlook Calendar > Add Calendar > Subscribe from web > Dán Subscription URL.',
    },
  };

  const defaultMockHook = {
    subscriptionInfo: mockSubscriptionInfo,
    data: mockSubscriptionInfo,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    isRefetching: false,
    openWebcal: jest.fn(),
    openSubscriptionUrl: jest.fn(),
    openExportUrl: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useCalendarSync as jest.Mock).mockReturnValue(defaultMockHook);
  });

  test('TC-ST06-01: Renders hero card with title and sync description', () => {
    const html = renderToStaticMarkup(<CalendarSyncScreen />);

    expect(html).toContain('Đồng bộ Lịch học');
    expect(html).toContain('Lịch thi');
    expect(html).toContain('Đăng ký nguồn lịch tự động cập nhật vào Google Calendar');
  });

  test('TC-ST06-02: Renders 1-Click Webcal Subscription button', () => {
    const html = renderToStaticMarkup(<CalendarSyncScreen />);

    expect(html).toContain('Đăng ký tự động 1-Chạm');
    expect(html).toContain('Mở trong ứng dụng Lịch (Webcal)');
    expect(html).toContain('Khuyên dùng cho iOS (Apple Calendar) hoặc thiết bị hỗ trợ giao thức Webcal');
  });

  test('TC-ST06-03: Displays subscription URL with personal token and copy button', () => {
    const html = renderToStaticMarkup(<CalendarSyncScreen />);

    expect(html).toContain('Đường dẫn Subscription Feed');
    expect(html).toContain('feed_token_xyz123');
    expect(html).toContain('Sao chép');
    expect(html).toContain('Liên kết chứa token cá nhân bảo mật');
  });

  test('TC-ST06-04: Renders manual .ics file download card', () => {
    const html = renderToStaticMarkup(<CalendarSyncScreen />);

    expect(html).toContain('Tải tệp lịch .ics thủ công');
    expect(html).toContain('Tải file .ics');
  });

  test('TC-ST06-05: Renders step-by-step setup guides for Google Calendar', () => {
    const html = renderToStaticMarkup(<CalendarSyncScreen />);

    expect(html).toContain('Hướng dẫn cài đặt chi tiết');
    expect(html).toContain('Google Calendar');
    expect(html).toContain('Apple Calendar');
    expect(html).toContain('Outlook');
    expect(html).toContain('Other calendars (+)');
    expect(html).toContain('From URL');
  });

  test('TC-ST06-06: Renders loading state when subscription info is being fetched', () => {
    (useCalendarSync as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      subscriptionInfo: null,
      isLoading: true,
    });

    const html = renderToStaticMarkup(<CalendarSyncScreen />);

    expect(html).toContain('Đang lấy thông tin nguồn lịch cá nhân...');
  });

  test('TC-ST06-07: Renders ErrorView with retry button when query fails', () => {
    (useCalendarSync as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      subscriptionInfo: null,
      isLoading: false,
      isError: true,
      error: new Error('Không thể tạo mã token đồng bộ lịch'),
    });

    const html = renderToStaticMarkup(<CalendarSyncScreen />);

    expect(html).toContain('Không thể tải thông tin đồng bộ lịch');
    expect(html).toContain('Không thể tạo mã token đồng bộ lịch');
  });
});
