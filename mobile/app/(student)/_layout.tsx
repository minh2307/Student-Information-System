/**
 * Student Bottom Tab Navigator Layout
 * Comprehensive Student Subsystem tabs with Rikkei Burgundy styling.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '@/theme';
import { StudentGuard } from '@/guards';
import { NotificationBellButton } from '@/features/notifications';

export default function StudentLayout() {
  return (
    <StudentGuard>
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
            fontSize: 10,
            fontWeight: typography.weights.medium,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Tổng quan',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={String(color || colors.primary[800])} />
            ),
          }}
        />
        <Tabs.Screen
          name="timetable"
          options={{
            title: 'Lịch học',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={String(color || colors.primary[800])} />
            ),
          }}
        />
        <Tabs.Screen
          name="exams"
          options={{
            title: 'Lịch thi',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="clipboard-outline" size={size} color={String(color || colors.primary[800])} />
            ),
          }}
        />
        <Tabs.Screen
          name="grades"
          options={{
            title: 'Bảng điểm',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="school-outline" size={size} color={String(color || colors.primary[800])} />
            ),
          }}
        />
        <Tabs.Screen
          name="tuition"
          options={{
            title: 'Học phí',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet-outline" size={size} color={String(color || colors.primary[800])} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Hồ sơ',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={String(color || colors.primary[800])} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan-attendance"
          options={{
            tabBarItemStyle: { display: 'none' },
            tabBarButton: () => null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="registration"
          options={{
            tabBarItemStyle: { display: 'none' },
            tabBarButton: () => null,
            title: 'Đăng ký học phần',
          }}
        />
        <Tabs.Screen
          name="calendar-sync"
          options={{
            tabBarItemStyle: { display: 'none' },
            tabBarButton: () => null,
            title: 'Đồng bộ lịch',
          }}
        />
        <Tabs.Screen
          name="ai-advisor"
          options={{
            tabBarItemStyle: { display: 'none' },
            tabBarButton: () => null,
            headerShown: false,
            title: 'Cố vấn học vụ AI',
          }}
        />
      </Tabs>
    </StudentGuard>
  );
}
