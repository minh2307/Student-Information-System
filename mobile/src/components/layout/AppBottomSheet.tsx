/**
 * AppBottomSheet.tsx
 * Standard Bottom Sheet Modal Primitive for REDS v2.0.
 * Replaces disruptive full-screen modals with fluid sliding drawers on Android & iOS.
 */

import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  BackHandler,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';

export interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeightPercent?: number; // e.g. 0.85
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const AppBottomSheet: React.FC<AppBottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  maxHeightPercent = 0.85,
  style,
  testID = 'app-bottom-sheet',
}) => {
  // Handle Android Hardware Back Press
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;

    const onBackPress = () => {
      onClose();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop Tap to Dismiss */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng bảng chọn"
          testID={`${testID}-backdrop`}
        />

        {/* Sheet Content Container */}
        <View
          style={[
            styles.sheetContainer,
            { maxHeight: `${Math.round(maxHeightPercent * 100)}%` },
            style,
          ]}
        >
          {/* Drag Handle Indicator */}
          <View style={styles.handleContainer}>
            <View style={styles.handleBar} />
          </View>

          {/* Header Row */}
          {title ? (
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Pressable
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                testID={`${testID}-close`}
              >
                <Ionicons name="close" size={22} color={tokens.text.secondary} />
              </Pressable>
            </View>
          ) : null}

          {/* Sheet Body Content */}
          <View style={styles.bodyContent}>{children}</View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: tokens.surface.backdrop,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: tokens.surface.card,
    borderTopLeftRadius: tokens.radius.xxl,
    borderTopRightRadius: tokens.radius.xxl,
    paddingTop: tokens.spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? tokens.spacing.xl : tokens.spacing.lg,
    ...tokens.elevation.lg,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.xs,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.border.strong,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.subtle,
  },
  headerTitle: {
    fontSize: tokens.typography.sizes.md,
    fontWeight: tokens.typography.weights.bold,
    color: tokens.text.primary,
  },
  closeButton: {
    padding: tokens.spacing.xs,
  },
  bodyContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
  },
});
