/**
 * useRequireOnlineAction Hook
 * Guards state-mutating operations when device is offline.
 * Prevents phantom queueing and data corruption on backend.
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useOffline } from '../OfflineContext';

export interface RequireOnlineOptions {
  /**
   * Human-readable name of the action (e.g. "Điểm danh QR", "Đăng ký môn học").
   */
  actionName: string;

  /**
   * Custom message explaining why network connectivity is required.
   */
  message?: string;
}

export function useRequireOnlineAction() {
  const { isOffline, checkConnectivity } = useOffline();

  /**
   * Executes the provided callback ONLY if the device is currently online.
   * If offline, intercepts with a clear Vietnamese alert and returns false.
   */
  const executeOnlineAction = useCallback(
    async <T>(
      action: () => Promise<T> | T,
      options: RequireOnlineOptions
    ): Promise<T | null> => {
      // 1. Double check real-time connectivity before proceeding
      if (isOffline) {
        Alert.alert(
          'Yêu cầu kết nối Internet',
          options.message ||
            `Không thể thực hiện "${options.actionName}" khi đang ngoại tuyến. Vui lòng kết nối mạng để bảo đảm dữ liệu chính xác và tránh gửi trùng.`
        );
        return null;
      }

      // 2. Perform live probe to verify connectivity
      const canReach = await checkConnectivity();
      if (!canReach) {
        Alert.alert(
          'Mất kết nối Internet',
          `Kết nối mạng không ổn định. Không thể thực hiện "${options.actionName}". Vui lòng thử lại sau khi có mạng.`
        );
        return null;
      }

      // 3. Execute action
      return await action();
    },
    [isOffline, checkConnectivity]
  );

  return {
    isOffline,
    executeOnlineAction,
  };
}
