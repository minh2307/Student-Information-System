/**
 * Lecturer Profile Screen
 * Displays faculty details from real backend, supports profile updates and secure logout.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { colors, spacing, typography, radius } from '@/theme';

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
    Alert.alert('Đăng xuất', 'Thầy/Cô có chắc chắn muốn đăng xuất khỏi ứng dụng?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          tintColor={colors.primary[800]}
        />
      }
    >
      {/* Identity Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrapper}>
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={40} color={colors.primary[800]} />
            </View>
          )}
        </View>

        <Text style={styles.fullName}>{user?.fullName || 'Giảng viên'}</Text>
        <Text style={styles.email}>{user?.email || 'lecturer@rikkei.edu.vn'}</Text>

        <View style={styles.roleTag}>
          <Text style={styles.roleText}>GIẢNG VIÊN (LECTURER)</Text>
        </View>

        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={handleOpenEdit}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={16} color={colors.primary[800]} />
          <Text style={styles.editProfileBtnText}>Chỉnh sửa thông tin</Text>
        </TouchableOpacity>
      </View>

      {/* Faculty Information Group */}
      <Text style={styles.sectionHeader}>Thông tin công tác & Giảng dạy</Text>
      <View style={styles.infoGroup}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mã cán bộ / GV</Text>
          <Text style={styles.infoValue}>
            {lecturerProfile?.lecturerCode || user?.username || 'GV001'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Khoa / Bộ môn</Text>
          <Text style={styles.infoValue}>
            {lecturerProfile?.department || 'Khoa Công nghệ Thông tin'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Học vị / Học hàm</Text>
          <Text style={styles.infoValue}>
            {lecturerProfile?.degree || 'Tiến sĩ / Thạc sĩ'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tên tài khoản</Text>
          <Text style={styles.infoValue}>{user?.username || '---'}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Trạng thái tài khoản</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={[styles.infoValue, { color: colors.success.dark }]}>
              {user?.status === 'ACTIVE' ? 'Đang hoạt động' : 'Khóa'}
            </Text>
          </View>
        </View>
      </View>

      {/* Security & System Info */}
      <Text style={styles.sectionHeader}>Bảo mật & Ứng dụng</Text>
      <View style={styles.infoGroup}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phiên bản Mobile</Text>
          <Text style={styles.infoValue}>v1.0.0 (Phase 4 Lecturer)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Xác thực Token</Text>
          <Text style={styles.infoValue}>Hardware Keystore (SecureStore)</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Cổng kết nối API</Text>
          <Text style={styles.infoValue}>API Gateway HTTPS</Text>
        </View>
      </View>

      {/* Logout Action */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={colors.error.main} />
        <Text style={styles.logoutText}>Đăng xuất khỏi thiết bị</Text>
      </TouchableOpacity>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật thông tin cá nhân</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.neutral[700]} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput
                style={styles.textInput}
                value={editFullName}
                onChangeText={setEditFullName}
                placeholder="Nhập họ và tên..."
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email liên hệ</Text>
              <TextInput
                style={styles.textInput}
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Nhập email..."
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsEditModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveProfile}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={colors.neutral[0]} />
                ) : (
                  <Text style={styles.modalSaveText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: colors.neutral[100],
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  avatarWrapper: {
    marginBottom: spacing.sm,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginTop: spacing.xs,
  },
  email: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  roleTag: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  roleText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  editProfileBtnText: {
    fontSize: typography.sizes.xs,
    color: colors.primary[900],
    fontWeight: typography.weights.semiBold,
  },
  sectionHeader: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  infoGroup: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
  },
  infoValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[900],
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
    backgroundColor: colors.success.main,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.error.light,
    marginTop: spacing.sm,
  },
  logoutText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.error.main,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[600],
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: typography.sizes.xs,
    color: colors.neutral[900],
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  modalCancelText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
  },
  modalSaveBtn: {
    backgroundColor: colors.primary[800],
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  modalSaveText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[0],
  },
});
