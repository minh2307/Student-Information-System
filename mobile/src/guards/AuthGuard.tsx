/**
 * AuthGuard Component
 * Ensures the route is accessible only to authenticated users.
 * Displays LoadingScreen during cold-start restoration to prevent unauthenticated flash.
 */

import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { LoadingScreen } from '@/components/common/LoadingScreen';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isInitializing) {
    return <LoadingScreen message="Đang kiểm tra thông tin đăng nhập..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <>{children}</>;
};
