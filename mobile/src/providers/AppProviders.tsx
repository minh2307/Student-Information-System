/**
 * Master Application Providers Hierarchy
 * Integrates SafeAreaProvider, TanStack Query Offline Persistence, and Auth Session Restoration.
 */

import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from './queryClient';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuthStore } from '@/stores/authStore';
import { OfflineProvider } from '@/features/offline';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    // Restore authentication state from SecureStore & cache upon app cold start
    restoreSession();
  }, [restoreSession]);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            maxAge: 1000 * 60 * 60 * 24, // 24 hours
            dehydrateOptions: {
              shouldDehydrateQuery: (query) => {
                // Ensure authentication token queries are never persisted
                const queryKey = query.queryKey;
                if (Array.isArray(queryKey) && queryKey[0] === 'auth') {
                  return false;
                }
                return query.state.status === 'success';
              },
            },
          }}
        >
          <OfflineProvider>
            {children}
          </OfflineProvider>
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
};

export default AppProviders;
