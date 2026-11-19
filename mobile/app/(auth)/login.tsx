/**
 * Login Screen — REDS v2.0 UI/UX Modernization
 * Connects directly to Backend API Gateway via useLogin hook.
 * Preserves 100% of JWT lifecycle, role routing, and error feedback.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';
import { useLogin } from '@/features/auth';
import { loginSchema } from '@/features/auth/validation';
import {
  AppTextInput,
  AppButton,
  AppCard,
} from '@/components/ui';

export default function LoginScreen() {
  const { isLoading, errorMessage, clearError, handleSubmitLogin } = useLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

    // 2. Real Backend Authentication Submit
    await handleSubmitLogin({
      username: username.trim(),
      password,
    });
  };

  const activeError = validationError || errorMessage;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Institutional Header */}
        <View style={styles.headerArea}>
          <View style={styles.brandBadge}>
            <Ionicons name="school" size={14} color="#FFFFFF" style={styles.badgeIcon} />
            <Text style={styles.brandBadgeText}>RIKKEI EDUPORTAL</Text>
          </View>
          <Text style={styles.welcomeTitle}>Cổng Thông Tin Đào Tạo</Text>
          <Text style={styles.welcomeSubtitle}>
            Hệ thống phục vụ Sinh viên & Giảng viên Rikkei EduPortal
          </Text>
        </View>

        {/* Floating Login Card */}
        <AppCard variant="elevated" style={styles.card}>
          {/* Error Feedback Display */}
          {activeError ? (
            <View style={styles.errorAlert} testID="login-error-banner" accessibilityRole="alert">
              <Ionicons
                name="alert-circle"
                size={20}
                color={tokens.semantic.error.main}
                style={styles.errorIcon}
              />
              <Text style={styles.errorAlertText}>{activeError}</Text>
            </View>
          ) : null}

          {/* Username Input */}
          <AppTextInput
            label="Tên đăng nhập / Mã SV / Mã GV / Email"
            testID="username-input"
            placeholder="Nhập tên đăng nhập hoặc mã SV / GV"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              if (validationError) setValidationError(null);
              if (errorMessage) clearError();
            }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            leftIcon={
              <Ionicons name="person-outline" size={18} color={tokens.text.muted} />
            }
          />

          {/* Password Input with show/hide eye toggle */}
          <AppTextInput
            label="Mật khẩu"
            testID="password-input"
            placeholder="Nhập mật khẩu"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (validationError) setValidationError(null);
              if (errorMessage) clearError();
            }}
            isPassword={true}
            editable={!isLoading}
            leftIcon={
              <Ionicons name="lock-closed-outline" size={18} color={tokens.text.muted} />
            }
          />

          {/* Submit Action Button */}
          <View style={styles.buttonWrapper}>
            <AppButton
              title="Đăng nhập"
              onPress={handleLoginPress}
              isLoading={isLoading}
              variant="primary"
              size="lg"
              fullWidth={true}
              testID="login-button"
            />
          </View>
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: tokens.brand.burgundy, // Institutional Burgundy #7F1D1D
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.xxxl,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: tokens.spacing.xxl,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: tokens.spacing.md,
  },
  badgeIcon: {
    marginRight: 6,
  },
  brandBadgeText: {
    color: '#FFFFFF',
    fontSize: tokens.typography.sizes.overline,
    fontWeight: tokens.typography.weights.bold,
    letterSpacing: 1.1,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: tokens.typography.sizes.h1,
    fontWeight: tokens.typography.weights.bold,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: tokens.brand.primaryScale[200],
    fontSize: tokens.typography.sizes.body,
    marginTop: tokens.spacing.xs,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  card: {
    backgroundColor: tokens.surface.card,
    borderRadius: tokens.radius.xxl,
    padding: tokens.spacing.xxl,
    ...tokens.elevation.lg,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.semantic.error.light,
    borderWidth: 1,
    borderColor: tokens.semantic.error.border,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  errorIcon: {
    marginRight: tokens.spacing.sm,
  },
  errorAlertText: {
    flex: 1,
    color: tokens.semantic.error.dark,
    fontSize: tokens.typography.sizes.caption,
    lineHeight: 18,
    fontWeight: tokens.typography.weights.medium,
  },
  buttonWrapper: {
    marginTop: tokens.spacing.sm,
  },
});
