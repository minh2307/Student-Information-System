/**
 * AppOfflineBanner.tsx
 * Standard Offline Status Banner Primitive for REDS v2.0.
 * Alerts users when browsing cached data with live connectivity sync feedback.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';

export interface AppOfflineBannerProps {
  message?: string;
  lastSyncedAt?: string | null;
  onSyncPress?: () => void;
  visible?: boolean;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const AppOfflineBanner: React.FC<AppOfflineBannerProps> = ({
  message = 'Chế độ ngoại tuyến: Đang hiển thị bản lưu trên máy',
  lastSyncedAt,
  onSyncPress,
  visible = true,
  style,
  testID = 'app-offline-banner',
}) => {
  if (!visible) return null;

  return (
    <View style={[styles.container, style]} testID={testID} accessibilityRole="alert">
      <View style={styles.dot} />
      <View style={styles.textWrapper}>
        <Text style={styles.mainText}>{message}</Text>
        {lastSyncedAt ? (
          <Text style={styles.subText}>Đồng bộ lần cuối: {lastSyncedAt}</Text>
        ) : null}
      </View>
      {onSyncPress ? (
        <Pressable
          onPress={onSyncPress}
          style={styles.syncButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Thử kết nối lại"
        >
          <Ionicons name="refresh" size={16} color={tokens.semantic.warning.dark} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.semantic.warning.light,
    borderColor: tokens.semantic.warning.border,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    marginHorizontal: tokens.spacing.lg,
    marginVertical: tokens.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.semantic.warning.main,
    marginRight: tokens.spacing.sm,
  },
  textWrapper: {
    flex: 1,
  },
  mainText: {
    color: tokens.semantic.warning.dark,
    fontSize: tokens.typography.sizes.xs,
    fontWeight: tokens.typography.weights.medium,
  },
  subText: {
    color: tokens.semantic.warning.dark,
    fontSize: tokens.typography.sizes.xxs,
    marginTop: 2,
    opacity: 0.85,
  },
  syncButton: {
    padding: tokens.spacing.xs,
    marginLeft: tokens.spacing.xs,
  },
});
