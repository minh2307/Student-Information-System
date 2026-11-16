/**
 * Checked-in Attendee Roster Card - REDS v2.0
 * Live roster of scanned students with check-in timestamp and refresh trigger.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { formatTime } from '@/utils/formatters';
import { AttendanceRecord } from '../types';

export interface AttendeeRosterCardProps {
  attendees: AttendanceRecord[];
  isSessionActive: boolean;
  onRefresh: () => void;
  isRefreshing?: boolean;
  testID?: string;
}

export const AttendeeRosterCard: React.FC<AttendeeRosterCardProps> = ({
  attendees,
  isSessionActive,
  onRefresh,
  isRefreshing = false,
  testID = 'attendance-roster-card',
}) => {
  const count = attendees.length;

  return (
    <AppCard variant="elevated" style={styles.rosterCard} testID={testID}>
      {/* Header */}
      <View style={styles.rosterHeader}>
        <View style={styles.rosterHeaderLeft}>
          <Ionicons name="people" size={18} color={tokens.brand.burgundy} />
          <AppText variant="h3" style={styles.rosterTitle}>
            Danh sách đã điểm danh ({count})
          </AppText>
        </View>
        <Pressable
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={isRefreshing}
          android_ripple={{ color: tokens.brand.crimsonLight }}
          accessibilityRole="button"
          accessibilityLabel="Làm mới danh sách đã điểm danh"
        >
          <Ionicons
            name="refresh"
            size={18}
            color={tokens.brand.burgundy}
            style={isRefreshing ? { opacity: 0.5 } : undefined}
          />
        </Pressable>
      </View>

      {/* Body */}
      {count === 0 ? (
        <View style={styles.emptyRoster} testID="roster-empty-state">
          <View style={styles.emptyIconCircle}>
            <Ionicons name="people-outline" size={32} color={tokens.text.muted} />
          </View>
          <AppText variant="body" color="muted" style={styles.emptyRosterText}>
            {isSessionActive
              ? 'Đang chờ sinh viên quét mã QR...'
              : 'Chưa có bản ghi điểm danh nào trong phiên gần nhất.'}
          </AppText>
        </View>
      ) : (
        <View style={styles.rosterList} testID="roster-list">
          {attendees.map((record, index) => (
            <View
              key={record.recordId || index}
              style={styles.attendeeItem}
              testID={`attendee-item-${record.studentCode || index}`}
            >
              <View style={styles.attendeeIndex}>
                <AppText variant="captionBold" style={{ color: tokens.brand.burgundy }}>
                  {index + 1}
                </AppText>
              </View>
              <View style={styles.attendeeInfo}>
                <AppText variant="bodyBold" color="primary" style={styles.attendeeName}>
                  {record.studentName}
                </AppText>
                <AppText variant="caption" color="muted">
                  SV: {record.studentCode}
                </AppText>
              </View>
              <View style={styles.attendeeMeta}>
                <View style={styles.timeTag}>
                  <Ionicons name="checkmark-circle" size={14} color={tokens.semantic.success.dark} />
                  <AppText
                    variant="captionBold"
                    style={[styles.timeTagText, { color: tokens.semantic.success.dark }]}
                  >
                    {formatTime(record.checkInTime ? record.checkInTime.split('T')[1] : null)}
                  </AppText>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  rosterCard: {
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    backgroundColor: tokens.surface.card,
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
    paddingBottom: tokens.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.default,
  },
  rosterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  rosterTitle: {
    fontSize: 14,
  },
  refreshButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRoster: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.lg,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: tokens.surface.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.xs,
  },
  emptyRosterText: {
    textAlign: 'center',
    marginTop: tokens.spacing.xs,
  },
  rosterList: {
    marginTop: 4,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.xs + 4,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.subtle,
  },
  attendeeIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: tokens.brand.crimsonLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.sm,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 13,
  },
  attendeeMeta: {
    alignItems: 'flex-end',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeTagText: {
    fontSize: 11,
  },
});
