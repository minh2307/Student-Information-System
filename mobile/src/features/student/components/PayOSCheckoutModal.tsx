/**
 * PayOS Checkout & Verification Modal Component (TASK ST-04)
 * Displays dynamic QR code, order details, checkout URL action,
 * and authoritative status verification via Backend API.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { formatCurrencyVND } from '@/utils/formatters';
import { PayOSPaymentLinkResponse, Tuition } from '../types';

interface PayOSCheckoutModalProps {
  visible: boolean;
  onClose: () => void;
  paymentData: PayOSPaymentLinkResponse | null;
  isVerifying: boolean;
  isSuccess: boolean;
  verifiedTuition: Tuition | null;
  errorMessage: string | null;
  onVerify: () => void;
  testID?: string;
}

export const PayOSCheckoutModal: React.FC<PayOSCheckoutModalProps> = ({
  visible,
  onClose,
  paymentData,
  isVerifying,
  isSuccess,
  verifiedTuition,
  errorMessage,
  onVerify,
  testID = 'payos-checkout-modal',
}) => {
  if (!visible) return null;

  const handleOpenCheckoutUrl = async () => {
    if (paymentData?.checkoutUrl) {
      try {
        await Linking.openURL(paymentData.checkoutUrl);
      } catch (err) {
        console.warn('Failed to open checkout url:', err);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} testID={testID}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Đóng thanh toán"
            testID="payos-modal-close"
          >
            <Ionicons name="close" size={24} color={colors.neutral[800]} />
          </Pressable>
          <Text style={styles.headerTitle}>Thanh toán học phí trực tuyến</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Success State */}
          {isSuccess ? (
            <View style={styles.successCard} testID="payos-success-view">
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={56} color={colors.success.dark} />
              </View>
              <Text style={styles.successTitle}>Thanh toán thành công!</Text>
              <Text style={styles.successSubtitle}>
                Hệ thống EduPortal đã ghi nhận và gạch nợ học phí của bạn thành công.
              </Text>

              <View style={styles.receiptBox}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Mã giao dịch:</Text>
                  <Text style={styles.receiptValue}>#{paymentData?.orderCode || 'PAID'}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Số tiền đã thanh toán:</Text>
                  <Text style={[styles.receiptValue, styles.amountHighlight]}>
                    {formatCurrencyVND(paymentData?.amount || 0)}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Dư nợ còn lại:</Text>
                  <Text style={[styles.receiptValue, { color: colors.success.dark }]}>
                    {formatCurrencyVND(verifiedTuition?.remainingAmount || 0)}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Cổng thanh toán:</Text>
                  <Text style={styles.receiptValue}>PayOS VietQR Napas247</Text>
                </View>
              </View>

              <Pressable
                style={styles.primaryButton}
                onPress={onClose}
                accessibilityRole="button"
                testID="payos-finish-button"
              >
                <Text style={styles.primaryButtonText}>Hoàn tất</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Payment Info Card */}
              <View style={styles.orderSummaryCard} testID="payos-order-summary">
                <View style={styles.orderTopRow}>
                  <Text style={styles.orderLabel}>Mã đơn hàng PayOS</Text>
                  <Text style={styles.orderCodeText}>#{paymentData?.orderCode || '---'}</Text>
                </View>

                <View style={styles.amountBox}>
                  <Text style={styles.amountBoxLabel}>Số tiền quyết toán</Text>
                  <Text style={styles.amountBoxVal}>
                    {formatCurrencyVND(paymentData?.amount || 0)}
                  </Text>
                </View>

                {paymentData?.isMock && (
                  <View style={styles.mockBadge}>
                    <Text style={styles.mockBadgeText}>Môi trường Thử nghiệm Sandbox</Text>
                  </View>
                )}
              </View>

              {/* Dynamic QR Code Card */}
              {paymentData?.qrCode ? (
                <View style={styles.qrContainer} testID="payos-qr-container">
                  <Text style={styles.qrInstruction}>
                    Quét mã VietQR bằng app Ngân hàng để thanh toán tự động
                  </Text>
                  <View style={styles.qrImageWrapper}>
                    <Image
                      source={{ uri: paymentData.qrCode }}
                      style={styles.qrImage}
                      resizeMode="contain"
                      testID="payos-qr-image"
                    />
                  </View>
                </View>
              ) : null}

              {/* Transfer Details */}
              <View style={styles.detailsCard}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Ngân hàng thụ hưởng:</Text>
                  <Text style={styles.detailVal}>{paymentData?.accountName || 'VietinBank'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Số tài khoản:</Text>
                  <Text style={[styles.detailVal, styles.boldVal]}>
                    {paymentData?.accountNumber || '---'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Nội dung chuyển khoản:</Text>
                  <Text style={[styles.detailVal, styles.highlightVal]}>
                    {paymentData?.description || '---'}
                  </Text>
                </View>
              </View>

              {/* Verification Message / Error */}
              {errorMessage && (
                <View style={styles.errorBanner} testID="payos-error-banner">
                  <Ionicons name="information-circle" size={16} color={colors.warning.dark} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsContainer}>
                {paymentData?.checkoutUrl ? (
                  <Pressable
                    style={styles.openUrlButton}
                    onPress={handleOpenCheckoutUrl}
                    accessibilityRole="button"
                    testID="payos-open-checkout-btn"
                  >
                    <Ionicons name="globe-outline" size={18} color={colors.neutral[0]} />
                    <Text style={styles.openUrlButtonText}>Mở trang thanh toán PayOS</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  style={[styles.verifyButton, isVerifying && styles.buttonDisabled]}
                  onPress={onVerify}
                  disabled={isVerifying}
                  accessibilityRole="button"
                  testID="payos-verify-button"
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color={colors.primary[900]} testID="payos-verifying-indicator" />
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={18} color={colors.primary[900]} />
                      <Text style={styles.verifyButtonText}>Kiểm tra trạng thái thanh toán</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  orderSummaryCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  orderCodeText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
  },
  amountBox: {
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  amountBoxLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  amountBoxVal: {
    fontSize: typography.sizes.h1,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  mockBadge: {
    alignSelf: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginTop: spacing.sm,
  },
  mockBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: '#B45309',
  },
  qrContainer: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  qrInstruction: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  qrImageWrapper: {
    width: 220,
    height: 220,
    backgroundColor: colors.neutral[0],
    borderRadius: radius.md,
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  detailsCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  detailVal: {
    fontSize: typography.sizes.caption,
    color: colors.neutral[800],
  },
  boldVal: {
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  highlightVal: {
    fontWeight: typography.weights.bold,
    color: '#1D4ED8',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: '#92400E',
    flex: 1,
  },
  actionsContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  openUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[900],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  openUrlButtonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.neutral[0],
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[0],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary[900],
    gap: spacing.xs,
  },
  verifyButtonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  successIconCircle: {
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: typography.sizes.caption,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  receiptBox: {
    width: '100%',
    backgroundColor: colors.neutral[50],
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  receiptValue: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[800],
  },
  amountHighlight: {
    color: colors.primary[900],
    fontWeight: typography.weights.bold,
  },
  primaryButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[900],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  primaryButtonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.neutral[0],
  },
});
