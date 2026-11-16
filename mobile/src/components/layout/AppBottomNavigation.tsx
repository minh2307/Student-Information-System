/**
 * AppBottomNavigation.tsx
 * Standard Bottom Navigation Bar Component for REDS v2.0.
 *
 * Implements:
 * - Full 6-tab Student mapping and 5-tab Lecturer mapping audit.
 * - Minimum 48dp touch targets on all interactive items (WCAG 2.1 AA).
 * - Android Native Ripple and Burgundy active pill indicator.
 * - Non-invasive presentation component that does NOT disrupt running Expo Router layout.
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

export interface BottomNavTabItem {
  key: string;
  route: string;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  activeIconName?: keyof typeof Ionicons.glyphMap;
  badgeCount?: number;
}

/**
 * Audited 6-Tab Navigation Configuration for Student Subsystem.
 * STRICT POLICY: Preserves all 6 tabs without dropping any.
 */
export const STUDENT_BOTTOM_NAV_TABS: BottomNavTabItem[] = [
  {
    key: 'dashboard',
    route: '/(student)/dashboard',
    label: 'Tổng quan',
    iconName: 'grid-outline',
    activeIconName: 'grid',
  },
  {
    key: 'timetable',
    route: '/(student)/timetable',
    label: 'Lịch học',
    iconName: 'calendar-outline',
    activeIconName: 'calendar',
  },
  {
    key: 'exams',
    route: '/(student)/exams',
    label: 'Lịch thi',
    iconName: 'clipboard-outline',
    activeIconName: 'clipboard',
  },
  {
    key: 'grades',
    route: '/(student)/grades',
    label: 'Bảng điểm',
    iconName: 'school-outline',
    activeIconName: 'school',
  },
  {
    key: 'tuition',
    route: '/(student)/tuition',
    label: 'Học phí',
    iconName: 'wallet-outline',
    activeIconName: 'wallet',
  },
  {
    key: 'profile',
    route: '/(student)/profile',
    label: 'Hồ sơ',
    iconName: 'person-outline',
    activeIconName: 'person',
  },
];

/**
 * Audited 5-Tab Navigation Configuration for Lecturer Subsystem.
 */
export const LECTURER_BOTTOM_NAV_TABS: BottomNavTabItem[] = [
  {
    key: 'dashboard',
    route: '/(lecturer)/dashboard',
    label: 'Tổng quan',
    iconName: 'grid-outline',
    activeIconName: 'grid',
  },
  {
    key: 'schedule',
    route: '/(lecturer)/schedule',
    label: 'Lịch dạy',
    iconName: 'calendar-outline',
    activeIconName: 'calendar',
  },
  {
    key: 'classes',
    route: '/(lecturer)/classes',
    label: 'Lớp học',
    iconName: 'book-outline',
    activeIconName: 'book',
  },
  {
    key: 'attendance',
    route: '/(lecturer)/attendance',
    label: 'Điểm danh',
    iconName: 'qr-code-outline',
    activeIconName: 'qr-code',
  },
  {
    key: 'profile',
    route: '/(lecturer)/profile',
    label: 'Hồ sơ GV',
    iconName: 'person-outline',
    activeIconName: 'person',
  },
];

export interface AppBottomNavigationProps {
  role?: 'STUDENT' | 'LECTURER';
  tabs?: BottomNavTabItem[];
  activeTabKey: string;
  onTabPress: (tabKey: string, route: string) => void;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const AppBottomNavigation: React.FC<AppBottomNavigationProps> = ({
  role = 'STUDENT',
  tabs,
  activeTabKey,
  onTabPress,
  style,
  testID = 'app-bottom-navigation',
}) => {
  const resolvedTabs = tabs || (role === 'STUDENT' ? STUDENT_BOTTOM_NAV_TABS : LECTURER_BOTTOM_NAV_TABS);

  return (
    <View style={[styles.barContainer, style]} testID={testID} accessibilityRole="tablist">
      {resolvedTabs.map((tab) => {
        const isActive = tab.key === activeTabKey;
        const iconName = isActive && tab.activeIconName ? tab.activeIconName : tab.iconName;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabPress(tab.key, tab.route)}
            style={({ pressed }) => [
              styles.tabItem,
              isActive && styles.tabItemActive,
              pressed && Platform.OS === 'ios' && styles.tabPressed,
            ]}
            android_ripple={{
              color: 'rgba(153, 27, 27, 0.12)',
              borderless: false,
              radius: 28,
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.label}${tab.badgeCount ? `, ${tab.badgeCount} thông báo mới` : ''}`}
            testID={`${testID}-tab-${tab.key}`}
          >
            <View style={styles.iconWrapper}>
              <Ionicons
                name={iconName}
                size={20}
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
    paddingHorizontal: 4,
    paddingBottom: Platform.OS === 'ios' ? tokens.spacing.xs : 4,
    ...tokens.elevation.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: tokens.radius.md,
    minHeight: 48, // 48dp minimum touch target
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

export default AppBottomNavigation;
