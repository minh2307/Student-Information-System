/**
 * AppLoadingSkeleton.tsx
 * Standard Skeleton Shimmer Primitive for REDS v2.0.
 * Replaces jarring circular spinners with gentle animated placeholder blocks.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { tokens } from '@/theme';

export type SkeletonVariant = 'text' | 'card' | 'avatar' | 'rect';

export interface AppLoadingSkeletonProps {
  variant?: SkeletonVariant;
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const AppLoadingSkeleton: React.FC<AppLoadingSkeletonProps> = ({
  variant = 'text',
  width,
  height,
  radius: customRadius,
  style,
  testID = 'app-loading-skeleton',
}) => {
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [opacityAnim]);

  const getVariantDimensions = (): {
    defaultWidth: DimensionValue;
    defaultHeight: DimensionValue;
    defaultRadius: number;
  } => {
    switch (variant) {
      case 'avatar':
        return {
          defaultWidth: 48,
          defaultHeight: 48,
          defaultRadius: tokens.radius.full,
        };
      case 'card':
        return {
          defaultWidth: '100%',
          defaultHeight: 110,
          defaultRadius: tokens.radius.lg,
        };
      case 'rect':
        return {
          defaultWidth: '100%',
          defaultHeight: 48,
          defaultRadius: tokens.radius.md,
        };
      case 'text':
      default:
        return {
          defaultWidth: '100%',
          defaultHeight: 16,
          defaultRadius: tokens.radius.xs,
        };
    }
  };

  const { defaultWidth, defaultHeight, defaultRadius } = getVariantDimensions();

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width: width ?? defaultWidth,
          height: height ?? defaultHeight,
          borderRadius: customRadius ?? defaultRadius,
          opacity: opacityAnim,
        },
        style,
      ]}
      testID={testID}
      accessibilityRole="none"
      accessibilityLabel="Đang tải dữ liệu"
    />
  );
};

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: tokens.border.subtle,
  },
});
