/**
 * useNetworkStatus Hook
 * Subscribes to device network connectivity changes via @react-native-community/netinfo.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { NetworkState } from './types';

let moduleNetworkState: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  isOffline: false,
  type: 'unknown',
  lastOnlineAt: null,
};

function parseNetInfoState(state: NetInfoState): NetworkState {
  const isConnected = Boolean(state.isConnected);
  // When isInternetReachable is null (untested yet), trust isConnected
  const isReachable = state.isInternetReachable ?? isConnected;
  const isOffline = !isConnected || isReachable === false;

  return {
    isConnected,
    isInternetReachable: state.isInternetReachable,
    isOffline,
    type: state.type || 'unknown',
    lastOnlineAt: !isOffline ? new Date() : moduleNetworkState.lastOnlineAt,
  };
}

// Module-level listener tracks NetInfo events synchronously across re-renders/SSR tests
NetInfo.addEventListener((state) => {
  moduleNetworkState = parseNetInfoState(state);
});

export function useNetworkStatus(): NetworkState & {
  checkConnectivity: () => Promise<boolean>;
} {
  const [networkState, setNetworkState] = useState<NetworkState>(() => ({ ...moduleNetworkState }));
  const lastOnlineRef = useRef<Date | null>(moduleNetworkState.lastOnlineAt);

  const handleStateChange = useCallback((state: NetInfoState) => {
    const nextState = parseNetInfoState(state);
    moduleNetworkState = nextState;
    if (!nextState.isOffline) {
      lastOnlineRef.current = nextState.lastOnlineAt;
    }

    setNetworkState(nextState);
  }, []);

  useEffect(() => {
    // 1. Fetch initial state
    NetInfo.fetch().then(handleStateChange).catch(() => {});

    // 2. Subscribe to real-time connectivity changes
    const unsubscribe = NetInfo.addEventListener(handleStateChange);
    return () => {
      unsubscribe();
    };
  }, [handleStateChange]);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const state = await NetInfo.fetch();
      handleStateChange(state);
      const reachable = state.isInternetReachable ?? state.isConnected;
      return Boolean(state.isConnected && reachable !== false);
    } catch {
      return false;
    }
  }, [handleStateChange]);

  return {
    ...networkState,
    checkConnectivity,
  };
}
