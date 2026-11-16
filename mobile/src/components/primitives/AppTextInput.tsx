/**
 * AppTextInput.tsx
 * Standard Text Input Primitive for REDS v2.0.
 * Supports leading icons, password eye toggle, clearable button, focus states, and validation errors.
 */

import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';

export interface AppTextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  containerStyle?: ViewStyle | ViewStyle[];
  inputStyle?: TextStyle | TextStyle[];
  testID?: string;
}

export const AppTextInput: React.FC<AppTextInputProps> = ({
  label,
  required = false,
  error,
  helperText,
  leftIcon,
  rightIcon,
  isPassword = false,
  clearable = false,
  onClear,
  containerStyle,
  inputStyle,
  value,
  onChangeText,
  editable = true,
  testID,
  ...restProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  const hasError = Boolean(error);
  const canClear = clearable && Boolean(value) && editable;

  const handleClear = () => {
    onChangeText?.('');
    onClear?.();
  };

  const getBorderColor = () => {
    if (hasError) return tokens.border.error;
    if (isFocused) return tokens.border.focus;
    return tokens.border.default;
  };

  return (
    <View style={[styles.rootContainer, containerStyle]}>
      {/* Label Area */}
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.labelText}>{label}</Text>
          {required ? <Text style={styles.requiredStar}> *</Text> : null}
        </View>
      ) : null}

      {/* Input Frame */}
      <View
        style={[
          styles.inputFrame,
          {
            borderColor: getBorderColor(),
            backgroundColor: editable ? tokens.surface.card : tokens.surface.elevated,
          },
          isFocused ? styles.inputFrameFocused : null,
          hasError ? styles.inputFrameError : null,
        ]}
      >
        {/* Left Icon */}
        {leftIcon ? <View style={styles.leftIconWrapper}>{leftIcon}</View> : null}

        {/* Core Native TextInput */}
        <RNTextInput
          style={[styles.textInput, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          placeholderTextColor={tokens.text.placeholder}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            setIsFocused(true);
            restProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            restProps.onBlur?.(e);
          }}
          testID={testID}
          {...restProps}
        />

        {/* Clear Button */}
        {canClear ? (
          <Pressable
            onPress={handleClear}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Xóa văn bản"
          >
            <Ionicons name="close-circle" size={18} color={tokens.text.muted} />
          </Pressable>
        ) : null}

        {/* Password Show/Hide Toggle Button */}
        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={tokens.text.secondary}
            />
          </Pressable>
        ) : null}

        {/* Custom Right Icon */}
        {!isPassword && rightIcon ? <View style={styles.rightIconWrapper}>{rightIcon}</View> : null}
      </View>

      {/* Feedback Messages (Error or Helper) */}
      {hasError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    marginBottom: tokens.spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  labelText: {
    fontSize: tokens.typography.sizes.xs,
    fontWeight: tokens.typography.weights.semiBold,
    color: tokens.text.secondary,
  },
  requiredStar: {
    fontSize: tokens.typography.sizes.xs,
    color: tokens.semantic.error.main,
    fontWeight: '700',
  },
  inputFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.touchTarget.min, // 48dp min touch target
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
  },
  inputFrameFocused: {
    borderWidth: 1.5,
  },
  inputFrameError: {
    borderWidth: 1.5,
  },
  leftIconWrapper: {
    marginRight: tokens.spacing.sm,
  },
  rightIconWrapper: {
    marginLeft: tokens.spacing.sm,
  },
  iconButton: {
    padding: tokens.spacing.xs,
    marginLeft: tokens.spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: tokens.typography.sizes.sm,
    color: tokens.text.primary,
    paddingVertical: tokens.spacing.sm,
  },
  errorText: {
    fontSize: tokens.typography.sizes.xxs,
    color: tokens.semantic.error.main,
    marginTop: tokens.spacing.xxs,
    marginLeft: tokens.spacing.xs,
  },
  helperText: {
    fontSize: tokens.typography.sizes.xxs,
    color: tokens.text.muted,
    marginTop: tokens.spacing.xxs,
    marginLeft: tokens.spacing.xs,
  },
});
