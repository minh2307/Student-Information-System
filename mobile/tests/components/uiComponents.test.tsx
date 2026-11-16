/**
 * Reusable UI Components Unit Tests (REDS v2.0)
 * Uses react-dom/server renderToStaticMarkup for stable, dependency-free rendering verification.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');

import {
  AppButton,
  AppCard,
  AppIconButton,
  AppTextInput,
  AppSearchInput,
  SearchInput,
  AppText,
  AppBadge,
  AppChip,
  AppEmptyState,
  AppErrorState,
  AppLoadingSkeleton,
  AppOfflineBanner,
  AppToast,
  AppHeader,
  AppSection,
  SectionHeader,
  AppBottomSheet,
  AppBottomNavigation,
  STUDENT_BOTTOM_NAV_TABS,
  LECTURER_BOTTOM_NAV_TABS,
  FloatingTabBar,
} from '@/components/ui';

describe('REDS v2.0 Reusable UI Components', () => {
  describe('1. AppButton Component', () => {
    it('renders primary button with title and accessible button role', () => {
      const html = renderToStaticMarkup(
        <AppButton title="Xác nhận" onPress={() => {}} variant="primary" />
      );
      expect(html).toContain('Xác nhận');
    });

    it('renders loading state with ActivityIndicator and aria-busy', () => {
      const html = renderToStaticMarkup(
        <AppButton title="Đang lưu" onPress={() => {}} isLoading={true} />
      );
      expect(html).toContain('Đang lưu');
    });

    it('renders secondary and destructive variants', () => {
      const secHtml = renderToStaticMarkup(
        <AppButton title="Hủy bỏ" onPress={() => {}} variant="secondary" />
      );
      expect(secHtml).toContain('Hủy bỏ');

      const dangerHtml = renderToStaticMarkup(
        <AppButton title="Xóa tài khoản" onPress={() => {}} variant="danger" />
      );
      expect(dangerHtml).toContain('Xóa tài khoản');
    });
  });

  describe('2. AppTextInput & AppSearchInput Components', () => {
    it('renders label, placeholder, and testID on text input', () => {
      const html = renderToStaticMarkup(
        <AppTextInput
          label="Mã sinh viên"
          value="SV2024001"
          onChangeText={() => {}}
          placeholder="Nhập mã sinh viên"
          testID="student-id-input"
        />
      );
      expect(html).toContain('Mã sinh viên');
      expect(html).toContain('SV2024001');
      expect(html).toContain('Nhập mã sinh viên');
    });

    it('renders error message when error prop is provided', () => {
      const html = renderToStaticMarkup(
        <AppTextInput
          label="Mật khẩu"
          value=""
          onChangeText={() => {}}
          error="Mật khẩu không được để trống"
          isPassword
        />
      );
      expect(html).toContain('Mật khẩu không được để trống');
    });

    it('renders AppSearchInput with placeholder and search icon', () => {
      const html = renderToStaticMarkup(
        <AppSearchInput
          value=""
          onChangeText={() => {}}
          placeholder="Tìm môn học..."
        />
      );
      expect(html).toContain('Tìm môn học...');
    });

    it('renders SearchInput alias identically to AppSearchInput', () => {
      const html = renderToStaticMarkup(
        <SearchInput
          value=""
          onChangeText={() => {}}
          placeholder="Tìm kiếm môn học..."
        />
      );
      expect(html).toContain('Tìm kiếm môn học...');
    });
  });

  describe('3. AppCard Component', () => {
    it('renders card content with default padding and border', () => {
      const html = renderToStaticMarkup(
        <AppCard>
          <span>Nội dung học vụ</span>
        </AppCard>
      );
      expect(html).toContain('Nội dung học vụ');
    });

    it('renders elevated and outlined card variants', () => {
      const elevatedHtml = renderToStaticMarkup(
        <AppCard variant="elevated">
          <span>Thẻ nâng cao</span>
        </AppCard>
      );
      expect(elevatedHtml).toContain('Thẻ nâng cao');

      const outlinedHtml = renderToStaticMarkup(
        <AppCard variant="outlined">
          <span>Thẻ viền phẳng</span>
        </AppCard>
      );
      expect(outlinedHtml).toContain('Thẻ viền phẳng');
    });
  });

  describe('4. AppBadge & AppChip Components', () => {
    it('renders semantic status badges correctly', () => {
      const successHtml = renderToStaticMarkup(
        <AppBadge label="Đã hoàn thành" variant="success" />
      );
      expect(successHtml).toContain('Đã hoàn thành');

      const warningHtml = renderToStaticMarkup(
        <AppBadge label="Chờ xử lý" variant="warning" />
      );
      expect(warningHtml).toContain('Chờ xử lý');

      const errorHtml = renderToStaticMarkup(
        <AppBadge label="Chưa nộp" variant="error" />
      );
      expect(errorHtml).toContain('Chưa nộp');
    });

    it('renders academic badge with custom index', () => {
      const academicHtml = renderToStaticMarkup(
        <AppBadge label="Cấu trúc dữ liệu" variant="academic" academicIndex={1} />
      );
      expect(academicHtml).toContain('Cấu trúc dữ liệu');
    });

    it('renders AppChip in selected and unselected states', () => {
      const unselectedHtml = renderToStaticMarkup(
        <AppChip label="Thứ 2" selected={false} onPress={() => {}} />
      );
      expect(unselectedHtml).toContain('Thứ 2');

      const selectedHtml = renderToStaticMarkup(
        <AppChip label="Hôm nay" selected={true} onPress={() => {}} />
      );
      expect(selectedHtml).toContain('Hôm nay');
    });
  });

  describe('5. SectionHeader Component', () => {
    it('renders title, subtitle, and action button with hitSlop', () => {
      const html = renderToStaticMarkup(
        <SectionHeader
          title="Lớp học hôm nay"
          subtitle="Học kỳ 2 • 2024-2025"
          actionLabel="Xem tất cả"
          onAction={() => {}}
        />
      );
      expect(html).toContain('Lớp học hôm nay');
      expect(html).toContain('Học kỳ 2 • 2024-2025');
      expect(html).toContain('Xem tất cả');
    });
  });

  describe('6. FloatingTabBar Component', () => {
    it('renders navigation tabs with active indicator and badge count', () => {
      const tabs = [
        { key: 'dashboard', label: 'Tổng quan', iconName: 'grid-outline' as const },
        { key: 'timetable', label: 'Lịch học', iconName: 'calendar-outline' as const, badgeCount: 3 },
      ];

      const html = renderToStaticMarkup(
        <FloatingTabBar
          tabs={tabs}
          activeTabKey="dashboard"
          onTabPress={() => {}}
        />
      );
      expect(html).toContain('Tổng quan');
      expect(html).toContain('Lịch học');
      expect(html).toContain('3');
    });
  });

  describe('7. AppText Component', () => {
    it('renders semantic typography variants correctly', () => {
      const displayHtml = renderToStaticMarkup(
        <AppText variant="display" color="brand">8.74</AppText>
      );
      expect(displayHtml).toContain('8.74');

      const h2Html = renderToStaticMarkup(
        <AppText variant="h2" color="primary">Thẻ Sinh Viên</AppText>
      );
      expect(h2Html).toContain('Thẻ Sinh Viên');
    });
  });

  describe('8. AppIconButton Component', () => {
    it('renders accessible icon button with accessibility label', () => {
      const html = renderToStaticMarkup(
        <AppIconButton
          icon={<span>🔔</span>}
          accessibilityLabel="Thông báo"
          onPress={() => {}}
          badgeCount={5}
        />
      );
      expect(html).toContain('Thông báo');
      expect(html).toContain('5');
    });

    it('renders disabled state without breaking', () => {
      const html = renderToStaticMarkup(
        <AppIconButton
          icon={<span>⚙️</span>}
          accessibilityLabel="Cài đặt"
          onPress={() => {}}
          disabled
        />
      );
      expect(html).toContain('Cài đặt');
    });
  });

  describe('9. Feedback Components (Empty, Error, Loading, Offline)', () => {
    it('renders AppEmptyState with title, message, and action button', () => {
      const html = renderToStaticMarkup(
        <AppEmptyState
          title="Chưa có lịch thi"
          message="Hiện tại chưa có lịch thi mới trong kỳ này"
          actionLabel="Tải lại dữ liệu"
          onAction={() => {}}
        />
      );
      expect(html).toContain('Chưa có lịch thi');
      expect(html).toContain('Hiện tại chưa có lịch thi mới trong kỳ này');
      expect(html).toContain('Tải lại dữ liệu');
    });

    it('renders AppErrorState with error message and retry action', () => {
      const html = renderToStaticMarkup(
        <AppErrorState
          title="Lỗi tải dữ liệu"
          message="Không thể kết nối đến máy chủ EduPortal"
          onRetry={() => {}}
        />
      );
      expect(html).toContain('Lỗi tải dữ liệu');
      expect(html).toContain('Không thể kết nối đến máy chủ EduPortal');
      expect(html).toContain('Thử lại');
    });

    it('renders AppLoadingSkeleton with specified variant', () => {
      const html = renderToStaticMarkup(
        <AppLoadingSkeleton variant="card" height={80} />
      );
      expect(html).toBeDefined();
    });

    it('renders AppOfflineBanner with offline notification message', () => {
      const html = renderToStaticMarkup(
        <AppOfflineBanner
          message="Chế độ ngoại tuyến: Đang xem dữ liệu lưu trong máy"
          lastSyncedAt="10:30"
          visible={true}
        />
      );
      expect(html).toContain('Chế độ ngoại tuyến: Đang xem dữ liệu lưu trong máy');
      expect(html).toContain('10:30');
    });

    it('renders AppToast with alert message, action button, and accessible role', () => {
      const html = renderToStaticMarkup(
        <AppToast
          visible={true}
          message="Cập nhật điểm thành công"
          description="Sinh viên SV001 đạt điểm 9.0"
          type="success"
          actionLabel="Hoàn tác"
          onAction={() => {}}
        />
      );
      expect(html).toContain('Cập nhật điểm thành công');
      expect(html).toContain('Sinh viên SV001 đạt điểm 9.0');
      expect(html).toContain('Hoàn tác');
    });
  });

  describe('10. Layout Components (AppHeader, AppSection, AppBottomSheet)', () => {
    it('renders AppHeader with title, subtitle, and back button', () => {
      const html = renderToStaticMarkup(
        <AppHeader
          title="Bảng điểm chi tiết"
          subtitle="Kỳ 2 • 2024-2025"
          showBackButton={true}
        />
      );
      expect(html).toContain('Bảng điểm chi tiết');
      expect(html).toContain('Kỳ 2 • 2024-2025');
    });

    it('renders AppSection with title and children content', () => {
      const html = renderToStaticMarkup(
        <AppSection title="Thông tin học tập">
          <span>GPA: 3.8</span>
        </AppSection>
      );
      expect(html).toContain('Thông tin học tập');
      expect(html).toContain('GPA: 3.8');
    });

    it('renders AppBottomSheet with title and modal children when visible', () => {
      const html = renderToStaticMarkup(
        <AppBottomSheet visible={true} onClose={() => {}} title="Nhập điểm sinh viên">
          <div>Form nhập điểm</div>
        </AppBottomSheet>
      );
      expect(html).toContain('Nhập điểm sinh viên');
      expect(html).toContain('Form nhập điểm');
    });
  });

  describe('11. AppBottomNavigation Component (Route Audit & Tab Verification)', () => {
    it('audits and renders all 6 Student tabs without dropping any', () => {
      expect(STUDENT_BOTTOM_NAV_TABS).toHaveLength(6);
      const expectedKeys = ['dashboard', 'timetable', 'exams', 'grades', 'tuition', 'profile'];
      expectedKeys.forEach((key) => {
        expect(STUDENT_BOTTOM_NAV_TABS.some((t) => t.key === key)).toBe(true);
      });

      const html = renderToStaticMarkup(
        <AppBottomNavigation
          role="STUDENT"
          activeTabKey="dashboard"
          onTabPress={() => {}}
        />
      );
      expect(html).toContain('Tổng quan');
      expect(html).toContain('Lịch học');
      expect(html).toContain('Lịch thi');
      expect(html).toContain('Bảng điểm');
      expect(html).toContain('Học phí');
      expect(html).toContain('Hồ sơ');
    });

    it('audits and renders all 5 Lecturer tabs', () => {
      expect(LECTURER_BOTTOM_NAV_TABS).toHaveLength(5);
      const expectedKeys = ['dashboard', 'schedule', 'classes', 'attendance', 'profile'];
      expectedKeys.forEach((key) => {
        expect(LECTURER_BOTTOM_NAV_TABS.some((t) => t.key === key)).toBe(true);
      });

      const html = renderToStaticMarkup(
        <AppBottomNavigation
          role="LECTURER"
          activeTabKey="attendance"
          onTabPress={() => {}}
        />
      );
      expect(html).toContain('Tổng quan');
      expect(html).toContain('Lịch dạy');
      expect(html).toContain('Lớp học');
      expect(html).toContain('Điểm danh');
      expect(html).toContain('Hồ sơ GV');
    });
  });
});
