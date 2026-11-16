/**
 * FloatingTabBar.tsx
 * Standalone Modern Floating Navigation Tab Bar for REDS v2.0.
 *
 * Implements:
 * - 64dp elevated bar with subtle radius and Android shadow
 * - Active Pill indicator (Burgundy tint rgba(153, 27, 27, 0.08))
 * - Real-time badge counter
 * - Standalone design foundation ready for integration without disturbing Expo Router navigation.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';

export interface TabItemConfig {
  key: string;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  activeIconName?: keyof typeof Ionicons.glyphMap;
  badgeCount?: number;
}

export interface FloatingTabBarProps {
  tabs: TabItemConfig[];
  activeTabKey: string;
  onTabPress: (tabKey: string) => void;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({
  tabs,
  activeTabKey,
  onTabPress,
  style,
  testID = 'floating-tab-bar',
}) => {
  return (
    <View style={[styles.barContainer, style]} testID={testID} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTabKey;
        const iconName = isActive && tab.activeIconName ? tab.activeIconName : tab.iconName;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            style={({ pressed }) => [
              styles.tabItem,
              isActive && styles.tabItemActive,
              pressed && Platform.OS === 'ios' && styles.tabPressed,
            ]}
            android_ripple={{
              color: 'rgba(153, 27, 27, 0.12)',
              borderless: false,
              radius: 32,
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.label}${tab.badgeCount ? `, ${tab.badgeCount} thông báo mới` : ''}`}
            testID={`${testID}-tab-${tab.key}`}
          >
            <View style={styles.iconWrapper}>
              <Ionicons
                name={iconName}
                size={22}
                color={isActive ? tokens.brand.crimson : tokens.text.muted}
              />
              {tab.badgeCount != null && tab.badgeCount > 0 ? (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>
                    {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[
                styles.tabLabel,
                isActive ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    backgroundColor: tokens.surface.card,
    borderTopWidth: 1,
    borderTopColor: tokens.border.default,
    paddingHorizontal: tokens.spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? tokens.spacing.xs : 4,
    ...tokens.elevation.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.xs,
    borderRadius: tokens.radius.lg,
    minHeight: 48,
  },
  tabItemActive: {
    backgroundColor: 'rgba(153, 27, 27, 0.08)',
  },
  tabPressed: {
    opacity: 0.8,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: tokens.typography.sizes.overline,
    marginTop: 2,
  },
  tabLabelActive: {
    fontWeight: tokens.typography.weights.bold,
    color: tokens.brand.crimson,
  },
  tabLabelInactive: {
    fontWeight: tokens.typography.weights.medium,
    color: tokens.text.muted,
  },
  badgePill: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: tokens.semantic.error.main,
    borderRadius: tokens.radius.full,
    paddingHorizontal: 4,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: tokens.typography.weights.bold,
  },
});

export default FloatingTabBar;
