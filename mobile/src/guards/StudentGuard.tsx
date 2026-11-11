/**
 * StudentGuard Component
 * Guarantees that only users with role 'STUDENT' can access wrapped routes.
 * Prevents unauthorized access, deep link bypass, and UI flashes.
 */

import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { LoadingScreen } from '@/components/common/LoadingScreen';

interface StudentGuardProps {
  children: React.ReactNode;
}

export const StudentGuard: React.FC<StudentGuardProps> = ({ children }) => {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);

  if (isInitializing) {
    return <LoadingScreen message="Đang xác thực thông tin sinh viên..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role !== 'STUDENT') {
    if (role === 'LECTURER') {
      return <Redirect href="/(lecturer)/dashboard" />;
    }
    return <Redirect href="/unauthorized" />;
  }

  return <>{children}</>;
};
