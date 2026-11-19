/**
 * LecturerScheduleCard Component - REDS v2.0
 * Card displaying an individual teaching session with Academic Palette left border,
 * course details, time, room, and enrollment progress.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/feedback/AppBadge';
import { LecturerClassSection } from '@/features/lecturer/types';
import { getAcademicPaletteForCourse } from '@/features/lecturer/utils/academicPalette';
import { formatDayOfWeek, formatTime } from '@/utils/formatters';
import { tokens } from '@/theme';

export interface LecturerScheduleCardProps {
  item: LecturerClassSection;
  onPress: (item: LecturerClassSection) => void;
  testID?: string;
}

export const LecturerScheduleCard: React.FC<LecturerScheduleCardProps> = ({
  item,
  onPress,
  testID,
}) => {
  const palette = getAcademicPaletteForCourse(item.courseCode || 'CS');

  return (
    <AppCard
      variant="elevated"
      style={[
        styles.classCard,
        { borderLeftColor: palette.text, borderLeftWidth: 4 },
      ]}
      onPress={() => onPress(item)}
      accessibilityLabel={`Chi tiết lớp ${item.sectionCode}`}
      testID={testID || `lecturer-class-${item.sectionId}`}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.codeBadge, { backgroundColor: palette.badge }]}>
          <AppText
            variant="captionBold"
            style={[styles.codeText, { color: palette.text }]}
          >
            {item.sectionCode}
          </AppText>
        </View>
        <AppBadge
          label={item.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
          variant={item.status === 'OPEN' ? 'success' : 'warning'}
          size="sm"
        />
      </View>

      <AppText
        variant="bodyBold"
        color="primary"
        numberOfLines={2}
        style={styles.courseName}
      >
        {item.courseName}
      </AppText>
      <AppText variant="caption" color="secondary" style={styles.courseCode}>
        Mã môn: {item.courseCode} | {item.credits} tín chỉ | Kỳ:{' '}
        {item.semesterName}
      </AppText>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={15} color={palette.text} />
            <AppText variant="caption" color="secondary" style={styles.metaText}>
              {formatDayOfWeek(item.dayOfWeek)}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={15} color={palette.text} />
            <AppText variant="caption" color="secondary" style={styles.metaText}>
              {formatTime(item.startTime)} - {formatTime(item.endTime)}
            </AppText>
          </View>
        </View>

        <View style={styles.metaCol}>
          <View style={styles.metaItem}>
            <Ionicons
              name="location-outline"
              size={15}
              color={tokens.text.muted}
            />
            <AppText variant="caption" color="secondary" style={styles.metaText}>
              Phòng: {item.roomName}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={15} color={tokens.text.muted} />
            <AppText variant="caption" color="secondary" style={styles.metaText}>
              Sĩ số: {item.currentEnrolled}/{item.maxCapacity} SV
            </AppText>
          </View>
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  classCard: {
    marginBottom: tokens.spacing.sm,
    padding: tokens.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  codeText: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  courseName: {
    marginTop: 2,
  },
  courseCode: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: tokens.border.default,
    marginVertical: tokens.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
});
