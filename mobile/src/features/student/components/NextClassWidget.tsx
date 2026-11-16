/**
 * NextClassWidget.tsx
 * Displays upcoming classes with REDS v2.0 Academic Palettes.
 * Renders verified timetable entries or friendly AppEmptyState.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';
import { AppText } from '@/components/primitives/AppText';
import { AppCard } from '@/components/primitives/AppCard';
import { AppEmptyState } from '@/components/feedback/AppEmptyState';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { formatDayOfWeek, formatTime } from '@/utils/formatters';
import { UpcomingClass } from '../types';

export interface NextClassWidgetProps {
  classes: UpcomingClass[];
  onViewAll?: () => void;
}

/**
 * Deterministically maps a course code to one of the 5 REDS v2.0 Academic Palettes
 */
export const getAcademicPaletteForCourse = (courseCode: string) => {
  const list = [
    tokens.academic.blueSapphire,
    tokens.academic.emeraldGreen,
    tokens.academic.amberGold,
    tokens.academic.purpleAmethyst,
    tokens.academic.roseRuby,
  ];
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = (hash << 5) - hash + courseCode.charCodeAt(i);
    hash |= 0;
  }
  return list[Math.abs(hash) % list.length];
};

export const NextClassWidget: React.FC<NextClassWidgetProps> = ({ classes, onViewAll }) => {
  const router = useRouter();

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push('/(student)/timetable');
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <SectionHeader
        title="Lớp học sắp tới"
        actionLabel="Xem tất cả"
        onAction={handleViewAll}
      />

      {classes.length === 0 ? (
        <AppEmptyState
          icon="calendar-outline"
          title="Không có lớp học sắp tới"
          message="Bạn hiện không có lịch học nào cần tham gia trong tuần này."
        />
      ) : (
        classes.slice(0, 4).map((c) => {
          const palette = getAcademicPaletteForCourse(c.courseCode || 'CS');
          return (
            <AppCard
              key={c.id}
              variant="elevated"
              style={[styles.classCard, { borderLeftColor: palette.text, borderLeftWidth: 4 }]}
            >
              {/* Day & Time Column */}
              <View style={styles.classDayBadge}>
                <AppText variant="captionBold" style={[styles.classDayText, { color: palette.text }]}>
                  {formatDayOfWeek(c.dayOfWeek)}
                </AppText>
                <AppText variant="caption" color="muted" style={styles.classTimeRange}>
                  {formatTime(c.startTime)} - {formatTime(c.endTime)}
                </AppText>
              </View>

              <View style={styles.classDivider} />

              {/* Course & Room Details Column */}
              <View style={styles.classDetails}>
                <View style={styles.classCodeRow}>
                  <View style={[styles.codeBadge, { backgroundColor: palette.badge }]}>
                    <AppText variant="captionBold" style={[styles.courseCode, { color: palette.text }]}>
                      {c.courseCode}
                    </AppText>
                  </View>
                  {c.credits ? (
                    <AppText variant="caption" color="muted" style={styles.creditsTag}>
                      {c.credits} TC
                    </AppText>
                  ) : null}
                </View>

                <AppText variant="bodyBold" color="primary" numberOfLines={2} style={styles.courseName}>
                  {c.courseName}
                </AppText>

                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color={tokens.text.muted} />
                  <AppText variant="caption" color="secondary" numberOfLines={1} style={styles.roomLecturer}>
                    {c.roomName} • {c.lecturerName || 'Chưa phân công'}
                  </AppText>
                </View>
              </View>
            </AppCard>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.spacing.lg,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
  },
  classDayBadge: {
    width: 82,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  classDayText: {
    fontSize: 13,
    marginBottom: 2,
  },
  classTimeRange: {
    fontSize: 11,
  },
  classDivider: {
    width: 1,
    height: 40,
    backgroundColor: tokens.border.subtle,
    marginHorizontal: tokens.spacing.sm,
  },
  classDetails: {
    flex: 1,
  },
  classCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  codeBadge: {
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: 1,
    borderRadius: tokens.radius.xs,
    marginRight: tokens.spacing.xs,
  },
  courseCode: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  creditsTag: {
    fontSize: 10,
  },
  courseName: {
    fontSize: tokens.typography.sizes.body,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomLecturer: {
    fontSize: tokens.typography.sizes.caption,
    marginLeft: 3,
  },
});

export default NextClassWidget;
