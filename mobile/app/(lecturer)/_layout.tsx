/**
 * Lecturer Bottom Tab Navigator Layout
 * Protected by LecturerGuard, uses Ionicons navigation bar with Rikkei brand theme.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '@/theme';
import { LecturerGuard } from '@/guards';
import { NotificationBellButton } from '@/features/notifications';

export default function LecturerLayout() {
  return (
    <LecturerGuard>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.primary[900],
          },
          headerTintColor: colors.neutral[0],
          headerTitleStyle: {
            fontWeight: typography.weights.bold,
            fontSize: typography.sizes.md,
          },
          headerRight: () => <NotificationBellButton />,
          headerRightContainerStyle: { paddingRight: 8 },
          tabBarActiveTintColor: colors.primary[800],
          tabBarInactiveTintColor: colors.neutral[500],
          tabBarStyle: {
            backgroundColor: colors.neutral[0],
            borderTopColor: colors.neutral[200],
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: typography.sizes.xxs,
            fontWeight: typography.weights.medium,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Tổng quan GV',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={String(color || colors.primary[800])} />
            ),
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Lịch giảng dạy',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={String(color || colors.primary[800])} />
            ),
          }}
        />
        <Tabs.Screen
          name="classes"
          options={{
            title: 'Lớp học phần',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book-outline" size={size} color={String(color || colors.primary[800])} />
            ),
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            title: 'Điểm danh QR',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="qr-code-outline" size={size} color={String(color || colors.primary[800])} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Hồ sơ GV',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={String(color || colors.primary[800])} />
            ),
          }}
        />
      </Tabs>
    </LecturerGuard>
  );
}
