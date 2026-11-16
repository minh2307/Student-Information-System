/**
 * ChangePasswordModal.tsx
 * Standard Password Update Modal for REDS v2.0.
 * Utilizes AppBottomSheet presentation with strict credential isolation and Zod/client validation.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';
import { AppBottomSheet, AppTextInput, AppButton } from '@/components/ui';
import { useProfile } from '../hooks/useProfile';

export interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  testID?: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onClose,
  onSuccess,
  testID = 'change-password-modal',
}) => {
  const { updateProfile, isUpdating } = useProfile();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setValidationError(null);
    setApiError(null);
    setSuccessMessage(null);

    // 1. Validation Rules
    if (!oldPassword.trim()) {
      setValidationError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (newPassword.length < 6) {
      setValidationError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }

    if (newPassword === oldPassword) {
      setValidationError('Mật khẩu mới không được trùng với mật khẩu cũ');
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('Xác nhận mật khẩu mới không khớp');
      return;
    }

    // 2. Invoke Backend API
    try {
      await updateProfile({
        oldPassword,
        newPassword,
      });

      setSuccessMessage('Đổi mật khẩu thành công!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1200);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể cập nhật mật khẩu. Vui lòng kiểm tra lại mật khẩu cũ.';
      setApiError(msg);
    }
  };

  const activeError = validationError || apiError;

  return (
    <AppBottomSheet
      visible={visible}
      onClose={handleClose}
      title="Đổi mật khẩu"
      testID={testID}
      maxHeightPercent={0.88}
    >
      <View style={styles.formContainer}>
        {/* Error Banner */}
        {activeError ? (
          <View style={styles.errorBanner} testID={`${testID}-error`} accessibilityRole="alert">
            <Ionicons
              name="alert-circle"
              size={18}
              color={tokens.semantic.error.main}
              style={styles.alertIcon}
            />
            <Text style={styles.errorText}>{activeError}</Text>
          </View>
        ) : null}

        {/* Success Banner */}
        {successMessage ? (
          <View style={styles.successBanner} testID={`${testID}-success`} accessibilityRole="alert">
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={tokens.semantic.success.main}
              style={styles.alertIcon}
            />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        {/* Current Password Field */}
        <AppTextInput
          label="Mật khẩu hiện tại"
          testID={`${testID}-old-password`}
          placeholder="Nhập mật khẩu hiện tại"
          value={oldPassword}
          onChangeText={(val) => {
            setOldPassword(val);
            if (validationError) setValidationError(null);
            if (apiError) setApiError(null);
          }}
          isPassword={true}
          editable={!isUpdating}
          leftIcon={<Ionicons name="key-outline" size={18} color={tokens.text.muted} />}
        />

        {/* New Password Field */}
        <AppTextInput
          label="Mật khẩu mới"
          testID={`${testID}-new-password`}
          placeholder="Tối thiểu 6 ký tự"
          value={newPassword}
          onChangeText={(val) => {
            setNewPassword(val);
            if (validationError) setValidationError(null);
            if (apiError) setApiError(null);
          }}
          isPassword={true}
          editable={!isUpdating}
          leftIcon={<Ionicons name="lock-closed-outline" size={18} color={tokens.text.muted} />}
        />

        {/* Confirm New Password Field */}
        <AppTextInput
          label="Xác nhận mật khẩu mới"
          testID={`${testID}-confirm-password`}
          placeholder="Nhập lại mật khẩu mới"
          value={confirmPassword}
          onChangeText={(val) => {
            setConfirmPassword(val);
            if (validationError) setValidationError(null);
            if (apiError) setApiError(null);
          }}
          isPassword={true}
          editable={!isUpdating}
          leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={tokens.text.muted} />}
        />

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <AppButton
            title="Cập nhật mật khẩu"
            onPress={handleSubmit}
            isLoading={isUpdating}
            variant="primary"
            size="md"
            fullWidth={true}
            testID={`${testID}-submit-button`}
          />
          <View style={styles.cancelSpacing}>
            <AppButton
              title="Hủy bỏ"
              onPress={handleClose}
              disabled={isUpdating}
              variant="ghost"
              size="md"
              fullWidth={true}
              testID={`${testID}-cancel-button`}
            />
          </View>
        </View>
      </View>
    </AppBottomSheet>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    paddingVertical: tokens.spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.semantic.error.light,
    borderWidth: 1,
    borderColor: tokens.semantic.error.border,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.semantic.success.light,
    borderWidth: 1,
    borderColor: tokens.semantic.success.border,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  alertIcon: {
    marginRight: tokens.spacing.sm,
  },
  errorText: {
    flex: 1,
    color: tokens.semantic.error.dark,
    fontSize: tokens.typography.sizes.caption,
    fontWeight: tokens.typography.weights.medium,
  },
  successText: {
    flex: 1,
    color: tokens.semantic.success.dark,
    fontSize: tokens.typography.sizes.caption,
    fontWeight: tokens.typography.weights.medium,
  },
  actionsContainer: {
    marginTop: tokens.spacing.lg,
  },
  cancelSpacing: {
    marginTop: tokens.spacing.xs,
  },
});

export default ChangePasswordModal;
