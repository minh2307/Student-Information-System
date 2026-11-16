/**
 * AppNotificationHeader.tsx
 * Standard Top Navigation Header integrated with Notification Center for REDS v2.0.
 * Seamlessly integrates AppHeader with real-time NotificationBellButton and unread badge.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { AppHeader, HeaderVariant } from '@/components/ui';
import { NotificationBellButton } from './NotificationBellButton';
import { tokens } from '@/theme';

export interface AppNotificationHeaderProps {
  title: string;
  subtitle?: string;
  variant?: HeaderVariant;
  showBackButton?: boolean;
  onBackPress?: () => void;
  additionalRightActions?: React.ReactNode;
  centerTitle?: boolean;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const AppNotificationHeader: React.FC<AppNotificationHeaderProps> = ({
  title,
  subtitle,
  variant = 'burgundy',
  showBackButton = false,
  onBackPress,
  additionalRightActions,
  centerTitle = false,
  style,
  testID = 'app-notification-header',
}) => {
  const bellTintColor = variant === 'burgundy' ? '#FFFFFF' : tokens.brand.crimson;

  const rightActionsNode = (
    <View style={styles.actionsContainer}>
      {additionalRightActions}
      <NotificationBellButton tintColor={bellTintColor} />
    </View>
  );

  return (
    <AppHeader
      title={title}
      subtitle={subtitle}
      variant={variant}
      showBackButton={showBackButton}
      onBackPress={onBackPress}
      rightActions={rightActionsNode}
      centerTitle={centerTitle}
      style={style}
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AppNotificationHeader;
