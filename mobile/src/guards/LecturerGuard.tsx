/**
 * LecturerGuard Component
 * Guarantees that only users with role 'LECTURER' can access wrapped routes.
 * Prevents unauthorized access, deep link bypass, and UI flashes.
 */

import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { LoadingScreen } from '@/components/common/LoadingScreen';

interface LecturerGuardProps {
  children: React.ReactNode;
}

export const LecturerGuard: React.FC<LecturerGuardProps> = ({ children }) => {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);

  if (isInitializing) {
    return <LoadingScreen message="Đang xác thực thông tin giảng viên..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role !== 'LECTURER') {
    if (role === 'STUDENT') {
      return <Redirect href="/(student)/dashboard" />;
    }
    return <Redirect href="/unauthorized" />;
  }

  return <>{children}</>;
};
