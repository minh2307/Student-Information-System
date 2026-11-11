/**
 * Root Application Layout
 * Injects Master AppProviders and establishes Root Stack Navigation.
 */

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/providers/AppProviders';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <AppProviders>
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
