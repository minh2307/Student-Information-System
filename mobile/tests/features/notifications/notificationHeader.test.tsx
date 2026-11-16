/**
 * AppNotificationHeader Unit Tests (REDS v2.0)
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');

import { AppNotificationHeader } from '@/features/notifications';

jest.mock('@/features/notifications/hooks/useNotifications', () => ({
  useNotifications: () => ({
    unreadCount: 4,
    notifications: [],
    isLoading: false,
    markAsRead: jest.fn(),
  }),
}));

describe('AppNotificationHeader REDS v2.0', () => {
  it('renders title, subtitle, and NotificationBellButton with real unread count', () => {
    const html = renderToStaticMarkup(
      <AppNotificationHeader
        title="Tổng quan sinh viên"
        subtitle="Học kỳ 2 • 2024-2025"
        variant="burgundy"
      />
    );
    expect(html).toContain('Tổng quan sinh viên');
    expect(html).toContain('Học kỳ 2 • 2024-2025');
    expect(html).toContain('4'); // Unread badge count
  });

  it('renders surface variant with custom testID', () => {
    const html = renderToStaticMarkup(
      <AppNotificationHeader
        title="Chi tiết học phần"
        variant="surface"
        testID="custom-header"
      />
    );
    expect(html).toContain('testID="custom-header"');
    expect(html).toContain('Chi tiết học phần');
  });
});
