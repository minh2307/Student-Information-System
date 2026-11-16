/**
 * AppToast.tsx
 * Standard Floating Toast Notification Component for REDS v2.0.
 * Pure presentational feedback primitive that does not require global store/context.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Text,
  StyleSheet,
  Pressable,
  View,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface AppToastProps {
  visible: boolean;
  message: string;
  description?: string;
  type?: ToastType;
  durationMs?: number; // default 3500ms
  onDismiss?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  position?: 'top' | 'bottom';
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const AppToast: React.FC<AppToastProps> = ({
  visible,
  message,
  description,
  type = 'info',
  durationMs = 3500,
  onDismiss,
  actionLabel,
  onAction,
  position = 'top',
  style,
  testID = 'app-toast',
}) => {
  const translateYAnim = useRef(new Animated.Value(position === 'top' ? -80 : 80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (visible) {
      Animated.parallel([
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      if (durationMs > 0 && onDismiss) {
        timer = setTimeout(() => {
          handleDismiss();
        }, durationMs);
      }
    } else {
      Animated.parallel([
        Animated.timing(translateYAnim, {
          toValue: position === 'top' ? -80 : 80,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, durationMs, position]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateYAnim, {
        toValue: position === 'top' ? -80 : 80,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  if (!visible) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          color: tokens.semantic.success.main,
          borderColor: tokens.semantic.success.border,
          bgColor: tokens.semantic.success.light,
          textColor: tokens.semantic.success.dark,
        };
      case 'error':
        return {
          icon: 'alert-circle' as const,
          color: tokens.semantic.error.main,
          borderColor: tokens.semantic.error.border,
          bgColor: tokens.semantic.error.light,
          textColor: tokens.semantic.error.dark,
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          color: tokens.semantic.warning.main,
          borderColor: tokens.semantic.warning.border,
          bgColor: tokens.semantic.warning.light,
          textColor: tokens.semantic.warning.dark,
        };
      case 'info':
      default:
        return {
          icon: 'information-circle' as const,
          color: tokens.semantic.info.main,
          borderColor: tokens.semantic.info.border,
          bgColor: tokens.semantic.info.light,
          textColor: tokens.semantic.info.dark,
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        position === 'top' ? styles.topPosition : styles.bottomPosition,
        {
          transform: [{ translateY: translateYAnim }],
          opacity: opacityAnim,
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
        style,
      ]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${type}: ${message}${description ? `. ${description}` : ''}`}
    >
      <View style={styles.contentRow}>
        <Ionicons name={config.icon} size={22} color={config.color} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={[styles.messageText, { color: config.textColor }]}>{message}</Text>
          {description ? (
            <Text style={[styles.descriptionText, { color: config.textColor }]}>
              {description}
            </Text>
          ) : null}
        </View>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            style={styles.actionButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={[styles.actionText, { color: config.textColor }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
        {onDismiss ? (
          <Pressable
            onPress={handleDismiss}
            style={styles.closeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Đóng thông báo"
          >
            <Ionicons name="close" size={18} color={config.textColor} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: tokens.spacing.lg,
    right: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    zIndex: 9999,
    ...tokens.elevation.lg,
  },
  topPosition: {
    top: Platform.OS === 'ios' ? 54 : 36,
  },
  bottomPosition: {
    bottom: Platform.OS === 'ios' ? 36 : 24,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: tokens.spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  messageText: {
    fontSize: tokens.typography.sizes.body,
    fontWeight: tokens.typography.weights.semiBold,
  },
  descriptionText: {
    fontSize: tokens.typography.sizes.caption,
    marginTop: 2,
    opacity: 0.9,
  },
  actionButton: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    marginLeft: tokens.spacing.xs,
  },
  actionText: {
    fontSize: tokens.typography.sizes.caption,
    fontWeight: tokens.typography.weights.bold,
    textDecorationLine: 'underline',
  },
  closeButton: {
    padding: tokens.spacing.xs,
    marginLeft: tokens.spacing.xs,
  },
});

export default AppToast;
