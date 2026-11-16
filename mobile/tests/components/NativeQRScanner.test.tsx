/**
 * NativeQRScanner.test.tsx
 * Unit & Security Test Suite for NativeQRScanner (TASK 7.4)
 *
 * Test Groups:
 * - Group A: Camera Permissions Lifecycle & States
 * - Group B: UI Layout, Elements, Torch & Close Controls
 * - Group C: Barcode Scanning, Sanitization & Anti-Double-Scan Mutex Lock
 * - Group D: Lifecycle & Closed State
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import { Linking, Platform } from 'react-native';
import { NativeQRScanner, NativeQRScannerProps } from '@/components/qr/NativeQRScanner';

const {
  __setMockCameraPermission,
  __getLastCameraProps,
  __resetMockCamera,
} = require('expo-camera');

describe('NativeQRScanner Component (TASK 7.4)', () => {
  const onScanMock = jest.fn();
  const onCancelMock = jest.fn();
  const onErrorMock = jest.fn();

  beforeEach(() => {
    jest.restoreAllMocks();
    __resetMockCamera();
    onScanMock.mockReset();
    onCancelMock.mockReset();
    onErrorMock.mockReset();
    Platform.OS = 'android';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function renderScanner(props?: Partial<NativeQRScannerProps>) {
    const html = renderToStaticMarkup(
      <NativeQRScanner
        isOpen={true}
        onScan={onScanMock}
        onCancel={onCancelMock}
        onError={onErrorMock}
        {...props}
      />
    );
    return {
      html,
      cameraProps: __getLastCameraProps(),
    };
  }

  // ── Group A: Camera Permissions Lifecycle & States ──
  describe('Group A: Camera Permissions Lifecycle & States', () => {
    it('A1: renders CameraView when camera permission is granted', () => {
      __setMockCameraPermission({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      const { html, cameraProps } = renderScanner();

      expect(html).toContain('native-qr-scanner-modal');
      expect(html).toContain('native-camera-view');
      expect(cameraProps).toBeDefined();
      expect(cameraProps.facing).toBe('back');
      expect(cameraProps.barcodeScannerSettings).toEqual({ barcodeTypes: ['qr'] });
    });

    it('A2: renders permission denied view with retry button when denied but canAskAgain is true', () => {
      __setMockCameraPermission({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      });

      const { html } = renderScanner();

      expect(html).toContain('qr-scanner-permission-denied');
      expect(html).toContain('Cần Quyền Truy Cập Máy Ảnh');
      expect(html).toContain('qr-scanner-grant-permission-button');
      expect(html).toContain('Cấp Quyền Máy Ảnh');
      expect(html).not.toContain('native-camera-view');
    });

    it('A3: renders permission permanently denied view with open settings button when canAskAgain is false', () => {
      __setMockCameraPermission({
        status: 'denied',
        granted: false,
        canAskAgain: false,
        expires: 'never',
      });

      const { html } = renderScanner();

      expect(html).toContain('qr-scanner-permission-denied');
      expect(html).toContain('qr-scanner-open-settings-button');
      expect(html).toContain('Mở Cài Đặt Thiết Bị');
      expect(html).not.toContain('qr-scanner-grant-permission-button');
    });

    it('A4: renders loading state when permission is null/undefined', () => {
      __setMockCameraPermission(null);

      const { html } = renderScanner();

      expect(html).toContain('qr-scanner-loading');
      expect(html).toContain('Đang kiểm tra quyền máy ảnh...');
      expect(html).not.toContain('native-camera-view');
    });
  });

  // ── Group B: UI Layout, Elements, Torch & Close Controls ──
  describe('Group B: UI Layout, Elements, Torch & Close Controls', () => {
    it('B1: renders null when isOpen is false', () => {
      const html = renderToStaticMarkup(
        <NativeQRScanner
          isOpen={false}
          onScan={onScanMock}
          onCancel={onCancelMock}
          onError={onErrorMock}
        />
      );

      expect(html).toBe('');
    });

    it('B2: renders header bar with close button, title, and torch toggle', () => {
      const { html } = renderScanner({
        title: 'Điểm Danh Môn CS101',
        hint: 'Căn chỉnh mã QR trong khung',
      });

      expect(html).toContain('qr-scanner-close-button');
      expect(html).toContain('Điểm Danh Môn CS101');
      expect(html).toContain('qr-scanner-torch-button');
      expect(html).toContain('qr-viewfinder-frame');
      expect(html).toContain('Căn chỉnh mã QR trong khung');
    });

    it('B3: renders cancel link in permission denied state', () => {
      __setMockCameraPermission({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      });

      const { html } = renderScanner();

      expect(html).toContain('Hủy Bỏ');
    });
  });

  // ── Group C: Barcode Scanning, Sanitization & Anti-Double-Scan Mutex Lock ──
  describe('Group C: Barcode Scanning, Sanitization & Anti-Double-Scan Mutex Lock', () => {
    const validQrToken = 'session_123.section_456.11962500.a3f89e81b2c45d6e7f8a9b0c';

    it('C1: successfully invokes onScan with sanitized QR payload', () => {
      const { cameraProps } = renderScanner();
      expect(cameraProps).toBeDefined();

      cameraProps.onBarcodeScanned({ data: `  ${validQrToken}  ` });

      expect(onScanMock).toHaveBeenCalledTimes(1);
      expect(onScanMock).toHaveBeenCalledWith(validQrToken);
      expect(onErrorMock).not.toHaveBeenCalled();
    });

    it('C2: suppresses duplicate scans via single mutex lock', () => {
      const { cameraProps } = renderScanner();

      // First scan: should succeed
      cameraProps.onBarcodeScanned({ data: validQrToken });
      expect(onScanMock).toHaveBeenCalledTimes(1);
      expect(onScanMock).toHaveBeenCalledWith(validQrToken);

      // Subsequent scan calls should be dropped by mutex
      cameraProps.onBarcodeScanned({ data: validQrToken });
      cameraProps.onBarcodeScanned({ data: 'another_token_after_lock' });

      expect(onScanMock).toHaveBeenCalledTimes(1);
    });

    it('C3: triggers onError with EMPTY_QR_TOKEN when scanned data is empty whitespace', () => {
      const { cameraProps } = renderScanner();

      cameraProps.onBarcodeScanned({ data: '   ' });

      expect(onScanMock).not.toHaveBeenCalled();
      expect(onErrorMock).toHaveBeenCalledWith({
        code: 'EMPTY_QR_TOKEN',
        message: 'Mã QR rỗng',
      });
    });

    it('C4: triggers onError with INVALID_QR_PAYLOAD when data is missing or not a string', () => {
      const { cameraProps } = renderScanner();

      cameraProps.onBarcodeScanned({ data: null as any });

      expect(onScanMock).not.toHaveBeenCalled();
      expect(onErrorMock).toHaveBeenCalledWith({
        code: 'INVALID_QR_PAYLOAD',
        message: 'Dữ liệu mã QR rỗng hoặc không hợp lệ',
      });
    });

    it('C5: triggers onError with QR_PAYLOAD_TOO_LARGE when payload exceeds 2048 chars', () => {
      const { cameraProps } = renderScanner();
      const oversizedPayload = 'A'.repeat(2049);

      cameraProps.onBarcodeScanned({ data: oversizedPayload });

      expect(onScanMock).not.toHaveBeenCalled();
      expect(onErrorMock).toHaveBeenCalledWith({
        code: 'QR_PAYLOAD_TOO_LARGE',
        message: 'Dữ liệu mã QR vượt quá dung lượng cho phép',
      });
    });
  });
});
