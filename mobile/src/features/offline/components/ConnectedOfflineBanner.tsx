/**
 * ConnectedOfflineBanner.tsx
 * Shared Layout Integration for AppOfflineBanner.
 * Directly binds to existing useOffline() without creating duplicate listeners or offline stores.
 */

import React from 'react';
import { ViewStyle } from 'react-native';
import { AppOfflineBanner } from '@/components/ui';
import { useOffline } from '../OfflineContext';

export interface ConnectedOfflineBannerProps {
  message?: string;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export const ConnectedOfflineBanner: React.FC<ConnectedOfflineBannerProps> = ({
  message = 'Chế độ ngoại tuyến: Đang hiển thị bản lưu trên máy',
  style,
  testID = 'connected-offline-banner',
}) => {
  const { isOffline, lastOnlineAt, checkConnectivity } = useOffline();

  const formattedLastOnline = lastOnlineAt
    ? new Date(lastOnlineAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <AppOfflineBanner
      visible={isOffline}
      message={message}
      lastSyncedAt={formattedLastOnline}
      onSyncPress={checkConnectivity}
      style={style}
      testID={testID}
    />
  );
};

export default ConnectedOfflineBanner;
