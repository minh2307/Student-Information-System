/**
 * Offline Mode Banner Component
 * Displays a polite alert when the user is viewing offline cached data.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/theme';

interface OfflineBannerProps {
  message?: string;
  visible?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  message = 'Chế độ ngoại tuyến: Đang hiển thị bản lưu trên máy',
  visible = true,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warning.light,
    borderColor: colors.warning.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.screenHorizontal,
    marginVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.warning.main,
  },
  text: {
    color: colors.warning.dark,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
});
