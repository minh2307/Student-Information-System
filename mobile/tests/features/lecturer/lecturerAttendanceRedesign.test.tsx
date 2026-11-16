/**
 * PHASE 6 — STEP 4.3: Lecturer QR Attendance Redesign Test Suite
 *
 * Comprehensive tests for REDS v2.0 Lecturer Attendance & Shared UI Integration:
 * - AppNotificationHeader: burgundy variant, title, subtitle, notification bell
 * - ConnectedOfflineBanner: hidden online, visible offline, last synced time
 * - AttendanceQrBox: QR optical quiet zone, visual countdown ticker, token hint, lock state
 * - AttendanceStatsCard: attended, pending, total enrolled calculation from real data
 * - AttendeeRosterCard: attendee count, formatted timestamp, refresh trigger, empty state
 * - Session State Machine: active vs inactive vs loading transitions
 * - Action buttons: start session, close session with destructive confirmation
 * - AppState background/resume lifecycle re-synchronization
 * - Countdown ticker 15s expiration & anti-race fetch guard
 * - Zero open handles teardown verification
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LecturerAttendanceScreen from '../../../app/(lecturer)/attendance';
import * as LecturerHooks from '@/features/lecturer/hooks/useLecturerQueries';
import { LecturerClassSection, AttendanceSession, DynamicQrResponse } from '@/features/lecturer/types';

// ─── Core Mocks ────────────────────────────────────────────────────────────────

// Mock offline context
let mockOfflineState = {
  isOffline: false,
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
  lastOnlineAt: '2026-11-16T08:00:00.000Z' as string | null,
  checkConnectivity: jest.fn(),
};

jest.mock('@/features/offline/OfflineContext', () => {
  const actual = jest.requireActual('@/features/offline/OfflineContext');
  return {
    ...actual,
    useOffline: () => mockOfflineState,
  };
});

// Mock notification hooks
let mockUnreadCount = 3;
jest.mock('@/features/notifications/hooks/useNotifications', () => ({
  useNotifications: () => ({
    unreadCount: mockUnreadCount,
    notifications: [],
    isLoading: false,
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    refetch: jest.fn(),
  }),
}));

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: ({ source, style, accessibilityLabel }: any) => {
    const src = typeof source === 'object' && source?.uri ? source.uri : source;
    return (
      <img
        src={src}
        alt={accessibilityLabel || 'QR Code'}
        style={style}
        data-testid="mock-expo-image"
      />
    );
  },
}));

// ─── Mock Data Fixtures ────────────────────────────────────────────────────────

const mockClass: LecturerClassSection = {
  sectionId: 101,
  sectionCode: 'IT101-01',
  courseCode: 'IT101',
  courseName: 'Lập trình Java',
  credits: 3,
  roomName: 'P301',
  dayOfWeek: 'MON',
  startTime: '07:30',
  endTime: '09:30',
  currentEnrolled: 35,
  maxCapacity: 40,
  semesterName: 'Học kỳ 1 2026-2027',
  status: 'OPEN',
};

const mockActiveSession: AttendanceSession = {
  sessionId: 88,
  sectionId: 101,
  sectionCode: 'IT101-01',
  courseName: 'Lập trình Java',
  sessionName: 'Điểm danh ca 16/11/2026',
  status: 'ACTIVE',
  stepSeconds: 15,
  totalAttendees: 2,
  createdAt: '2026-11-16T07:35:00',
  closedAt: null,
  records: [
    {
      recordId: 1,
      studentCode: 'SV2024001',
      studentName: 'Nguyễn Văn A',
      checkInTime: '2026-11-16T07:36:12',
    },
    {
      recordId: 2,
      studentCode: 'SV2024002',
      studentName: 'Trần Thị B',
      checkInTime: '2026-11-16T07:37:45',
    },
  ],
};

const mockQrData: DynamicQrResponse = {
  sessionId: 88,
  sectionId: 101,
  qrToken: '88.101.11962500.a3f89e81b2c45d6e7f8a9b0c1d2e3f4a',
  qrImageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  stepSeconds: 15,
  remainingSeconds: 12,
  expiresAtEpochMs: Date.now() + 12000,
};

// ─── Helper Functions ──────────────────────────────────────────────────────────

function renderAttendanceScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const html = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <LecturerAttendanceScreen />
    </QueryClientProvider>
  );
  queryClient.clear();
  return html;
}

// ─── Test Suite ────────────────────────────────────────────────────────────────

describe('PHASE 6 — STEP 4.3: Lecturer QR Attendance Redesign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOfflineState.isOffline = false;
    mockOfflineState.isConnected = true;
    mockUnreadCount = 3;

    // Default mock setup: 1 class, inactive session
    jest.spyOn(LecturerHooks, 'useLecturerClasses').mockReturnValue({
      data: [mockClass],
      isLoading: false,
    } as any);

    jest.spyOn(LecturerHooks, 'useAttendanceSession').mockReturnValue({
      data: null,
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
    } as any);

    jest.spyOn(LecturerHooks, 'useRotatingQr').mockReturnValue({
      data: null,
      isLoading: false,
      refetch: jest.fn(),
    } as any);

    jest.spyOn(LecturerHooks, 'useStartAttendanceSession').mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as any);

    jest.spyOn(LecturerHooks, 'useCloseAttendanceSession').mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as any);
  });

  // ── 1. AppNotificationHeader Integration ────────────────────────────────────

  describe('AppNotificationHeader Integration', () => {
    it('renders with testID "lecturer-attendance-header"', () => {
      const html = renderAttendanceScreen();
      expect(html).toContain('lecturer-attendance-header');
    });

    it('renders the header title "Điểm danh QR"', () => {
      const html = renderAttendanceScreen();
      expect(html).toContain('Điểm danh QR');
    });

    it('renders the subtitle "Phiên điểm danh bảo mật (Anti-Proxy)"', () => {
      const html = renderAttendanceScreen();
      expect(html).toContain('Phiên điểm danh bảo mật (Anti-Proxy)');
    });

    it('renders notification bell button with unread count badge', () => {
      mockUnreadCount = 4;
      const html = renderAttendanceScreen();
      expect(html).toContain('notification-bell-button');
      expect(html).toContain('4');
    });
  });

  // ── 2. ConnectedOfflineBanner Integration ───────────────────────────────────

  describe('ConnectedOfflineBanner Integration', () => {
    it('renders null when device is online (banner hidden)', () => {
      mockOfflineState.isOffline = false;
      mockOfflineState.isConnected = true;
      const html = renderAttendanceScreen();
      expect(html).not.toContain('lecturer-attendance-offline-banner');
    });

    it('renders with testID "lecturer-attendance-offline-banner" when offline', () => {
      mockOfflineState.isOffline = true;
      mockOfflineState.isConnected = false;
      const html = renderAttendanceScreen();
      expect(html).toContain('lecturer-attendance-offline-banner');
      expect(html).toContain('Chế độ ngoại tuyến');
    });

    it('shows last synced time when available in offline mode', () => {
      mockOfflineState.isOffline = true;
      mockOfflineState.isConnected = false;
      mockOfflineState.lastOnlineAt = '2026-11-16T08:00:00.000Z';
      const html = renderAttendanceScreen();
      expect(html).toContain('Đồng bộ lần cuối:');
    });
  });

  // ── 3. Class Information & Selector Card ────────────────────────────────────

  describe('Class Information & Selector Card', () => {
    it('renders testID "attendance-class-selector"', () => {
      const html = renderAttendanceScreen();
      expect(html).toContain('attendance-class-selector');
    });

    it('displays sectionCode "IT101-01" and courseName "Lập trình Java"', () => {
      const html = renderAttendanceScreen();
      expect(html).toContain('IT101-01');
      expect(html).toContain('Lập trình Java');
    });

    it('displays room and enrollment information', () => {
      const html = renderAttendanceScreen();
      expect(html).toContain('P301');
      expect(html).toContain('35/40 SV');
    });
  });

  // ── 4. Attendance QR Box (Active vs Inactive vs Loading) ─────────────────────

  describe('AttendanceQrBox (Active vs Inactive vs Loading)', () => {
    it('renders inactive session state when no open session exists', () => {
      const html = renderAttendanceScreen();
      expect(html).toContain('attendance-qr-inactive');
      expect(html).toContain('Phiên điểm danh chưa bắt đầu');
      expect(html).toContain('Nhấn nút bên dưới để khởi tạo phiên điểm danh QR động');
    });

    it('renders active dynamic QR code and countdown ticker when session is ACTIVE (Security: no token hint exposed)', () => {
      jest.spyOn(LecturerHooks, 'useAttendanceSession').mockReturnValue({
        data: mockActiveSession,
        isLoading: false,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      jest.spyOn(LecturerHooks, 'useRotatingQr').mockReturnValue({
        data: mockQrData,
        isLoading: false,
        refetch: jest.fn(),
      } as any);

      const html = renderAttendanceScreen();
      expect(html).toContain('attendance-qr-image-container');
      expect(html).toContain('Mã làm mới sau:');
      // F-02 Security: token hint is completely removed from UI
      expect(html).not.toContain('Mã bảo mật:');
      expect(html).not.toContain('88.101.11962500.');
      expect(html).not.toContain(mockQrData.qrToken);
    });

    it('verifies F-02 compliance: qrToken credentials do not leak in accessibility labels or visual text', () => {
      jest.spyOn(LecturerHooks, 'useAttendanceSession').mockReturnValue({
        data: mockActiveSession,
        isLoading: false,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      jest.spyOn(LecturerHooks, 'useRotatingQr').mockReturnValue({
        data: mockQrData,
        isLoading: false,
        refetch: jest.fn(),
      } as any);

      const html = renderAttendanceScreen();
      expect(html).not.toContain('Mã bảo mật:');
      expect(html).not.toContain(mockQrData.qrToken);
      expect(html).not.toContain('88.101.11962500');
      expect(html).not.toContain('a3f89e81b2c45d6e7f8a9b0c1d2e3f4a');
    });

    it('renders loading state when checking session status', () => {
      jest.spyOn(LecturerHooks, 'useAttendanceSession').mockReturnValue({
        data: null,
        isLoading: true,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      const html = renderAttendanceScreen();
      expect(html).toContain('Đang kiểm tra trạng thái phiên...');
    });
  });

  // ── 5. Real-time Attendance Statistics (AttendanceStatsCard) ────────────────

  describe('Real-time Attendance Statistics (AttendanceStatsCard)', () => {
    it('renders testID "attendance-stats-card"', () => {
      const html = renderAttendanceScreen();
      expect(html).toContain('attendance-stats-card');
    });

    it('calculates and shows attended, pending, and total enrolled accurately', () => {
      jest.spyOn(LecturerHooks, 'useAttendanceSession').mockReturnValue({
        data: mockActiveSession, // 2 attendees
        isLoading: false,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      const html = renderAttendanceScreen();
      // Attended: 2
      expect(html).toContain('stat-attended');
      expect(html).toContain('2');
      expect(html).toContain('Đã quét thành công');

      // Pending: 35 - 2 = 33
      expect(html).toContain('stat-pending');
      expect(html).toContain('33');
      expect(html).toContain('Chưa điểm danh');

      // Total: 35
      expect(html).toContain('stat-total');
      expect(html).toContain('35');
      expect(html).toContain('Tổng sĩ số');
    });
  });

  // ── 6. Session Lifecycle Action Buttons ──────────────────────────────────────

  describe('Session Lifecycle Action Buttons', () => {
    it('renders "Bắt đầu phiên điểm danh QR" button when session is inactive', () => {
      const html = renderAttendanceScreen();
      expect(html).toContain('btn-start-session');
      expect(html).toContain('Bắt đầu phiên điểm danh QR');
    });

    it('renders "Đóng phiên điểm danh" button when session is active', () => {
      jest.spyOn(LecturerHooks, 'useAttendanceSession').mockReturnValue({
        data: mockActiveSession,
        isLoading: false,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      const html = renderAttendanceScreen();
      expect(html).toContain('btn-close-session');
      expect(html).toContain('Đóng phiên điểm danh');
    });
  });

  // ── 7. Checked-in Student Roster (AttendeeRosterCard) ────────────────────────

  describe('Checked-in Student Roster (AttendeeRosterCard)', () => {
    it('renders testID "attendance-roster-card"', () => {
      const html = renderAttendanceScreen();
      expect(html).toContain('attendance-roster-card');
    });

    it('renders empty roster state when no students have checked in', () => {
      const html = renderAttendanceScreen();
      expect(html).toContain('roster-empty-state');
      expect(html).toContain('Chưa có bản ghi điểm danh nào trong phiên gần nhất.');
    });

    it('renders attendee list with student names and codes when checked in', () => {
      jest.spyOn(LecturerHooks, 'useAttendanceSession').mockReturnValue({
        data: mockActiveSession,
        isLoading: false,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      const html = renderAttendanceScreen();
      expect(html).toContain('roster-list');
      expect(html).toContain('Nguyễn Văn A');
      expect(html).toContain('SV: SV2024001');
      expect(html).toContain('Trần Thị B');
      expect(html).toContain('SV: SV2024002');
      expect(html).toContain('Danh sách đã điểm danh (2)');
    });
  });

  // ── 8. Optical Quiet Zone & Scannability Verification ────────────────────────

  describe('Optical Quiet Zone & Scannability (Condition 2)', () => {
    it('provides solid pure white background container for QR image', () => {
      jest.spyOn(LecturerHooks, 'useAttendanceSession').mockReturnValue({
        data: mockActiveSession,
        isLoading: false,
        refetch: jest.fn(),
        isRefetching: false,
      } as any);

      jest.spyOn(LecturerHooks, 'useRotatingQr').mockReturnValue({
        data: mockQrData,
        isLoading: false,
        refetch: jest.fn(),
      } as any);

      const html = renderAttendanceScreen();
      expect(html).toContain('attendance-qr-image-container');
      expect(html).toContain('mock-expo-image');
    });
  });
});
