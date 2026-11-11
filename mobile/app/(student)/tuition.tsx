/**
 * Student Tuition Screen
 * Live integration with GET /api/v1/student/tuition via TanStack Query.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { useStudentTuition } from '@/features/student';
import { ErrorView } from '@/components/common/ErrorView';
import { EmptyState } from '@/components/common/EmptyState';
import { formatCurrencyVND, formatDate } from '@/utils/formatters';

export default function TuitionScreen() {
  const [selectedBankBin, setSelectedBankBin] = useState<string | undefined>(undefined);
  const {
    data: tuition,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useStudentTuition(undefined, selectedBankBin);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PAID':
        return {
          label: 'Đã hoàn thành',
          bg: colors.success.light,
          text: colors.success.dark,
        };
      case 'PARTIAL':
        return {
          label: 'Đã nộp một phần',
          bg: colors.warning.light,
          text: colors.warning.dark,
        };
      case 'NOT_ENROLLED':
        return {
          label: 'Chưa phát sinh',
          bg: colors.neutral[100],
          text: colors.neutral[600],
        };
      case 'UNPAID':
      default:
        return {
          label: 'Chưa thanh toán',
          bg: colors.error.light,
          text: colors.error.dark,
        };
    }
  };

  const statusBadge = getStatusBadge(tuition?.status);
  const courses = tuition?.courses || [];
  const supportedBanks = tuition?.supportedBanks || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            refetch();
          }}
          colors={[colors.primary[800]]}
          tintColor={colors.primary[800]}
        />
      }
    >
      {/* Loading & Error States */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[800]} />
          <Text style={styles.loadingText}>Đang tra cứu học phí kỳ này...</Text>
        </View>
      ) : isError ? (
        <ErrorView
          title="Lỗi tải thông tin học phí"
          message={error?.message || 'Không thể lấy thông tin học phí từ máy chủ.'}
          onRetry={refetch}
        />
      ) : !tuition ? (
        <EmptyState
          icon="wallet-outline"
          title="Không có dữ liệu học phí"
          message="Chưa có thông báo quyết toán học phí cho tài khoản của bạn."
        />
      ) : (
        <>
          {/* Main Tuition Overview Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceSemester}>
                {tuition.semesterName || 'Học kỳ hiện tại'}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                <Text style={[styles.statusText, { color: statusBadge.text }]}>
                  {statusBadge.label}
                </Text>
              </View>
            </View>

            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Số tiền cần nộp</Text>
              <Text style={styles.amountValue}>
                {formatCurrencyVND(tuition.remainingAmount)}
              </Text>
            </View>

            <View style={styles.balanceDivider} />

            <View style={styles.balanceStatsRow}>
              <View style={styles.balanceStatItem}>
                <Text style={styles.statLabel}>Tổng học phí</Text>
                <Text style={styles.statValue}>{formatCurrencyVND(tuition.totalAmount)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.balanceStatItem}>
                <Text style={styles.statLabel}>Đã thanh toán</Text>
                <Text style={[styles.statValue, { color: colors.success.dark }]}>
                  {formatCurrencyVND(tuition.paidAmount)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.balanceStatItem}>
                <Text style={styles.statLabel}>Tổng tín chỉ</Text>
                <Text style={styles.statValue}>{tuition.totalCredits ?? 0} TC</Text>
              </View>
            </View>

            {tuition.dueDate ? (
              <View style={styles.dueDateRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.neutral[500]} />
                <Text style={styles.dueDateText}>
                  Hạn nộp học phí: {formatDate(tuition.dueDate)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* VietQR Quick Payment Section */}
          {tuition.status !== 'PAID' && tuition.remainingAmount > 0 ? (
            <View style={styles.qrCard}>
              <View style={styles.qrHeader}>
                <Ionicons name="qr-code-outline" size={20} color={colors.primary[800]} />
                <Text style={styles.qrTitle}>Chuyển khoản VietQR Napas247</Text>
              </View>

              <Text style={styles.qrSubtitle}>
                Quét mã QR bằng ứng dụng ngân hàng bất kỳ để thanh toán học phí chính xác và tự động gạch nợ.
              </Text>

              {/* Bank Selector Chips if supported */}
              {supportedBanks.length > 1 ? (
                <View style={styles.bankSelector}>
                  {supportedBanks.map((b) => {
                    const isSelected =
                      (selectedBankBin || tuition.bankBin) === b.bankBin;
                    return (
                      <Pressable
                        key={b.bankBin}
                        onPress={() => setSelectedBankBin(b.bankBin)}
                        style={[
                          styles.bankChip,
                          isSelected && styles.bankChipActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Chọn ngân hàng ${b.bankShortName}`}
                      >
                        <Text
                          style={[
                            styles.bankChipText,
                            isSelected && styles.bankChipTextActive,
                          ]}
                        >
                          {b.bankShortName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {/* VietQR Image Preview */}
              {tuition.vietQrQuickLink ? (
                <View style={styles.qrImageWrapper}>
                  <Image
                    source={{ uri: tuition.vietQrQuickLink }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
              ) : null}

              {/* Transfer Details Card */}
              <View style={styles.transferDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngân hàng thụ hưởng:</Text>
                  <Text style={styles.detailValue}>{tuition.bankName || 'MB Bank'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Số tài khoản:</Text>
                  <Text style={[styles.detailValue, styles.accountNumber]}>
                    {tuition.accountNumber || '999988882025'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tên người thụ hưởng:</Text>
                  <Text style={styles.detailValue}>
                    {tuition.accountName || 'HOC VIEN CONG NGHE RIKKEI'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Nội dung chuyển khoản:</Text>
                  <Text style={[styles.detailValue, styles.transferContent]}>
                    {tuition.transferContent || `HP ${tuition.studentCode} ${tuition.semesterName}`}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Course Fee Breakdown Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Chi tiết học phần trong kỳ</Text>
          </View>

          {courses.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="Chưa có học phần"
              message="Chưa có học phần nào được ghi nhận trong hóa đơn học phí."
            />
          ) : (
            courses.map((c, idx) => (
              <View key={`${c.courseCode}-${idx}`} style={styles.courseItemCard}>
                <View style={styles.courseItemLeft}>
                  <View style={styles.courseTopRow}>
                    <Text style={styles.courseCode}>{c.courseCode}</Text>
                    <Text style={styles.creditsTag}>{c.credits} TC</Text>
                  </View>
                  <Text style={styles.courseName}>{c.courseName}</Text>
                </View>
                <Text style={styles.courseFee}>{formatCurrencyVND(c.fee)}</Text>
              </View>
            ))
          )}

          {/* Facility Fee Note */}
          {tuition.facilityFee > 0 ? (
            <View style={styles.facilityFeeRow}>
              <Text style={styles.facilityFeeLabel}>Phí cơ sở vật chất định mức</Text>
              <Text style={styles.facilityFeeVal}>
                {formatCurrencyVND(tuition.facilityFee)}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.sm,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: spacing.sm,
  },
  balanceCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  balanceSemester: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  amountContainer: {
    marginVertical: spacing.xs,
  },
  amountLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  amountValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
    marginTop: 2,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: spacing.md,
  },
  balanceStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
  },
  statValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.neutral[200],
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    backgroundColor: colors.neutral[50],
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  dueDateText: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[600],
  },
  qrCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  qrTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  qrSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  bankSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  bankChip: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[50],
  },
  bankChipActive: {
    backgroundColor: colors.primary[800],
    borderColor: colors.primary[800],
  },
  bankChipText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[700],
    fontWeight: typography.weights.medium,
  },
  bankChipTextActive: {
    color: colors.neutral[0],
    fontWeight: typography.weights.bold,
  },
  qrImageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.neutral[0],
  },
  transferDetails: {
    backgroundColor: colors.neutral[50],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  detailValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[800],
    flex: 1,
    textAlign: 'right',
  },
  accountNumber: {
    color: colors.primary[800],
    fontWeight: typography.weights.bold,
  },
  transferContent: {
    color: colors.primary[700],
    fontWeight: typography.weights.bold,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  courseItemCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courseItemLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  courseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  courseCode: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    color: colors.primary[700],
    textTransform: 'uppercase',
  },
  creditsTag: {
    fontSize: 10,
    color: colors.neutral[500],
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  courseName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[900],
    marginTop: 2,
  },
  courseFee: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
  },
  facilityFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  facilityFeeLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
  },
  facilityFeeVal: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
  },
});
