/**
 * Initial Entry Route
 * Evaluates session state and role, dispatching users cleanly to their authorized module:
 * - STUDENT -> (student)/dashboard
 * - LECTURER -> (lecturer)/dashboard
 * - ADMIN -> /unauthorized (Admin Guidance screen)
 * - Unauthenticated -> (auth)/login
 */

import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { LoadingScreen } from '@/components/common/LoadingScreen';

export default function IndexScreen() {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);

  if (isInitializing) {
    return <LoadingScreen message="Đang khởi tạo ứng dụng..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === 'STUDENT') {
    return <Redirect href="/(student)/dashboard" />;
  }

  if (role === 'LECTURER') {
    return <Redirect href="/(lecturer)/dashboard" />;
  }

  // ADMIN or unrecognized role
  return <Redirect href="/unauthorized" />;
}
