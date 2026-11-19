/**
 * Root Application Layout
 * Injects Master AppProviders, Notification Deep Link Handler, and establishes Root Stack Navigation.
 */

import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AppProviders } from '@/providers/AppProviders';
import { useAuthStore } from '@/stores/authStore';
import { resolveNotificationRoute } from '@/features/notifications/utils/notificationDeepLink';

function NotificationResponseHandler() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // 1. Handle notification interaction when app is running (foreground or background)
    let subscription: { remove: () => void } | null = null;
    if (typeof Notifications.addNotificationResponseReceivedListener === 'function') {
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          const data = response?.notification?.request?.content?.data as Record<string, unknown> | undefined;
          const linkUrl = data?.route || data?.linkUrl || data?.url;
          if (typeof linkUrl === 'string') {
            const resolution = resolveNotificationRoute(linkUrl, user?.role, isAuthenticated);
            if (resolution.targetRoute) {
              router.push(resolution.targetRoute as any);
            }
          }
        } catch (err) {
          console.warn('Failed to handle notification response:', err);
        }
      });
    }

    // 2. Handle cold start when app was launched from a notification tap
    if (typeof Notifications.getLastNotificationResponseAsync === 'function') {
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) {
            const data = response?.notification?.request?.content?.data as Record<string, unknown> | undefined;
            const linkUrl = data?.route || data?.linkUrl || data?.url;
            if (typeof linkUrl === 'string') {
              const resolution = resolveNotificationRoute(linkUrl, user?.role, isAuthenticated);
              if (resolution.targetRoute) {
                router.push(resolution.targetRoute as any);
              }
            }
          }
        })
        .catch((err) => {
          console.warn('Failed to read last notification response:', err);
        });
    }

    return () => {
      subscription?.remove();
    };
  }, [router, user?.role, isAuthenticated]);

  return null;
}

export default function RootLayout() {
  return (
    <AppProviders>
      <NotificationResponseHandler />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(student)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(lecturer)" options={{ animation: 'fade' }} />
        <Stack.Screen name="unauthorized" options={{ animation: 'fade' }} />
      </Stack>
    </AppProviders>
  );
}
