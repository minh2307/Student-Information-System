/**
 * Lecturer Profile Screen - REDS v2.0
 * Displays faculty details from real backend, supports profile updates and secure logout.
 * Refactored to utilize REDS v2.0 Tokens, Shared Components & WCAG AA Compliance.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { tokens } from '@/theme';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/feedback/AppBadge';

export default function LecturerProfileScreen() {
  const router = useRouter();

  // Auth Store
  const authUser = useAuthStore((state) => state.user);
  const authLecturerProfile = useAuthStore((state) => state.lecturerProfile);
  const logout = useAuthStore((state) => state.logout);

  // Live profile query
  const { profile, refetch, isRefetching, updateProfile, isUpdating } = useProfile();
  const user = profile?.user || authUser;
  const lecturerProfile = profile?.lecturerProfile || authLecturerProfile;

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(user?.fullName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');

  const handleOpenEdit = () => {
    setEditFullName(user?.fullName || '');
    setEditEmail(user?.email || '');
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editFullName.trim() || !editEmail.trim()) {
      Alert.alert('Lỗi nhập liệu', 'Vui lòng điền đầy đủ Họ và tên và Email.');
      return;
    }

    try {
      await updateProfile({
        fullName: editFullName.trim(),
        email: editEmail.trim(),
      });
      setIsEditModalOpen(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin hồ sơ.');
    } catch (err: any) {
      Alert.alert('Lỗi cập nhật', err?.message || 'Không thể cập nhật hồ sơ.');
    }
  };

  const handleLogout = () => {
    const executeLogout = async () => {
      await logout();
      router.replace('/(auth)/login');
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Thầy/Cô có chắc chắn muốn đăng xuất khỏi ứng dụng?') : true;
      if (confirmed) {
        executeLogout();
      }
      return;
    }

    Alert.alert('Đăng xuất', 'Thầy/Cô có chắc chắn muốn đăng xuất khỏi ứng dụng?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: executeLogout,
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          tintColor={tokens.brand.burgundy}
          colors={[tokens.brand.burgundy]}
        />
      }
    >
      {/* Faculty Hero Identity Card */}
      <AppCard variant="elevated" style={styles.profileCard}>
        <View style={styles.avatarWrapper}>
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={44} color={tokens.brand.burgundy} />
            </View>
          )}
          <View style={styles.avatarOnlineBadge}>
            <View style={styles.avatarOnlineDot} />
          </View>
        </View>

        <AppText variant="h2" color="primary" style={styles.fullName}>
          {user?.fullName || 'TS. Nguyễn Văn A'}
        </AppText>

        <AppText variant="caption" color="muted" style={styles.email}>
          {user?.email || 'nguyenvana@rikkei.edu.vn'}
        </AppText>

        <View style={styles.roleTag}>
          <AppBadge
            variant="primary"
            size="md"
            label="GIẢNG VIÊN (LECTURER)"
            icon={<Ionicons name="school-outline" size={14} color={tokens.brand.burgundy} />}
          />
        </View>

        <Pressable
          style={styles.editProfileBtn}
          onPress={handleOpenEdit}
          android_ripple={{ color: tokens.brand.crimsonLight }}
          accessibilityRole="button"
          accessibilityLabel="Chỉnh sửa thông tin cá nhân"
        >
          <Ionicons name="create-outline" size={16} color={tokens.brand.burgundy} />
          <AppText variant="bodyBold" style={{ color: tokens.brand.burgundy }}>
            Chỉnh sửa thông tin
          </AppText>
        </Pressable>
      </AppCard>

      {/* Faculty Work & Teaching Information */}
      <View style={styles.sectionHeaderWrapper}>
        <Ionicons name="briefcase-outline" size={16} color={tokens.brand.burgundy} />
        <AppText variant="captionBold" color="secondary" style={styles.sectionHeader}>
          Thông tin công tác & Giảng dạy
        </AppText>
      </View>

      <AppCard variant="elevated" style={styles.infoGroup}>
        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="id-card-outline" size={16} color={tokens.text.muted} />
            <AppText variant="body" color="secondary" style={styles.infoLabel}>
              Mã cán bộ / GV
            </AppText>
          </View>
          <AppText variant="bodyBold" color="primary" style={styles.infoValue}>
            {lecturerProfile?.lecturerCode || user?.username || 'GV001'}
          </AppText>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="business-outline" size={16} color={tokens.text.muted} />
            <AppText variant="body" color="secondary" style={styles.infoLabel}>
              Khoa / Bộ môn
            </AppText>
          </View>
          <AppText variant="bodyBold" color="primary" style={styles.infoValue}>
            {lecturerProfile?.department || 'Khoa Công nghệ Thông tin'}
          </AppText>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="ribbon-outline" size={16} color={tokens.text.muted} />
            <AppText variant="body" color="secondary" style={styles.infoLabel}>
              Học vị / Học hàm
            </AppText>
          </View>
          <AppText variant="bodyBold" color="primary" style={styles.infoValue}>
            {lecturerProfile?.degree || 'Tiến sĩ'}
          </AppText>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="person-circle-outline" size={16} color={tokens.text.muted} />
            <AppText variant="body" color="secondary" style={styles.infoLabel}>
              Tên tài khoản
            </AppText>
          </View>
          <AppText variant="bodyBold" color="primary" style={styles.infoValue}>
            {user?.username || 'gv001'}
          </AppText>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="shield-checkmark-outline" size={16} color={tokens.text.muted} />
            <AppText variant="body" color="secondary" style={styles.infoLabel}>
              Trạng thái tài khoản
            </AppText>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <AppText
              variant="bodyBold"
              style={[styles.infoValue, { color: tokens.semantic.success.dark }]}
            >
              {user?.status === 'ACTIVE' || !user?.status ? 'Đang hoạt động' : 'Khóa'}
            </AppText>
          </View>
        </View>
      </AppCard>

      {/* Security & System Info */}
      <View style={styles.sectionHeaderWrapper}>
        <Ionicons name="lock-closed-outline" size={16} color={tokens.brand.burgundy} />
        <AppText variant="captionBold" color="secondary" style={styles.sectionHeader}>
          Bảo mật & Ứng dụng
        </AppText>
      </View>

      <AppCard variant="elevated" style={styles.infoGroup}>
        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="phone-portrait-outline" size={16} color={tokens.text.muted} />
            <AppText variant="body" color="secondary" style={styles.infoLabel}>
              Phiên bản Mobile
            </AppText>
          </View>
          <AppText variant="bodyBold" color="primary" style={styles.infoValue}>
            v1.0.0 (Phase 4 Lecturer)
          </AppText>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="key-outline" size={16} color={tokens.text.muted} />
            <AppText variant="body" color="secondary" style={styles.infoLabel}>
              Xác thực Token
            </AppText>
          </View>
          <AppText variant="bodyBold" color="primary" style={styles.infoValue}>
            Hardware Keystore (SecureStore)
          </AppText>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <View style={styles.infoLabelContainer}>
            <Ionicons name="globe-outline" size={16} color={tokens.text.muted} />
            <AppText variant="body" color="secondary" style={styles.infoLabel}>
              Cổng kết nối API
            </AppText>
          </View>
          <AppText variant="bodyBold" color="primary" style={styles.infoValue}>
            API Gateway HTTPS
          </AppText>
        </View>
      </AppCard>

      {/* Logout Action Button */}
      <Pressable
        style={styles.logoutButton}
        onPress={handleLogout}
        android_ripple={{ color: tokens.semantic.error.light }}
        accessibilityRole="button"
        accessibilityLabel="Đăng xuất khỏi thiết bị"
      >
        <Ionicons name="log-out-outline" size={20} color={tokens.semantic.error.button} />
        <AppText
          variant="bodyBold"
          style={[styles.logoutText, { color: tokens.semantic.error.button }]}
        >
          Đăng xuất khỏi thiết bị
        </AppText>
      </Pressable>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="h3" color="primary">
                Cập nhật thông tin cá nhân
              </AppText>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setIsEditModalOpen(false)}
                android_ripple={{ color: tokens.brand.crimsonLight }}
                accessibilityRole="button"
                accessibilityLabel="Đóng modal cập nhật"
              >
                <Ionicons name="close" size={22} color={tokens.text.secondary} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <AppText variant="captionBold" color="secondary" style={styles.inputLabel}>
                Họ và tên
              </AppText>
              <TextInput
                style={styles.textInput}
                value={editFullName}
                onChangeText={setEditFullName}
                placeholder="Nhập họ và tên..."
                placeholderTextColor={tokens.text.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <AppText variant="captionBold" color="secondary" style={styles.inputLabel}>
                Email liên hệ
              </AppText>
              <TextInput
                style={styles.textInput}
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Nhập email..."
                placeholderTextColor={tokens.text.placeholder}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setIsEditModalOpen(false)}
                android_ripple={{ color: tokens.brand.crimsonLight }}
                accessibilityRole="button"
                accessibilityLabel="Hủy bỏ thay đổi"
              >
                <AppText variant="bodyBold" color="secondary">
                  Hủy
                </AppText>
              </Pressable>

              <Pressable
                style={[styles.modalSaveBtn, isUpdating && styles.modalSaveBtnDisabled]}
                onPress={handleSaveProfile}
                disabled={isUpdating}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
                accessibilityRole="button"
                accessibilityLabel="Lưu thay đổi hồ sơ"
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <AppText variant="bodyBold" color="inverse">
                    Lưu thay đổi
                  </AppText>
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
    backgroundColor: tokens.surface.canvas,
  },
  content: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl + 20,
  },
  profileCard: {
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.xl,
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
    backgroundColor: tokens.surface.card,
    borderTopWidth: 4,
    borderTopColor: tokens.brand.burgundy,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: tokens.spacing.sm,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: tokens.brand.burgundy,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: tokens.brand.crimsonLight,
    borderWidth: 3,
    borderColor: tokens.brand.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOnlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOnlineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: tokens.semantic.success.main,
  },
  fullName: {
    fontSize: 18,
    marginTop: tokens.spacing.xs,
  },
  email: {
    marginTop: 2,
  },
  roleTag: {
    marginTop: tokens.spacing.sm,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: tokens.brand.crimsonLight,
    paddingHorizontal: tokens.spacing.lg,
    minHeight: 48, // Touch target >= 48dp
    borderRadius: tokens.radius.full,
    marginTop: tokens.spacing.md,
  },
  sectionHeaderWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: tokens.spacing.xs,
    marginLeft: 4,
  },
  sectionHeader: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoGroup: {
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
    backgroundColor: tokens.surface.card,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.subtle,
    minHeight: 48, // Touch target / readability row height
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.semantic.success.main,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: tokens.surface.card,
    borderRadius: tokens.radius.lg,
    minHeight: 50, // Touch target >= 48dp
    borderWidth: 1.5,
    borderColor: tokens.semantic.error.border,
    marginTop: tokens.spacing.xs,
    ...tokens.elevation.sm,
  },
  logoutText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: tokens.surface.backdrop,
    justifyContent: 'center',
    padding: tokens.spacing.md,
  },
  modalContent: {
    backgroundColor: tokens.surface.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    ...tokens.elevation.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.default,
    paddingBottom: tokens.spacing.xs,
  },
  modalCloseBtn: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: tokens.spacing.md,
  },
  inputLabel: {
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: tokens.border.default,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    minHeight: 48, // Touch target >= 48dp
    fontSize: 13,
    color: tokens.text.primary,
    backgroundColor: tokens.surface.canvas,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  modalCancelBtn: {
    paddingHorizontal: tokens.spacing.lg,
    minHeight: 48, // Touch target >= 48dp
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.default,
    backgroundColor: tokens.surface.canvas,
  },
  modalSaveBtn: {
    backgroundColor: tokens.brand.burgundy,
    paddingHorizontal: tokens.spacing.xl,
    minHeight: 48, // Touch target >= 48dp
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
  },
  modalSaveBtnDisabled: {
    opacity: 0.6,
  },
});
