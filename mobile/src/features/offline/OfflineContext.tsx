/**
 * Offline Mode React Context & Provider
 * Distributes network state across the application tree.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { OfflineContextValue } from './types';
import { useNetworkStatus } from './useNetworkStatus';

const OfflineContext = createContext<OfflineContextValue | null>(null);

export interface OfflineProviderProps {
  children: React.ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const status = useNetworkStatus();

  const contextValue = useMemo<OfflineContextValue>(
    () => ({
      isConnected: status.isConnected,
      isInternetReachable: status.isInternetReachable,
      isOffline: status.isOffline,
      type: status.type,
      lastOnlineAt: status.lastOnlineAt,
      checkConnectivity: status.checkConnectivity,
    }),
    [
      status.isConnected,
      status.isInternetReachable,
      status.isOffline,
      status.type,
      status.lastOnlineAt,
      status.checkConnectivity,
    ]
  );

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
};

/**
 * Access offline connectivity state from anywhere in the component tree.
 */
export const useOffline = (): OfflineContextValue => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
