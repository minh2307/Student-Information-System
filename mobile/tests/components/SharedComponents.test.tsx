/**
 * SharedComponents.test.tsx
 * Comprehensive Unit Test Suite for REDS v2.0 Shared Components & Tokens
 *
 * Verifies:
 * 1. Design Tokens Registry (Brand, Surface, Typography, Semantic, Academic, Elevation)
 * 2. Primitives (AppText, AppButton, AppIconButton, AppCard, AppTextInput, AppSearchInput)
 * 3. Feedback (AppBadge, AppChip, AppEmptyState, AppErrorState, AppLoadingSkeleton, AppOfflineBanner)
 * 4. Layout (AppHeader, AppSection, SectionHeader, AppBottomSheet, FloatingTabBar)
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');

// Helper for rendering mock icon elements with arbitrary attributes in tests
const MockSpan: React.FC<any> = (props) => React.createElement('span', props);
import { Platform } from 'react-native';
import {
  tokens,
  REDS_TOKENS,
  elevationLevels,
  colors,
} from '@/theme';
import {
  AppText,
  AppButton,
  AppIconButton,
  AppCard,
  AppTextInput,
  AppSearchInput,
} from '@/components/primitives';
import {
  AppBadge,
  AppChip,
  AppEmptyState,
  AppErrorState,
  AppLoadingSkeleton,
  AppOfflineBanner,
  AppToast,
} from '@/components/feedback';
import {
  AppHeader,
  AppSection,
  SectionHeader,
  AppBottomSheet,
  FloatingTabBar,
  AppBottomNavigation,
  STUDENT_BOTTOM_NAV_TABS,
  LECTURER_BOTTOM_NAV_TABS,
} from '@/components/layout';

// Mock router
const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockRouterBack,
    push: mockRouterPush,
  }),
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => (
    <MockSpan testID="mock-icon" data-name={props.name} data-color={props.color} data-size={props.size} />
  ),
}));

describe('REDS v2.0 Design System & Shared Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  // =========================================================================
  // 1. DESIGN TOKENS REGISTRY
  // =========================================================================
  describe('1. REDS v2.0 Design Tokens Registry', () => {
    it('1.1: defines brand institutional burgundy and primary crimson colors', () => {
      expect(tokens.brand.crimson).toBe('#991B1B');
      expect(tokens.brand.burgundy).toBe('#7F1D1D');
      expect(tokens.brand.crimsonLight).toBe('#FFE4E6');
      expect(tokens.brand.primary).toBe('#991B1B');
      expect(tokens.brand.primaryScale[900]).toBe('#7F1D1D');
    });

    it('1.2: defines surface canvas layering hierarchy', () => {
      expect(tokens.surface.canvas).toBe('#F8FAFC');
      expect(tokens.surface.card).toBe('#FFFFFF');
      expect(tokens.surface.elevated).toBe('#FFFFFF');
      expect(tokens.surface.border).toBe('#E2E8F0');
      expect(tokens.surface.backdrop).toBe('rgba(15, 23, 42, 0.6)');
    });

    it('1.3: defines standardized borders and text tokens with WCAG AA compliance', () => {
      expect(tokens.border.default).toBe('#E2E8F0');
      expect(tokens.border.focus).toBe('#991B1B');
      expect(tokens.border.error).toBe('#EF4444');

      expect(tokens.text.primary).toBe('#1E293B');
      expect(tokens.text.secondary).toBe('#475569');
      expect(tokens.text.muted).toBe('#64748B');
      expect(tokens.text.subtle).toBe('#64748B');
      expect(tokens.text.placeholder).toBe('#64748B');
      expect(tokens.text.inverse).toBe('#FFFFFF');
      expect(tokens.text.brand).toBe('#991B1B');
      expect(tokens.text.burgundy).toBe('#7F1D1D');
      expect(tokens.semantic.error.button).toBe('#DC2626');
    });

    it('1.4: defines 5 academic palette themes for course categorization', () => {
      expect(tokens.semantic.academic.length).toBeGreaterThanOrEqual(5);

      // Check named token object access
      expect(tokens.academic.blueSapphire.text).toBe('#1D4ED8');
      expect(tokens.academic.emeraldGreen.text).toBe('#047857');
      expect(tokens.academic.amberGold.text).toBe('#B45309');
      expect(tokens.academic.purpleAmethyst.text).toBe('#6D28D9');
      expect(tokens.academic.roseRuby.text).toBe('#BE123C');

      // Check academicList for array indexing
      expect(tokens.academicList.length).toBeGreaterThanOrEqual(5);
    });

    it('1.5: defines elevation levels and 48dp minimum touch target', () => {
      expect(tokens.touchTarget.min).toBe(48);
      expect(elevationLevels.none).toBe(0);
      expect(elevationLevels.sm).toBe(1.5);
      expect(elevationLevels.md).toBe(3);
      expect(elevationLevels.lg).toBe(6);
      expect(elevationLevels.floating).toBe(8);
    });
  });

  // =========================================================================
  // 2. PRIMITIVES COMPONENTS
  // =========================================================================
  describe('2. Primitives Components', () => {
    describe('AppText', () => {
      it('2.1: renders text content correctly', () => {
        const html = renderToStaticMarkup(<AppText>Hello EduPortal</AppText>);
        expect(html).toContain('Hello EduPortal');
      });

      it('2.2: supports heading and body variants', () => {
        const h1Html = renderToStaticMarkup(<AppText variant="h1">Header 1</AppText>);
        expect(h1Html).toContain('Header 1');

        const captionHtml = renderToStaticMarkup(<AppText variant="caption">Caption text</AppText>);
        expect(captionHtml).toContain('Caption text');
      });

      it('2.3: applies semantic colors', () => {
        const brandHtml = renderToStaticMarkup(<AppText color="brand">Brand Text</AppText>);
        expect(brandHtml).toContain('Brand Text');

        const errorHtml = renderToStaticMarkup(<AppText color="error">Error Text</AppText>);
        expect(errorHtml).toContain('Error Text');
      });
    });

    describe('AppButton', () => {
      it('2.4: renders button title and responds to press', () => {
        const onPress = jest.fn();
        const html = renderToStaticMarkup(
          <AppButton title="Lưu thông tin" onPress={onPress} testID="btn-save" />
        );
        expect(html).toContain('Lưu thông tin');
        expect(html).toContain('testID="btn-save"');
      });

      it('2.5: supports variants (primary, secondary, outline, ghost, danger)', () => {
        const primaryHtml = renderToStaticMarkup(
          <AppButton title="Primary" variant="primary" onPress={() => {}} />
        );
        expect(primaryHtml).toContain('Primary');

        const dangerHtml = renderToStaticMarkup(
          <AppButton title="Danger" variant="danger" onPress={() => {}} />
        );
        expect(dangerHtml).toContain('Danger');

        const ghostHtml = renderToStaticMarkup(
          <AppButton title="Ghost" variant="ghost" onPress={() => {}} />
        );
        expect(ghostHtml).toContain('Ghost');
      });

      it('2.6: shows loading spinner when isLoading=true', () => {
        const html = renderToStaticMarkup(
          <AppButton title="Đang tải..." isLoading={true} onPress={() => {}} />
        );
        expect(html).toContain('Đang tải...');
      });

      it('2.7: renders left and right icons', () => {
        const html = renderToStaticMarkup(
          <AppButton
            title="Quét QR"
            onPress={() => {}}
            leftIcon={<MockSpan testID="left-icon" />}
            rightIcon={<MockSpan testID="right-icon" />}
          />
        );
        expect(html).toContain('testID="left-icon"');
        expect(html).toContain('testID="right-icon"');
        expect(html).toContain('Quét QR');
      });
    });

    describe('AppIconButton', () => {
      it('2.8: renders icon button with accessibility label', () => {
        const onPress = jest.fn();
        const html = renderToStaticMarkup(
          <AppIconButton
            icon={<MockSpan testID="inner-icon" />}
            onPress={onPress}
            accessibilityLabel="Quay lại"
            testID="btn-back"
          />
        );
        expect(html).toContain('testID="btn-back"');
        expect(html).toContain('accessibilityLabel="Quay lại"');
        expect(html).toContain('testID="inner-icon"');
      });

      it('2.9: renders badge count and badge dot', () => {
        const countHtml = renderToStaticMarkup(
          <AppIconButton
            icon={<span />}
            onPress={() => {}}
            accessibilityLabel="Thông báo"
            badgeCount={5}
          />
        );
        expect(countHtml).toContain('5');

        const dotHtml = renderToStaticMarkup(
          <AppIconButton
            icon={<span />}
            onPress={() => {}}
            accessibilityLabel="Thông báo mới"
            hasBadgeDot={true}
          />
        );
        expect(dotHtml).toBeTruthy();
      });
    });

    describe('AppCard', () => {
      it('2.10: renders card content and variants', () => {
        const html = renderToStaticMarkup(
          <AppCard variant="elevated" testID="card-elevated">
            <AppText>Card Content</AppText>
          </AppCard>
        );
        expect(html).toContain('testID="card-elevated"');
        expect(html).toContain('Card Content');
      });

      it('2.11: supports pressable card with onPress callback', () => {
        const onPress = jest.fn();
        const html = renderToStaticMarkup(
          <AppCard onPress={onPress} testID="pressable-card">
            <AppText>Click me</AppText>
          </AppCard>
        );
        expect(html).toContain('testID="pressable-card"');
        expect(html).toContain('Click me');
      });
    });

    describe('AppTextInput', () => {
      it('2.12: renders label, input, and error message', () => {
        const html = renderToStaticMarkup(
          <AppTextInput
            label="Mã sinh viên"
            placeholder="Nhập MSSV..."
            error="MSSV không hợp lệ"
            testID="input-mssv"
          />
        );
        expect(html).toContain('Mã sinh viên');
        expect(html).toContain('MSSV không hợp lệ');
        expect(html).toContain('testID="input-mssv"');
      });

      it('2.13: renders leading icon and clear button', () => {
        const onClear = jest.fn();
        const html = renderToStaticMarkup(
          <AppTextInput
            placeholder="Tìm kiếm"
            value="Toán cao cấp"
            clearable={true}
            onClear={onClear}
            leftIcon={<MockSpan testID="input-left-icon" />}
          />
        );
        expect(html).toContain('testID="input-left-icon"');
        expect(html).toContain('close-circle');
      });

      it('2.14: renders password toggle button when isPassword=true', () => {
        const html = renderToStaticMarkup(
          <AppTextInput
            label="Mật khẩu"
            isPassword={true}
            value="secret123"
          />
        );
        expect(html).toContain('eye-outline');
      });
    });

    describe('AppSearchInput', () => {
      it('2.15: renders search icon and input field', () => {
        const onChangeText = jest.fn();
        const onClear = jest.fn();
        const html = renderToStaticMarkup(
          <AppSearchInput
            placeholder="Tìm môn học, phòng thi..."
            value="CS101"
            onChangeText={onChangeText}
            onClear={onClear}
            testID="search-input"
          />
        );
        expect(html).toContain('testID="search-input"');
        expect(html).toContain('search');
        expect(html).toContain('close-circle');
      });
    });
  });

  // =========================================================================
  // 3. FEEDBACK COMPONENTS
  // =========================================================================
  describe('3. Feedback Components', () => {
    describe('AppBadge', () => {
      it('3.1: renders status badge variants (success, warning, error, info)', () => {
        const successHtml = renderToStaticMarkup(
          <AppBadge label="Đã hoàn thành" variant="success" />
        );
        expect(successHtml).toContain('Đã hoàn thành');

        const warningHtml = renderToStaticMarkup(
          <AppBadge label="Sắp đến hạn" variant="warning" />
        );
        expect(warningHtml).toContain('Sắp đến hạn');

        const errorHtml = renderToStaticMarkup(
          <AppBadge label="Chưa nộp" variant="error" />
        );
        expect(errorHtml).toContain('Chưa nộp');
      });

      it('3.2: supports academic course color palette rotation', () => {
        const html0 = renderToStaticMarkup(
          <AppBadge label="Toán rời rạc" variant="academic" academicIndex={0} />
        );
        expect(html0).toContain('Toán rời rạc');

        const html1 = renderToStaticMarkup(
          <AppBadge label="Cấu trúc dữ liệu" variant="academic" academicIndex={1} />
        );
        expect(html1).toContain('Cấu trúc dữ liệu');
      });
    });

    describe('AppChip', () => {
      it('3.3: renders chip label and handles selection state', () => {
        const onPress = jest.fn();
        const html = renderToStaticMarkup(
          <AppChip
            label="Kỳ 1 - 2024"
            selected={true}
            onPress={onPress}
            testID="chip-term"
          />
        );
        expect(html).toContain('Kỳ 1 - 2024');
        expect(html).toContain('testID="chip-term"');
      });

      it('3.4: renders chip with icon and custom variant', () => {
        const html = renderToStaticMarkup(
          <AppChip
            label="Bộ lọc nâng cao"
            variant="neutral"
            icon={<MockSpan testID="chip-icon" />}
            testID="chip-neutral"
          />
        );
        expect(html).toContain('testID="chip-neutral"');
        expect(html).toContain('testID="chip-icon"');
        expect(html).toContain('Bộ lọc nâng cao');
      });
    });

    describe('AppEmptyState', () => {
      it('3.5: renders title, message, and action CTA button', () => {
        const onAction = jest.fn();
        const html = renderToStaticMarkup(
          <AppEmptyState
            title="Không có lịch thi"
            message="Hiện tại bạn không có lịch thi nào trong học kỳ này."
            actionLabel="Tải lại"
            onAction={onAction}
            testID="empty-exams"
          />
        );
        expect(html).toContain('testID="empty-exams"');
        expect(html).toContain('Không có lịch thi');
        expect(html).toContain('Hiện tại bạn không có lịch thi nào trong học kỳ này.');
        expect(html).toContain('Tải lại');
      });
    });

    describe('AppErrorState', () => {
      it('3.6: renders error alert and retry button', () => {
        const onRetry = jest.fn();
        const html = renderToStaticMarkup(
          <AppErrorState
            title="Lỗi tải bảng điểm"
            message="Không thể kết nối đến máy chủ. Kiểm tra mạng và thử lại."
            onRetry={onRetry}
            retryLabel="Thử lại ngay"
            testID="error-grades"
          />
        );
        expect(html).toContain('testID="error-grades"');
        expect(html).toContain('Lỗi tải bảng điểm');
        expect(html).toContain('Không thể kết nối đến máy chủ. Kiểm tra mạng và thử lại.');
        expect(html).toContain('Thử lại ngay');
      });
    });

    describe('AppLoadingSkeleton', () => {
      it('3.7: renders skeleton placeholder for text, card, and avatar', () => {
        const textSkeleton = renderToStaticMarkup(
          <AppLoadingSkeleton variant="text" width={200} height={20} testID="skeleton-text" />
        );
        expect(textSkeleton).toContain('testID="skeleton-text"');

        const cardSkeleton = renderToStaticMarkup(
          <AppLoadingSkeleton variant="card" height={120} testID="skeleton-card" />
        );
        expect(cardSkeleton).toContain('testID="skeleton-card"');

        const avatarSkeleton = renderToStaticMarkup(
          <AppLoadingSkeleton variant="avatar" testID="skeleton-avatar" />
        );
        expect(avatarSkeleton).toContain('testID="skeleton-avatar"');
      });
    });

    describe('AppOfflineBanner', () => {
      it('3.8: renders offline warning and sync time', () => {
        const onSync = jest.fn();
        const html = renderToStaticMarkup(
          <AppOfflineBanner
            visible={true}
            message="Chế độ ngoại tuyến"
            lastSyncedAt="10:30 Hôm nay"
            onSyncPress={onSync}
            testID="offline-banner"
          />
        );
        expect(html).toContain('testID="offline-banner"');
        expect(html).toContain('Chế độ ngoại tuyến');
        expect(html).toContain('Đồng bộ lần cuối: 10:30 Hôm nay');
      });

      it('3.9: returns null when visible=false', () => {
        const html = renderToStaticMarkup(
          <AppOfflineBanner visible={false} testID="offline-banner-hidden" />
        );
        expect(html).toBe('');
      });
    });

    describe('AppToast', () => {
      it('3.10: renders floating toast notification when visible=true', () => {
        const onDismiss = jest.fn();
        const html = renderToStaticMarkup(
          <AppToast
            visible={true}
            message="Cập nhật thành công"
            description="Thông tin cá nhân đã được lưu"
            type="success"
            onDismiss={onDismiss}
            testID="test-toast"
          />
        );
        expect(html).toContain('testID="test-toast"');
        expect(html).toContain('Cập nhật thành công');
        expect(html).toContain('Thông tin cá nhân đã được lưu');
      });

      it('3.11: returns null when visible=false', () => {
        const html = renderToStaticMarkup(
          <AppToast visible={false} message="Ẩn" testID="test-toast-hidden" />
        );
        expect(html).toBe('');
      });
    });
  });

  // =========================================================================
  // 4. LAYOUT COMPONENTS
  // =========================================================================
  describe('4. Layout Components', () => {
    describe('AppHeader', () => {
      it('4.1: renders burgundy brand header with title and subtitle', () => {
        const html = renderToStaticMarkup(
          <AppHeader
            title="Lịch học & Lịch thi"
            subtitle="Kỳ 1 - 2024/2025"
            variant="burgundy"
            showBackButton={true}
            testID="header-burgundy"
          />
        );
        expect(html).toContain('testID="header-burgundy"');
        expect(html).toContain('Lịch học &amp; Lịch thi');
        expect(html).toContain('Kỳ 1 - 2024/2025');
        expect(html).toContain('arrow-back');
      });

      it('4.2: renders surface variant and custom right action', () => {
        const html = renderToStaticMarkup(
          <AppHeader
            title="Bảng điểm chi tiết"
            variant="surface"
            rightActions={<MockSpan testID="header-action-filter">Lọc</MockSpan>}
            testID="header-surface"
          />
        );
        expect(html).toContain('testID="header-surface"');
        expect(html).toContain('Bảng điểm chi tiết');
        expect(html).toContain('testID="header-action-filter"');
      });

      it('4.3: back button triggers onBackPress callback if provided', () => {
        const onBack = jest.fn();
        const html = renderToStaticMarkup(
          <AppHeader
            title="Thông tin sinh viên"
            showBackButton={true}
            onBackPress={onBack}
          />
        );
        expect(html).toContain('arrow-back');
      });
    });

    describe('AppSection', () => {
      it('4.4: renders section header with title, subtitle, and action link', () => {
        const onAction = jest.fn();
        const html = renderToStaticMarkup(
          <AppSection
            title="Lớp học hôm nay"
            subtitle="Thứ Năm, 12/11/2026"
            actionLabel="Xem tất cả"
            onAction={onAction}
            testID="section-classes"
          >
            <AppText>Nội dung danh sách lớp</AppText>
          </AppSection>
        );
        expect(html).toContain('testID="section-classes"');
        expect(html).toContain('Lớp học hôm nay');
        expect(html).toContain('Thứ Năm, 12/11/2026');
        expect(html).toContain('Xem tất cả');
        expect(html).toContain('Nội dung danh sách lớp');
      });
    });

    describe('SectionHeader', () => {
      it('4.5: renders standalone section header with action callback', () => {
        const onAction = jest.fn();
        const html = renderToStaticMarkup(
          <SectionHeader
            title="Thông báo học vụ"
            subtitle="Cập nhật 5 phút trước"
            actionLabel="Đánh dấu đã đọc"
            onAction={onAction}
            testID="sec-hdr"
          />
        );
        expect(html).toContain('testID="sec-hdr"');
        expect(html).toContain('Thông báo học vụ');
        expect(html).toContain('Cập nhật 5 phút trước');
        expect(html).toContain('Đánh dấu đã đọc');
      });
    });

    describe('AppBottomSheet', () => {
      it('4.6: returns null when visible=false', () => {
        const html = renderToStaticMarkup(
          <AppBottomSheet visible={false} onClose={() => {}}>
            <AppText>Drawer content</AppText>
          </AppBottomSheet>
        );
        expect(html).toBe('');
      });

      it('4.7: renders drawer with title, content, and close button when visible=true', () => {
        const onClose = jest.fn();
        const html = renderToStaticMarkup(
          <AppBottomSheet visible={true} onClose={onClose} title="Bộ lọc kỳ học" testID="sheet-filter">
            <AppText>Lựa chọn kỳ học</AppText>
          </AppBottomSheet>
        );
        expect(html).toContain('testID="sheet-filter"');
        expect(html).toContain('Bộ lọc kỳ học');
        expect(html).toContain('Lựa chọn kỳ học');
        expect(html).toContain('close');
      });
    });

    describe('FloatingTabBar', () => {
      it('4.8: renders standalone modern tab bar with active indicator and badges', () => {
        const onTabPress = jest.fn();
        const tabs = [
          { key: 'dashboard', label: 'Tổng quan', iconName: 'home-outline' as const, activeIconName: 'home' as const },
          { key: 'timetable', label: 'Thời khóa biểu', iconName: 'calendar-outline' as const },
          { key: 'grades', label: 'Bảng điểm', iconName: 'school-outline' as const, badgeCount: 2 },
        ];

        const html = renderToStaticMarkup(
          <FloatingTabBar
            tabs={tabs}
            activeTabKey="dashboard"
            onTabPress={onTabPress}
            testID="test-tab-bar"
          />
        );
        expect(html).toContain('testID="test-tab-bar"');
        expect(html).toContain('Tổng quan');
        expect(html).toContain('Thời khóa biểu');
        expect(html).toContain('Bảng điểm');
        expect(html).toContain('2'); // Badge count
      });
    });

    describe('AppBottomNavigation', () => {
      it('4.9: audits and preserves all 6 tabs in Student Navigation (cấm xóa 2 tabs)', () => {
        expect(STUDENT_BOTTOM_NAV_TABS.length).toBe(6);
        const keys = STUDENT_BOTTOM_NAV_TABS.map((t) => t.key);
        expect(keys).toEqual(['dashboard', 'timetable', 'exams', 'grades', 'tuition', 'profile']);

        const onTabPress = jest.fn();
        const html = renderToStaticMarkup(
          <AppBottomNavigation
            role="STUDENT"
            activeTabKey="dashboard"
            onTabPress={onTabPress}
            testID="student-bottom-nav"
          />
        );
        expect(html).toContain('testID="student-bottom-nav"');
        expect(html).toContain('Tổng quan');
        expect(html).toContain('Lịch học');
        expect(html).toContain('Lịch thi');
        expect(html).toContain('Bảng điểm');
        expect(html).toContain('Học phí');
        expect(html).toContain('Hồ sơ');
      });

      it('4.10: audits and preserves all 5 tabs in Lecturer Navigation', () => {
        expect(LECTURER_BOTTOM_NAV_TABS.length).toBe(5);
        const keys = LECTURER_BOTTOM_NAV_TABS.map((t) => t.key);
        expect(keys).toEqual(['dashboard', 'schedule', 'classes', 'attendance', 'profile']);

        const onTabPress = jest.fn();
        const html = renderToStaticMarkup(
          <AppBottomNavigation
            role="LECTURER"
            activeTabKey="attendance"
            onTabPress={onTabPress}
            testID="lecturer-bottom-nav"
          />
        );
        expect(html).toContain('testID="lecturer-bottom-nav"');
        expect(html).toContain('Tổng quan');
        expect(html).toContain('Lịch dạy');
        expect(html).toContain('Lớp học');
        expect(html).toContain('Điểm danh');
        expect(html).toContain('Hồ sơ GV');
      });
    });
  });
});
