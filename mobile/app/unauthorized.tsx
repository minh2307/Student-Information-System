/**
 * Unauthorized Access & Admin Guidance Screen
 * Rendered when:
 * 1. An ADMIN role logs in on mobile (instructs them to use Web Admin at https://rikkeiportal.io.vn).
 * 2. A user attempts to access a route for which their authenticated role has insufficient permissions.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typography, radius } from '@/theme';

export default function UnauthorizedScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);

  const isAdmin = role === 'ADMIN';

  const handleOpenWebPortal = async () => {
    const webUrl = 'https://rikkeiportal.io.vn/';
    const canOpen = await Linking.canOpenURL(webUrl);
    if (canOpen) {
      await Linking.openURL(webUrl);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={isAdmin ? 'laptop-outline' : 'shield-outline'}
            size={56}
            color={isAdmin ? colors.secondary[700] : colors.error.main}
          />
        </View>

        <Text style={styles.title}>
          {isAdmin ? 'Cổng quản trị Rikkei EduPortal Web' : 'Không có quyền truy cập'}
        </Text>

        <Text style={styles.description}>
          {isAdmin
            ? 'Tài khoản Quản trị viên (ADMIN) không được hỗ trợ thao tác trên phiên bản ứng dụng Android. Vui lòng đăng nhập trên giao diện Web Rikkei EduPortal để sử dụng đầy đủ các công cụ quản trị hệ thống.'
            : 'Tài khoản của bạn không có quyền truy cập vào phân hệ này. Ứng dụng Android hiện chỉ hỗ trợ phân hệ dành riêng cho Sinh viên (STUDENT) và Giảng viên (LECTURER).'}
        </Text>

        {user && (
          <View style={styles.userInfoBox}>
            <Text style={styles.userInfoText}>
              Đang đăng nhập: <Text style={styles.boldText}>{user.fullName} ({user.role})</Text>
            </Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleOpenWebPortal}
              activeOpacity={0.8}
            >
              <Ionicons name="open-outline" size={20} color={colors.neutral[0]} />
              <Text style={styles.primaryButtonText}>Mở Cổng Quản Trị Web</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={isAdmin ? styles.secondaryButton : styles.primaryButton}
            onPress={handleSwitchAccount}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={isAdmin ? colors.primary[800] : colors.neutral[0]}
            />
            <Text
              style={
                isAdmin ? styles.secondaryButtonText : styles.primaryButtonText
              }
            >
              Đăng nhập tài khoản khác
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...Platform.select({
      ios: {
        shadowColor: colors.neutral[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  userInfoBox: {
    backgroundColor: colors.neutral[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  userInfoText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[700],
  },
  boldText: {
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  actionsContainer: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary[800],
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  primaryButtonText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  secondaryButton: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  secondaryButtonText: {
    color: colors.primary[800],
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
