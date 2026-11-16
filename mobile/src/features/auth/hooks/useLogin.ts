/**
 * Custom Hook: useLogin
 * Handles login submission, loading state, anti-double submission, and role routing.
 */

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { authApi } from '../services/authApi';
import { useAuthStore } from '@/stores/authStore';
import { normalizeError } from '@/api/client';
import { LoginRequest } from '@/types';

export interface UseLoginResult {
  isLoading: boolean;
  errorMessage: string | null;
  clearError: () => void;
  handleSubmitLogin: (credentials: LoginRequest) => Promise<boolean>;
}

export const useLogin = (): UseLoginResult => {
  const router = useRouter();
  const loginToStore = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const handleSubmitLogin = useCallback(
    async (credentials: LoginRequest): Promise<boolean> => {
      // Synchronous double-submission guard via ref
      if (inFlightRef.current) return false;

      inFlightRef.current = true;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const authData = await authApi.login(credentials);

        // 1. Persist session securely in store
        await loginToStore(authData);

        // 2. Strict Role-based destination routing
        const role = authData.user?.role;
        if (role === 'STUDENT') {
          router.replace('/(student)/dashboard');
        } else if (role === 'LECTURER') {
          router.replace('/(lecturer)/dashboard');
        } else if (role === 'ADMIN') {
          router.replace('/unauthorized');
        } else {
          router.replace('/unauthorized');
        }

        return true;
      } catch (err: unknown) {
        const apiError = normalizeError(err);
        setErrorMessage(apiError.message);
        return false;
      } finally {
        inFlightRef.current = false;
        setIsLoading(false);
      }
    },
    [loginToStore, router]
  );

  return {
    isLoading,
    errorMessage,
    clearError,
    handleSubmitLogin,
  };
};
