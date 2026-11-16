/**
 * Attendance QR Code Presentation Box - REDS v2.0
 * Displays active dynamic TOTP QR code with quiet zone, 15-second countdown ticker,
 * and inactive session lock state (Security hardened: token hint removed per F-02).
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { tokens } from '@/theme';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { DynamicQrResponse } from '../types';

export interface AttendanceQrBoxProps {
  isSessionLoading: boolean;
  isSessionActive: boolean;
  isQrLoading: boolean;
  qrData?: DynamicQrResponse | null;
  countdown: number;
  sectionCode?: string;
  testID?: string;
}

export const AttendanceQrBox: React.FC<AttendanceQrBoxProps> = ({
  isSessionLoading,
  isSessionActive,
  isQrLoading,
  qrData,
  countdown,
  sectionCode,
  testID = 'attendance-qr-box',
}) => {
  return (
    <AppCard variant="elevated" style={styles.qrContainer} testID={testID}>
      {isSessionLoading ? (
        <View style={styles.qrLoadingBox}>
          <ActivityIndicator size="large" color={tokens.brand.burgundy} />
          <AppText variant="body" color="muted" style={styles.loadingText}>
            Đang kiểm tra trạng thái phiên...
          </AppText>
        </View>
      ) : isSessionActive ? (
        <View style={styles.activeQrWrapper}>
          {/* Live QR Image Box with optical Quiet Zone */}
          <View style={styles.qrBox} testID="attendance-qr-image-container">
            {isQrLoading || !qrData ? (
              <ActivityIndicator size="large" color={tokens.brand.burgundy} />
            ) : qrData.qrImageBase64 ? (
              <Image
                source={{ uri: qrData.qrImageBase64 }}
                style={styles.qrImage}
                contentFit="contain"
                accessibilityLabel="Mã QR điểm danh động 15 giây"
              />
            ) : (
              <View style={styles.qrFallback}>
                <Ionicons name="qr-code" size={160} color={tokens.text.primary} />
              </View>
            )}
          </View>

          {/* Countdown Badge with Ticker */}
          <View
            style={styles.timerBadge}
            accessibilityRole="timer"
            accessibilityLabel={`Mã làm mới sau ${countdown} giây`}
          >
            <Ionicons name="timer-outline" size={18} color={tokens.semantic.warning.dark} />
            <AppText variant="bodyBold" style={{ color: tokens.semantic.warning.dark }}>
              Mã làm mới sau: {countdown}s
            </AppText>
          </View>
        </View>
      ) : (
        <View style={styles.inactiveQrWrapper} testID="attendance-qr-inactive">
          <View style={styles.inactiveIconCircle}>
            <Ionicons name="lock-closed-outline" size={40} color={tokens.text.muted} />
          </View>
          <AppText variant="h3" color="primary" style={styles.inactiveTitle}>
            Phiên điểm danh chưa bắt đầu
          </AppText>
          <AppText variant="body" color="muted" style={styles.inactiveDesc}>
            Nhấn nút bên dưới để khởi tạo phiên điểm danh QR động cho sinh viên lớp{' '}
            {sectionCode || 'này'}
          </AppText>
        </View>
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  qrContainer: {
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    alignItems: 'center',
    backgroundColor: tokens.surface.card,
    marginBottom: tokens.spacing.md,
  },
  qrLoadingBox: {
    padding: tokens.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: tokens.spacing.xs,
  },
  activeQrWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  qrBox: {
    width: 220,
    height: 220,
    backgroundColor: '#FFFFFF', // Solid pure white background for QR quiet zone
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.border.default,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    ...tokens.elevation.sm,
  },
  qrImage: {
    width: 190,
    height: 190,
  },
  qrFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.semantic.warning.light,
    borderWidth: 1,
    borderColor: tokens.semantic.warning.border,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    marginTop: tokens.spacing.md,
  },
  inactiveQrWrapper: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.lg,
  },
  inactiveIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: tokens.surface.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sm,
  },
  inactiveTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  inactiveDesc: {
    textAlign: 'center',
    paddingHorizontal: tokens.spacing.md,
    lineHeight: 18,
  },
});
