/**
 * NativeQRScanner.tsx
 * Secure Native Camera QR Scanner Component for Student Attendance (TASK 7.4).
 *
 * Implements Android Native Camera integration via expo-camera (CameraView):
 * 1. Camera Permission Lifecycle (undetermined, granted, denied, permanently denied).
 * 2. Viewfinder Target Frame & UX Guides.
 * 3. Double-scan Suppression & Single-scan Mutex Lock.
 * 4. Torch / Flashlight Toggle Support.
 * 5. Lifecycle containment: immediately stops camera on scan/cancel/unmount.
 * 6. Zero credential leakage: camera operates entirely isolated from tokens.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

export interface NativeQRScannerProps {
  isOpen: boolean;
  onScan: (qrToken: string) => void;
  onCancel: () => void;
  onError?: (error: { code: string; message: string }) => void;
  title?: string;
  hint?: string;
  testID?: string;
}

export const NativeQRScanner: React.FC<NativeQRScannerProps> = ({
  isOpen,
  onScan,
  onCancel,
  onError,
  title = 'Điểm Danh Sinh Viên',
  hint = 'Đặt mã QR điểm danh vào trong khung vuông để quét',
  testID = 'native-qr-scanner-modal',
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const isLockedRef = useRef(false);

  // Reset scan lock whenever the scanner is reopened
  useEffect(() => {
    if (isOpen) {
      isLockedRef.current = false;
      setTorch(false);
    }
  }, [isOpen]);

  // Request permission automatically if undetermined on open
  useEffect(() => {
    if (isOpen && permission && permission.status === 'undetermined') {
      requestPermission().catch((err) => {
        onError?.({ code: 'PERMISSION_REQUEST_FAILED', message: err?.message || 'Không thể yêu cầu quyền máy ảnh' });
      });
    }
  }, [isOpen, permission, requestPermission, onError]);

  // Handle scanned barcode with anti-double-scan debounce and validation
  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (isLockedRef.current) {
        return;
      }

      if (!data || typeof data !== 'string') {
        onError?.({ code: 'INVALID_QR_PAYLOAD', message: 'Dữ liệu mã QR rỗng hoặc không hợp lệ' });
        return;
      }

      const cleanToken = data.trim();
      if (cleanToken.length === 0) {
        onError?.({ code: 'EMPTY_QR_TOKEN', message: 'Mã QR rỗng' });
        return;
      }

      if (cleanToken.length > 2048) {
        onError?.({ code: 'QR_PAYLOAD_TOO_LARGE', message: 'Dữ liệu mã QR vượt quá dung lượng cho phép' });
        return;
      }

      // Lock scanner to prevent duplicate callbacks while processing
      isLockedRef.current = true;
      setTorch(false);

      onScan(cleanToken);
    },
    [onScan, onError]
  );

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      // Fallback
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent={false}
      onRequestClose={onCancel}
      testID={testID}
    >
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onCancel}
            testID="qr-scanner-close-button"
            accessibilityLabel="Đóng máy quét"
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setTorch((prev) => !prev)}
            testID="qr-scanner-torch-button"
            accessibilityLabel="Bật tắt đèn flash"
          >
            <Ionicons
              name={torch ? 'flash' : 'flash-outline'}
              size={24}
              color={torch ? '#FBBF24' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Permission Loading / Checking State */}
        {!permission ? (
          <View style={styles.centerContent} testID="qr-scanner-loading">
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.stateText}>Đang kiểm tra quyền máy ảnh...</Text>
          </View>
        ) : !permission.granted ? (
          /* Permission Denied or Permanently Denied State */
          <View style={styles.centerContent} testID="qr-scanner-permission-denied">
            <Ionicons name="camera-reverse-outline" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Cần Quyền Truy Cập Máy Ảnh</Text>
            <Text style={styles.errorDescription}>
              Ứng dụng cần quyền sử dụng máy ảnh để quét mã QR điểm danh buổi học.
            </Text>
            {permission.canAskAgain ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => requestPermission()}
                testID="qr-scanner-grant-permission-button"
              >
                <Text style={styles.actionButtonText}>Cấp Quyền Máy Ảnh</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.settingsButton]}
                onPress={handleOpenSettings}
                testID="qr-scanner-open-settings-button"
              >
                <Text style={styles.actionButtonText}>Mở Cài Đặt Thiết Bị</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelLink} onPress={onCancel}>
              <Text style={styles.cancelLinkText}>Hủy Bỏ</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Camera View & Viewfinder Overlay */
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={handleBarcodeScanned}
              testID="native-camera-view"
            />

            {/* Dark Mask with Clear Target Cutout */}
            <View style={styles.overlay}>
              <View style={styles.overlayTop} />
              <View style={styles.overlayMiddle}>
                <View style={styles.overlaySide} />
                <View style={styles.viewfinderFrame} testID="qr-viewfinder-frame">
                  {/* Viewfinder Corner Accents */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <View style={styles.overlaySide} />
              </View>
              <View style={styles.overlayBottom}>
                <Text style={styles.hintText}>{hint}</Text>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Máy ảnh đang sẵn sàng</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const VIEWFINDER_SIZE = 260;
const CORNER_SIZE = 24;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    height: Platform.OS === 'ios' ? 90 : 64,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  stateText: {
    color: '#CBD5E1',
    marginTop: 16,
    fontSize: 15,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  errorDescription: {
    color: '#94A3B8',
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionButton: {
    backgroundColor: '#7F1D1D', // Rikkei Red brand color
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radius.lg,
    marginTop: 28,
    width: '100%',
    alignItems: 'center',
  },
  settingsButton: {
    backgroundColor: '#2563EB',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelLink: {
    marginTop: 20,
    padding: 10,
  },
  cancelLinkText: {
    color: '#94A3B8',
    fontSize: 15,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    height: VIEWFINDER_SIZE,
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  viewfinderFrame: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#38BDF8', // Cyan scanning guides
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  overlayBottom: {
    flex: 1.2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 32,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E', // Green ready pulse
    marginRight: 8,
  },
  statusText: {
    color: '#E2E8F0',
    fontSize: 13,
  },
});
