/**
 * Calendar Synchronization Hook (TASK ST-06)
 * Fetches subscription feed tokens, Webcal URLs, and integration instructions.
 */

import { useQuery } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { studentApi } from '../services/studentApi';
import { CalendarSubscriptionInfo } from '../types';

export function useCalendarSync() {
  const query = useQuery<CalendarSubscriptionInfo, Error>({
    queryKey: ['student', 'calendar-subscription'],
    queryFn: () => studentApi.getCalendarSubscriptionInfo(),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const openWebcal = async () => {
    if (query.data?.webcalUrl) {
      try {
        await Linking.openURL(query.data.webcalUrl);
      } catch (err) {
        console.warn('Failed to open webcal url:', err);
      }
    }
  };

  const openSubscriptionUrl = async () => {
    if (query.data?.subscriptionUrl) {
      try {
        await Linking.openURL(query.data.subscriptionUrl);
      } catch (err) {
        console.warn('Failed to open subscription url:', err);
      }
    }
  };

  const openExportUrl = async () => {
    if (query.data?.exportUrl) {
      try {
        await Linking.openURL(query.data.exportUrl);
      } catch (err) {
        console.warn('Failed to open export url:', err);
      }
    }
  };

  return {
    ...query,
    subscriptionInfo: query.data,
    openWebcal,
    openSubscriptionUrl,
    openExportUrl,
  };
}
