/**
 * Student Tuition & PayOS Online Payment Tests (TASK ST-04)
 * Validates tuition debt calculation, course breakdown, VietQR details,
 * PayOS payment link creation, dynamic QR rendering, and authoritative backend status verification.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import TuitionScreen from '@/app/(student)/tuition';
import { useStudentTuition, usePayOSPayment } from '@/features/student/hooks';
import { PayOSCheckoutModal } from '@/features/student/components/PayOSCheckoutModal';
import { Tuition, PayOSPaymentLinkResponse } from '@/features/student/types';

jest.mock('@/features/student/hooks', () => ({
  useStudentTuition: jest.fn(),
  usePayOSPayment: jest.fn(),
  useSemesters: jest.fn().mockReturnValue({
    data: [
      { id: 2, semesterCode: '2024-25_SEM2', semesterName: 'Học kỳ 2 (2024-2025)', isActive: true },
      { id: 1, semesterCode: '2024-25_SEM1', semesterName: 'Học kỳ 1 (2024-2025)', isActive: false },
    ],
    isLoading: false,
  }),
}));

describe('Student Tuition & PayOS Online Payment Subsystem (TASK ST-04)', () => {
  const mockTuitionUnpaid: Tuition = {
    id: 1,
    studentCode: 'SV2026001',
    studentName: 'Nguyễn Văn A',
    semesterName: 'Học kỳ 1 2026-2027',
    totalCredits: 18,
    totalAmount: 9500000,
    paidAmount: 2000000,
    remainingAmount: 7500000,
    creditUnitPrice: 500000,
    excessAmount: 0,
    facilityFee: 500000,
    status: 'PARTIAL',
    dueDate: '2026-12-30',
    bankName: 'Ngân hàng Quân Đội (MB Bank)',
    bankBin: '970422',
    accountNumber: '999988882025',
    accountName: 'HOC VIEN CONG NGHE RIKKEI',
    transferContent: 'HP SV2026001 HK1 2026',
    vietQrQuickLink: 'https://img.vietqr.io/image/970422-999988882025-compact2.png',
    courses: [
      {
        courseCode: 'CS101',
        courseName: 'Lập trình Java căn bản',
        credits: 3,
        fee: 1500000,
      },
      {
        courseCode: 'CS201',
        courseName: 'Cấu trúc dữ liệu và giải thuật',
        credits: 4,
        fee: 2000000,
      },
    ],
    supportedBanks: [
      {
        bankBin: '970422',
        bankName: 'MB Bank',
        bankShortName: 'MB',
        accountNumber: '999988882025',
        accountName: 'HOC VIEN CONG NGHE RIKKEI',
      },
      {
        bankBin: '970415',
        bankName: 'VietinBank',
        bankShortName: 'CTG',
        accountNumber: '111122222025',
        accountName: 'HOC VIEN CONG NGHE RIKKEI',
      },
    ],
  };

  const mockTuitionPaid: Tuition = {
    ...mockTuitionUnpaid,
    paidAmount: 9500000,
    remainingAmount: 0,
    status: 'PAID',
  };

  const mockPaymentData: PayOSPaymentLinkResponse = {
    orderCode: 20261119001,
    checkoutUrl: 'https://pay.payos.vn/web/test-checkout-url-20261119',
    qrCode: '00020101021238580010A0000007270126000697042201129999888820250208QRIBFTTA5303704540775000005802VN62240820HP SV2026001 HK1 20266304ABCD',
    amount: 7500000,
    description: 'HP SV2026001 HK1 2026',
    status: 'PENDING',
    accountNumber: '999988882025',
    accountName: 'HOC VIEN CONG NGHE RIKKEI',
    bin: '970422',
    paymentLinkId: 'plink_20261119_test',
  };

  const defaultMockPayos = {
    state: {
      status: 'idle',
      paymentData: null,
      verifiedTuition: null,
      errorMessage: null,
    },
    paymentData: null,
    verifiedTuition: null,
    errorMessage: null,
    isCreating: false,
    isCheckoutReady: false,
    isVerifying: false,
    isSuccess: false,
    initiateCheckout: jest.fn(),
    verifyPaymentWithBackend: jest.fn(),
    verifyPaymentStatus: jest.fn(),
    resetCheckout: jest.fn(),
    reset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePayOSPayment as jest.Mock).mockReturnValue(defaultMockPayos);
  });

  test('TC-ST04-01: Renders tuition overview card with correct balances and status', () => {
    (useStudentTuition as jest.Mock).mockReturnValue({
      data: mockTuitionUnpaid,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const html = renderToStaticMarkup(<TuitionScreen />);

    expect(html).toContain('Học kỳ 1 2026-2027');
    expect(html).toContain('Đã nộp một phần');
    expect(html).toContain('7.500.000'); // Remaining
    expect(html).toContain('9.500.000'); // Total
    expect(html).toContain('2.000.000'); // Paid
    expect(html).toContain('18 TC');
  });

  test('TC-ST04-02: Renders course fee breakdown and facility fee', () => {
    (useStudentTuition as jest.Mock).mockReturnValue({
      data: mockTuitionUnpaid,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const html = renderToStaticMarkup(<TuitionScreen />);

    expect(html).toContain('CS101');
    expect(html).toContain('Lập trình Java căn bản');
    expect(html).toContain('1.500.000');
    expect(html).toContain('CS201');
    expect(html).toContain('Cấu trúc dữ liệu và giải thuật');
    expect(html).toContain('2.000.000');
    expect(html).toContain('Phí cơ sở vật chất định mức');
    expect(html).toContain('500.000');
  });

  test('TC-ST04-03: Displays PayOS checkout trigger button when tuition is unpaid', () => {
    (useStudentTuition as jest.Mock).mockReturnValue({
      data: mockTuitionUnpaid,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const html = renderToStaticMarkup(<TuitionScreen />);

    expect(html).toContain('Thanh toán trực tuyến PayOS');
    expect(html).toContain('Chuyển khoản VietQR Napas247');
    expect(html).toContain('999988882025');
  });

  test('TC-ST04-04: Hides PayOS checkout button when tuition is fully PAID', () => {
    (useStudentTuition as jest.Mock).mockReturnValue({
      data: mockTuitionPaid,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const html = renderToStaticMarkup(<TuitionScreen />);

    expect(html).toContain('Đã hoàn thành');
    expect(html).not.toContain('Thanh toán trực tuyến PayOS');
    expect(html).not.toContain('Chuyển khoản VietQR Napas247');
  });

  test('TC-ST04-05: Renders PayOSCheckoutModal in checkout_ready state with QR and order code', () => {
    const html = renderToStaticMarkup(
      <PayOSCheckoutModal
        visible={true}
        onClose={jest.fn()}
        paymentData={mockPaymentData}
        isVerifying={false}
        isSuccess={false}
        verifiedTuition={null}
        errorMessage={null}
        onVerify={jest.fn()}
      />
    );

    expect(html).toContain('Thanh toán học phí trực tuyến');
    expect(html).toContain('#20261119001');
    expect(html).toContain('7.500.000');
    expect(html).toContain('HP SV2026001 HK1 2026');
    expect(html).toContain('Mở trang thanh toán PayOS');
    expect(html).toContain('Kiểm tra trạng thái thanh toán');
  });

  test('TC-ST04-06: Renders PayOSCheckoutModal verifying state with spinner', () => {
    const html = renderToStaticMarkup(
      <PayOSCheckoutModal
        visible={true}
        onClose={jest.fn()}
        paymentData={mockPaymentData}
        isVerifying={true}
        isSuccess={false}
        verifiedTuition={null}
        errorMessage={null}
        onVerify={jest.fn()}
      />
    );

    expect(html).toContain('payos-verifying-indicator');
  });

  test('TC-ST04-07: Renders PayOSCheckoutModal success state with receipt and remaining balance', () => {
    const html = renderToStaticMarkup(
      <PayOSCheckoutModal
        visible={true}
        onClose={jest.fn()}
        paymentData={mockPaymentData}
        isVerifying={false}
        isSuccess={true}
        verifiedTuition={mockTuitionPaid}
        errorMessage={null}
        onVerify={jest.fn()}
      />
    );

    expect(html).toContain('Thanh toán thành công!');
    expect(html).toContain('Hệ thống EduPortal đã ghi nhận và gạch nợ học phí');
    expect(html).toContain('Hoàn tất');
  });

  test('TC-ST04-08: Renders PayOSCheckoutModal error state when verification fails', () => {
    const html = renderToStaticMarkup(
      <PayOSCheckoutModal
        visible={true}
        onClose={jest.fn()}
        paymentData={mockPaymentData}
        isVerifying={false}
        isSuccess={false}
        verifiedTuition={null}
        errorMessage="Giao dịch chưa hoàn tất hoặc đang chờ ngân hàng quyết toán."
        onVerify={jest.fn()}
      />
    );

    expect(html).toContain('Giao dịch chưa hoàn tất hoặc đang chờ ngân hàng quyết toán.');
    expect(html).toContain('payos-verify-button');
  });

  test('TC-ST04-09: Handles empty tuition record gracefully', () => {
    (useStudentTuition as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const html = renderToStaticMarkup(<TuitionScreen />);

    expect(html).toContain('Không có dữ liệu học phí');
    expect(html).toContain('Chưa có thông báo quyết toán học phí');
  });

  test('TC-ST04-10: Handles tuition query error with retry option', () => {
    (useStudentTuition as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Không thể kết nối đến máy chủ'),
      refetch: jest.fn(),
      isRefetching: false,
    });

    const html = renderToStaticMarkup(<TuitionScreen />);

    expect(html).toContain('Lỗi tải thông tin học phí');
    expect(html).toContain('Không thể kết nối đến máy chủ');
  });
});
