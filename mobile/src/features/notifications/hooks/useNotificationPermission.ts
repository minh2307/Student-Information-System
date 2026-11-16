/**
 * useNotificationPermission Hook
 * Safely requests and handles push/local notification permissions via expo-notifications.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { notificationApi } from '../services/notificationApi';
import { PushRegistrationResult } from '../types';

// Configure foreground notification behavior: alert, sound, badge
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotificationPermission() {
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [isGranted, setIsGranted] = useState<boolean>(false);
  const [canAskAgain, setCanAskAgain] = useState<boolean>(true);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [registrationResult, setRegistrationResult] = useState<PushRegistrationResult | null>(null);
  const hasInitializedChannelRef = useRef<boolean>(false);

  /**
   * Configure Android Notification Channel with high priority and vibration.
   */
  const setupAndroidChannel = useCallback(async () => {
    if (Platform.OS === 'android' && !hasInitializedChannelRef.current) {
      try {
        await Notifications.setNotificationChannelAsync('rikkei-default', {
          name: 'Thông báo Rikkei EduPortal',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#7F1D1D',
          sound: 'default',
        });
        hasInitializedChannelRef.current = true;
      } catch (err) {
        console.warn('Failed to configure Android notification channel:', err);
      }
    }
  }, []);

  /**
   * Check existing permission status on mount.
   */
  useEffect(() => {
    void setupAndroidChannel();

    Notifications.getPermissionsAsync()
      .then((settings) => {
        setPermissionStatus(settings.status);
        setIsGranted(settings.granted);
        setCanAskAgain(settings.canAskAgain);
      })
      .catch(() => {});
  }, [setupAndroidChannel]);

  /**
   * Request permissions from user with explicit rationale.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const settings = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      setPermissionStatus(settings.status);
      setIsGranted(settings.granted);
      setCanAskAgain(settings.canAskAgain);

      if (settings.granted) {
        // Obtain push token if available
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
          if (tokenData?.data) {
            setPushToken(tokenData.data);
            // Attempt backend registration (will document BLOCKED_BY_BACKEND gracefully)
            const result = await notificationApi.registerPushTokenWithBackend(tokenData.data);
            setRegistrationResult(result);
          }
        } catch {
          // Push service might not be available in simulator/emulator
        }
        return true;
      }

      return false;
    } catch (err) {
      console.warn('Failed to request notification permissions:', err);
      return false;
    }
  }, []);

  return {
    permissionStatus,
    isGranted,
    canAskAgain,
    pushToken,
    registrationResult,
    requestPermission,
  };
}
