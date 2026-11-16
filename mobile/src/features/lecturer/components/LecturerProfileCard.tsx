/**
 * LecturerProfileCard.tsx
 * Institutional Burgundy Identity Card for Lecturers (REDS v2.0).
 * Displays verified university credentials, academic title, and department.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { tokens } from '@/theme';
import { AppText } from '@/components/primitives/AppText';
import { User, LecturerProfile } from '@/types';

export interface LecturerProfileCardProps {
  user: User | null;
  lecturerProfile?: LecturerProfile | null;
  testID?: string;
}

export const LecturerProfileCard: React.FC<LecturerProfileCardProps> = ({
  user,
  lecturerProfile,
  testID = 'lecturer-identity-card',
}) => {
  const lecturerName = user?.fullName || 'Giảng viên';
  const lecturerCode = lecturerProfile?.lecturerCode || user?.username || 'GV001';
  const department = lecturerProfile?.department || 'Khoa Công nghệ Thông tin';
  const degree = lecturerProfile?.degree;
  const initial = lecturerName.charAt(0).toUpperCase();

  return (
    <View style={styles.card} testID={testID}>
      {/* Institutional Top Header */}
      <View style={styles.header}>
        <AppText variant="captionBold" style={styles.schoolTitle}>
          HỌC VIỆN CÔNG NGHỆ RIKKEI
        </AppText>
        <View style={styles.roleBadgePill}>
          <AppText variant="captionBold" style={styles.roleBadgeText}>
            GIẢNG VIÊN
          </AppText>
        </View>
      </View>

      {/* Profile Details Body */}
      <View style={styles.body}>
        <View style={styles.avatarContainer}>
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <AppText variant="h2" style={styles.avatarText}>
                {initial}
              </AppText>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <AppText variant="bodyBold" style={styles.lecturerName} numberOfLines={1}>
            {lecturerName}
          </AppText>
          <AppText variant="caption" style={styles.lecturerCode}>
            Mã GV: {lecturerCode}
          </AppText>
          <AppText variant="caption" style={styles.department} numberOfLines={1}>
            {department}
          </AppText>
        </View>
      </View>

      {/* Degree Badge Row (when present) */}
      {degree ? (
        <View style={styles.degreeRow}>
          <View style={styles.degreeBadgePill}>
            <AppText variant="captionBold" style={styles.degreeBadgeText}>
              {degree}
            </AppText>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.brand.burgundy,
    borderRadius: tokens.radius.xxl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...tokens.elevation.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    paddingBottom: tokens.spacing.xs,
  },
  schoolTitle: {
    color: '#FECACA',
    letterSpacing: 0.8,
  },
  roleBadgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    marginVertical: tokens.spacing.xs,
  },
  avatarContainer: {
    width: 54,
    height: 54,
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: tokens.radius.xl,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.brand.crimson,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: tokens.typography.weights.bold,
  },
  infoContainer: {
    flex: 1,
  },
  lecturerName: {
    color: '#FFFFFF',
  },
  lecturerCode: {
    color: '#FECACA',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  department: {
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  degreeRow: {
    marginTop: tokens.spacing.sm,
    paddingTop: tokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  degreeBadgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  degreeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
});

export default LecturerProfileCard;
