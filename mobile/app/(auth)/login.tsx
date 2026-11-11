/**
 * Login Screen (Phase 2 Real Authentication Integration)
 * Connects directly to backend API Gateway (https://rikkeiportal.io.vn).
 * Handles real JWT lifecycle, role routing, and error feedback.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { useLogin } from '@/features/auth';
import { loginSchema } from '@/features/auth/validation';

export default function LoginScreen() {
  const { isLoading, errorMessage, clearError, handleSubmitLogin } = useLogin();
  const [username, setUsername] = useState('sv2024001');
  const [password, setPassword] = useState('123456');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleLoginPress = async () => {
    clearError();
    setValidationError(null);

    // 1. Client-side Form Validation
    const validationResult = loginSchema.safeParse({ username, password });
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      setValidationError(firstIssue.message);
      return;
    }

    // 2. Real Backend Authentication
    await handleSubmitLogin({
      username: username.trim(),
      password,
    });
  };

  const handleFillDemo = (demoUser: string, demoPass: string = '123456') => {
    setUsername(demoUser);
    setPassword(demoPass);
    clearError();
    setValidationError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={styles.headerArea}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>RIKKEI EDUPORTAL</Text>
          </View>
          <Text style={styles.welcomeTitle}>Cổng Thông Tin Đào Tạo</Text>
          <Text style={styles.welcomeSubtitle}>
            Hệ thống phục vụ Sinh viên & Giảng viên Rikkei EduPortal
          </Text>
        </View>

        <View style={styles.card}>
          {/* Error Feedback Display */}
          {(errorMessage || validationError) && (
            <View style={styles.errorAlert} testID="login-error-banner">
              <Text style={styles.errorAlertText}>
                {validationError || errorMessage}
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tên đăng nhập / Mã SV / Mã GV / Email</Text>
            <TextInput
              testID="username-input"
              style={styles.input}
              placeholder="VD: sv2024001 hoặc gv001"
              placeholderTextColor={colors.neutral[400]}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (validationError) setValidationError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <TextInput
              testID="password-input"
              style={styles.input}
              placeholder="Nhập mật khẩu"
              placeholderTextColor={colors.neutral[400]}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (validationError) setValidationError(null);
              }}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          {/* Submit Button with Anti-Double Submission Protection */}
          <Pressable
            testID="login-button"
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLoginPress}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.neutral[0]} size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
            )}
          </Pressable>

          {/* Fast Demo Account Chips */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Tài khoản mẫu thử nghiệm:</Text>
            <View style={styles.demoChipsRow}>
              <Pressable
                style={styles.demoChip}
                onPress={() => handleFillDemo('sv2024001')}
                disabled={isLoading}
              >
                <Text style={styles.demoChipText}>🎓 SV (sv2024001)</Text>
              </Pressable>
              <Pressable
                style={styles.demoChip}
                onPress={() => handleFillDemo('gv001')}
                disabled={isLoading}
              >
                <Text style={styles.demoChipText}>👨‍🏫 GV (gv001)</Text>
              </Pressable>
              <Pressable
                style={styles.demoChip}
                onPress={() => handleFillDemo('admin')}
                disabled={isLoading}
              >
                <Text style={styles.demoChipText}>🛡️ Admin</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.primary[900],
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.screenHorizontal,
    paddingVertical: spacing.huge,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  brandBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: spacing.md,
  },
  brandBadgeText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.1,
  },
  welcomeTitle: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: colors.primary[200],
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xxl,
    padding: spacing.cardPadding,
    ...shadows.lg,
  },
  errorAlert: {
    backgroundColor: colors.error.light,
    borderWidth: 1,
    borderColor: colors.error.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorAlertText: {
    color: colors.error.dark,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    fontWeight: typography.weights.medium,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.neutral[900],
    minHeight: spacing.minTouchTarget,
  },
  loginButton: {
    backgroundColor: colors.primary[800],
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    minHeight: spacing.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  demoSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  demoTitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    fontWeight: typography.weights.semiBold,
    marginBottom: spacing.sm,
  },
  demoChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  demoChip: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  demoChipText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[800],
    fontWeight: typography.weights.medium,
  },
});
