/**
 * ScheduleDaySelector Component - REDS v2.0
 * Horizontal filter bar for selecting day of week in teaching schedule.
 * Complies with WCAG AA (>= 48dp touch targets, today indicator dot).
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { AppText } from '@/components/primitives/AppText';
import { tokens } from '@/theme';

export interface DayOption {
  code: string;
  label: string;
}

export const SCHEDULE_DAYS: readonly DayOption[] = [
  { code: 'ALL', label: 'Tất cả' },
  { code: 'MON', label: 'Thứ 2' },
  { code: 'TUE', label: 'Thứ 3' },
  { code: 'WED', label: 'Thứ 4' },
  { code: 'THU', label: 'Thứ 5' },
  { code: 'FRI', label: 'Thứ 6' },
  { code: 'SAT', label: 'Thứ 7' },
  { code: 'SUN', label: 'CN' },
];

export interface ScheduleDaySelectorProps {
  days?: readonly DayOption[];
  selectedDay: string;
  todayDayCode: string;
  onSelectDay: (dayCode: string) => void;
  testID?: string;
}

export const ScheduleDaySelector: React.FC<ScheduleDaySelectorProps> = ({
  days = SCHEDULE_DAYS,
  selectedDay,
  todayDayCode,
  onSelectDay,
  testID = 'schedule-day-selector',
}) => {
  return (
    <View style={styles.daySelectorContainer} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daySelectorScroll}
      >
        {days.map((day) => {
          const isSelected = selectedDay === day.code;
          const isToday = day.code === todayDayCode;

          return (
            <Pressable
              key={day.code}
              style={({ pressed }) => [
                styles.dayButton,
                isSelected ? styles.dayButtonSelected : styles.dayButtonInactive,
                pressed && styles.dayButtonPressed,
              ]}
              onPress={() => onSelectDay(day.code)}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              android_ripple={{
                color: isSelected
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'rgba(153, 27, 27, 0.12)',
                borderless: false,
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Xem lịch ${day.label}`}
              testID={`lecturer-day-${day.code}`}
            >
              <AppText
                variant="captionBold"
                style={[
                  styles.dayButtonText,
                  isSelected
                    ? styles.dayButtonTextSelected
                    : isToday
                    ? styles.todayText
                    : styles.dayButtonTextInactive,
                ]}
              >
                {day.label}
              </AppText>
              {isToday ? (
                <View
                  style={[
                    styles.todayDot,
                    isSelected ? styles.todayDotActive : styles.todayDotInactive,
                  ]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  daySelectorContainer: {
    backgroundColor: tokens.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.default,
    paddingVertical: tokens.spacing.xs,
  },
  daySelectorScroll: {
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.xs,
    alignItems: 'center',
  },
  dayButton: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Touch target >= 48dp
    minWidth: 54,
  },
  dayButtonSelected: {
    backgroundColor: tokens.brand.burgundy,
    borderWidth: 1,
    borderColor: tokens.brand.burgundy,
  },
  dayButtonInactive: {
    backgroundColor: tokens.surface.canvas,
    borderWidth: 1,
    borderColor: tokens.border.default,
  },
  dayButtonPressed: {
    opacity: 0.85,
  },
  dayButtonText: {
    fontSize: 12,
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: tokens.typography.weights.bold,
  },
  dayButtonTextInactive: {
    color: tokens.text.primary,
  },
  todayText: {
    color: tokens.brand.crimson,
    fontWeight: tokens.typography.weights.bold,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  todayDotActive: {
    backgroundColor: '#FFFFFF',
  },
  todayDotInactive: {
    backgroundColor: tokens.brand.crimson,
  },
});
