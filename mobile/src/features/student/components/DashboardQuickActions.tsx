/**
 * DashboardQuickActions.tsx
 * 4 Quick Navigation Action Tiles with Accessible >= 48dp Touch Targets.
 * Styled via REDS v2.0 Tokens & Micro-elevation.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';
import { AppText } from '@/components/primitives/AppText';

export interface DashboardQuickActionsProps {
  onNavigate?: (route: string) => void;
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({ onNavigate }) => {
  const router = useRouter();

  const handlePress = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      router.push(route as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Timetable Action */}
      <Pressable
        style={({ pressed }) => [styles.tile, pressed && styles.pressedTile]}
        onPress={() => handlePress('/(student)/timetable')}
        android_ripple={{ color: 'rgba(29, 78, 216, 0.12)', borderless: false }}
        accessibilityRole="button"
        accessibilityLabel="Xem thời khóa biểu"
        testID="quick-action-timetable"
      >
        <View style={[styles.iconWrapper, { backgroundColor: '#EFF6FF' }]}>
          <Ionicons name="calendar" size={22} color="#1D4ED8" />
        </View>
        <AppText variant="captionBold" color="primary" style={styles.label}>
          Lịch học
        </AppText>
      </Pressable>

      {/* Exams Action */}
      <Pressable
        style={({ pressed }) => [styles.tile, pressed && styles.pressedTile]}
        onPress={() => handlePress('/(student)/exams')}
        android_ripple={{ color: 'rgba(180, 83, 9, 0.12)', borderless: false }}
        accessibilityRole="button"
        accessibilityLabel="Xem lịch thi"
        testID="quick-action-exams"
      >
        <View style={[styles.iconWrapper, { backgroundColor: '#FFFBEB' }]}>
          <Ionicons name="clipboard" size={22} color="#B45309" />
        </View>
        <AppText variant="captionBold" color="primary" style={styles.label}>
          Lịch thi
        </AppText>
      </Pressable>

      {/* Grades Action */}
      <Pressable
        style={({ pressed }) => [styles.tile, pressed && styles.pressedTile]}
        onPress={() => handlePress('/(student)/grades')}
        android_ripple={{ color: 'rgba(4, 120, 87, 0.12)', borderless: false }}
        accessibilityRole="button"
        accessibilityLabel="Xem bảng điểm"
        testID="quick-action-grades"
      >
        <View style={[styles.iconWrapper, { backgroundColor: '#ECFDF5' }]}>
          <Ionicons name="school" size={22} color="#047857" />
        </View>
        <AppText variant="captionBold" color="primary" style={styles.label}>
          Bảng điểm
        </AppText>
      </Pressable>

      {/* Tuition Action */}
      <Pressable
        style={({ pressed }) => [styles.tile, pressed && styles.pressedTile]}
        onPress={() => handlePress('/(student)/tuition')}
        android_ripple={{ color: 'rgba(190, 18, 60, 0.12)', borderless: false }}
        accessibilityRole="button"
        accessibilityLabel="Xem học phí"
        testID="quick-action-tuition"
      >
        <View style={[styles.iconWrapper, { backgroundColor: '#FFF1F2' }]}>
          <Ionicons name="wallet" size={22} color="#BE123C" />
        </View>
        <AppText variant="captionBold" color="primary" style={styles.label}>
          Học phí
        </AppText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.lg,
  },
  tile: {
    flex: 1,
    minHeight: 76,
    minWidth: 48,
    backgroundColor: tokens.surface.card,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    ...tokens.elevation.sm,
  },
  pressedTile: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.xs,
  },
  label: {
    textAlign: 'center',
    fontSize: 12,
  },
});

export default DashboardQuickActions;
