/**
 * useNotificationPermission Hook
 * Safely requests and handles push/local notification permissions via expo-notifications.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

/**
 * Synchronize a push token with backend and persist in AsyncStorage if registered.
 */
export async function syncPushTokenWithBackend(
  token: string,
  platform: 'IOS' | 'ANDROID' = Platform.OS === 'ios' ? 'IOS' : 'ANDROID'
): Promise<PushRegistrationResult> {
  const result = await notificationApi.registerPushTokenWithBackend(token, platform);
  if (result.status === 'REGISTERED') {
    await AsyncStorage.setItem('rikkei_eduportal_push_token', token).catch(() => {});
  }
  return result;
}

/**
 * Attaches a push token rotation listener to catch refreshed FCM/APNs device tokens.
 */
export function setupPushTokenRotationListener(
  onTokenRotated?: (token: string, result: PushRegistrationResult) => void
): { remove: () => void } | null {
  if (typeof Notifications.addPushTokenListener !== 'function') {
    return null;
  }
  return Notifications.addPushTokenListener(async (deviceToken) => {
    try {
      const newToken = deviceToken?.data;
      if (newToken) {
        const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
        const result = await syncPushTokenWithBackend(newToken, platform);
        if (onTokenRotated) {
          onTokenRotated(newToken, result);
        }
      }
    } catch (err) {
      console.warn('Failed to handle push token rotation:', err);
    }
  });
}

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
   * Listen for push token rotations and automatically synchronize with backend.
   */
  useEffect(() => {
    const subscription = setupPushTokenRotationListener((newToken, result) => {
      setPushToken(newToken);
      setRegistrationResult(result);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

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
          let token: string | null = null;

          // Step 1: Prefer native device push token (FCM registration token on Android)
          if (typeof Notifications.getDevicePushTokenAsync === 'function') {
            try {
              const deviceTokenData = await Notifications.getDevicePushTokenAsync();
              if (deviceTokenData?.data) {
                token = deviceTokenData.data;
              }
            } catch (deviceTokenErr) {
              console.warn('getDevicePushTokenAsync failed, falling back to Expo push token:', deviceTokenErr);
            }
          }

          // Step 2: Fallback to Expo Push Token if device token is unavailable (e.g. Expo Go)
          if (!token && typeof Notifications.getExpoPushTokenAsync === 'function') {
            const expoTokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
            if (expoTokenData?.data) {
              token = expoTokenData.data;
            }
          }

          if (token) {
            setPushToken(token);
            const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
            const result = await syncPushTokenWithBackend(token, platform);
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
