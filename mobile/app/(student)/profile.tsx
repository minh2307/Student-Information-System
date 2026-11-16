/**
 * Student Profile Screen (Hybrid WebView Pilot)
 * Embeds Web Profile via SecureWebViewBridge with Native Header & Logout Security.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { HybridProfileWebView } from '@/components/hybrid/HybridProfileWebView';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const studentProfile = useAuthStore((state) => state.studentProfile);
  const logout = useAuthStore((state) => state.logout);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const defaultWebUrl = __DEV__
    ? (process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:5173/profile')
    : 'https://rikkeiportal.io.vn/profile';

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
            router.replace('/(auth)/login');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container} testID="student-profile-screen">
      {/* Native Control Header */}
      <View style={styles.nativeHeader}>
        <View style={styles.userInfoRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.fullName || 'SV').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.fullName || 'Sinh viên'}
            </Text>
            <Text style={styles.userCode} numberOfLines={1}>
              {studentProfile?.studentCode || user?.username || 'SV2024'}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          accessibilityRole="button"
          accessibilityLabel="Đăng xuất tài khoản"
          testID="profile-logout-button"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error.dark} />
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </Pressable>
      </View>

      {/* Secure Hybrid WebView Container */}
      <View style={styles.webViewContainer}>
        <HybridProfileWebView
          webUrl={defaultWebUrl}
          onLogout={handleLogout}
          onNavigate={(route) => {
            if (route) router.push(route as any);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  nativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary[800],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  userCode: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error.border,
  },
  logoutButtonPressed: {
    opacity: 0.7,
  },
  logoutButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.error.dark,
  },
  webViewContainer: {
    flex: 1,
  },
});
