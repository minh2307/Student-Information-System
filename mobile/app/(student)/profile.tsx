/**
 * Student Profile Screen
 * Live integration with GET /api/v1/profile/me and PUT /api/v1/profile/me.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { formatCgpa } from '@/utils/formatters';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const studentProfile = useAuthStore((state) => state.studentProfile);
  const logout = useAuthStore((state) => state.logout);

  const { profile, refetch, isRefetching, updateProfile, isUpdating } = useProfile();

  // Active display data prioritizing fresh query data over store
  const displayUser = profile?.user || user;
  const displayStudent = profile?.studentProfile || studentProfile;

  // Edit Profile Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = () => {
    setFullNameInput(displayUser?.fullName || '');
    setEmailInput(displayUser?.email || '');
    setEditError(null);
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!fullNameInput.trim()) {
      setEditError('Họ và tên không được để trống');
      return;
    }
    if (!emailInput.trim() || !emailInput.includes('@')) {
      setEditError('Email không hợp lệ');
      return;
    }

    try {
      setEditError(null);
      await updateProfile({
        fullName: fullNameInput.trim(),
        email: emailInput.trim(),
      });
      setIsEditModalVisible(false);
      Alert.alert('Thành công', 'Cập nhật thông tin hồ sơ thành công!');
    } catch (err: any) {
      setEditError(err?.message || 'Không thể cập nhật hồ sơ. Vui lòng thử lại.');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

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
      {/* Profile Header Card */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(displayUser?.fullName || 'SV').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{displayUser?.fullName || 'Nguyễn Văn C'}</Text>
        <Text style={styles.userEmail}>{displayUser?.email || 'sv2024001@rikkei.edu.vn'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>SINH VIÊN CHÍNH QUY</Text>
        </View>
      </View>

      {/* Academic Information Card */}
      <View style={styles.infoCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Thông tin Học vụ</Text>
          <Pressable
            style={({ pressed }) => [styles.editIconBtn, pressed && styles.btnPressed]}
            onPress={openEditModal}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Chỉnh sửa thông tin"
          >
            <Ionicons name="create-outline" size={18} color={colors.primary[800]} />
            <Text style={styles.editBtnText}>Sửa</Text>
          </Pressable>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mã sinh viên</Text>
          <Text style={[styles.infoValue, styles.codeValue]}>
            {displayStudent?.studentCode || displayUser?.username || 'SV2024001'}
          </Text>
        </View>
        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Chuyên ngành</Text>
          <Text style={styles.infoValue}>
            {displayStudent?.major || 'B.Tech - Computer Science'}
          </Text>
        </View>
        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Học kỳ hiện tại</Text>
          <Text style={styles.infoValue}>Kỳ {displayStudent?.currentSemester || 6}</Text>
        </View>
        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tín chỉ tích lũy</Text>
          <Text style={styles.infoValue}>
            {displayStudent?.creditsEarned || 84} / {displayStudent?.totalRequiredCredits || 160}
          </Text>
        </View>
        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>C-GPA Tích lũy</Text>
          <Text style={[styles.infoValue, styles.cgpaValue]}>
            {formatCgpa(displayStudent?.currentCgpa)}
          </Text>
        </View>
        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Trạng thái tài khoản</Text>
          <View style={styles.activeStatusPill}>
            <Text style={styles.activeStatusText}>
              {displayUser?.status === 'ACTIVE' ? 'Đang hoạt động' : displayUser?.status || 'Hoạt động'}
            </Text>
          </View>
        </View>
      </View>

      {/* Logout Action */}
      <Pressable
        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
        onPress={handleLogout}
        accessibilityRole="button"
        accessibilityLabel="Đăng xuất khỏi thiết bị"
      >
        <Ionicons name="log-out-outline" size={18} color={colors.error.dark} />
        <Text style={styles.logoutButtonText}>Đăng xuất khỏi thiết bị</Text>
      </Pressable>

      <View style={styles.versionBox}>
        <Text style={styles.versionText}>Rikkei EduPortal Mobile • Version 1.0.0 (Phase 3)</Text>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật thông tin</Text>
              <Pressable
                onPress={() => setIsEditModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </Pressable>
            </View>

            {editError && (
              <View style={styles.modalError}>
                <Ionicons name="alert-circle" size={16} color={colors.error.dark} />
                <Text style={styles.modalErrorText}>{editError}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput
                style={styles.textInput}
                value={fullNameInput}
                onChangeText={setFullNameInput}
                placeholder="Nhập họ và tên"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email học vụ</Text>
              <TextInput
                style={styles.textInput}
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="Nhập địa chỉ email"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setIsEditModalVisible(false)}
                disabled={isUpdating}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </Pressable>

              <Pressable
                style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={colors.neutral[0]} />
                ) : (
                  <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xxl,
    padding: spacing.xl,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primary[800],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
  },
  userName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  userEmail: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary[200],
    marginTop: spacing.sm,
  },
  roleText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
    letterSpacing: 0.8,
  },
  infoCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  editIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    backgroundColor: colors.primary[50],
  },
  btnPressed: {
    opacity: 0.7,
  },
  editBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  infoValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[900],
  },
  codeValue: {
    color: colors.primary[800],
    fontWeight: typography.weights.bold,
  },
  cgpaValue: {
    color: '#D97706',
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  activeStatusPill: {
    backgroundColor: colors.success.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  activeStatusText: {
    color: colors.success.dark,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.neutral[100],
  },
  logoutButton: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.error.light,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    minHeight: spacing.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.error.border,
  },
  logoutButtonPressed: {
    opacity: 0.8,
  },
  logoutButtonText: {
    color: colors.error.dark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  versionBox: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  versionText: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[400],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xxl,
    padding: spacing.xl,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  modalError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error.light,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  modalErrorText: {
    color: colors.error.dark,
    fontSize: typography.sizes.xs,
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.neutral[900],
    minHeight: spacing.minTouchTarget,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    minHeight: 40,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.neutral[600],
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  saveButton: {
    backgroundColor: colors.primary[800],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 110,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
