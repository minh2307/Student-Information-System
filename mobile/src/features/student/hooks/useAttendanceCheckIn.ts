/**
 * Student Attendance Check-In Mutation & Lifecycle Hook (TASK ST-01.4)
 * Submits dynamic QR code token (TOTP) to POST /api/v1/attendance/check-in.
 * Coordinates request lifecycle, state machine, unmount safety, and query cache invalidation.
 */

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../services/studentApi';
import { AttendanceCheckInRequest, AttendanceCheckInResponse } from '../types';
import { getDeviceCheckInInfo } from '@/utils/deviceIdentity';

export const DUPLICATE_ATTENDANCE_PREFIX = 'ĐÃ ĐIỂM DANH TRƯỚC ĐÓ';

/**
 * Checks whether an error from the check-in API corresponds specifically to duplicate attendance.
 *
 * Rules:
 * 1. HTTP status MUST be 409 (Conflict).
 * 2. Message MUST contain the verified duplicate attendance identifier:
 *    - "đã điểm danh trước đó" (case-insensitive) OR
 *    - "already checked in" (English fallback)
 * Any other HTTP 409 (e.g., lock conflict, optimistic lock) returns false.
 */
export function isDuplicateAttendanceError(error: any): boolean {
  if (!error) {
    return false;
  }

  const status = error?.response?.status ?? error?.status;
  if (status !== 409) {
    return false;
  }

  const rawMessage =
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message;

  if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
    return false;
  }

  const normalized = rawMessage.toLowerCase().trim();
  return (
    normalized.includes('đã điểm danh trước đó') ||
    normalized.includes('already checked in')
  );
}

/**
 * Checks whether an error is a network dropout or request timeout (result unconfirmed on server).
 */
export function isNetworkOrTimeoutError(error: any): boolean {
  if (!error) return false;
  const hasResponseStatus = Boolean(error?.response?.status || error?.status);
  if (hasResponseStatus) {
    return false;
  }
  const code = error?.code;
  const message = (error?.message || '').toLowerCase();
  return (
    code === 'ECONNABORTED' ||
    message.includes('network error') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('failed to fetch') ||
    message.includes('mất kết nối')
  );
}

export type CheckInStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'duplicate'
  | 'error'
  | 'unknown_result';

export interface CheckInState {
  status: CheckInStatus;
  activeToken: string | null;
  result: AttendanceCheckInResponse | null;
  duplicateNotice: { message: string } | null;
  errorMessage: string | null;
  timestamp: number | null;
}

// Module-level session state to survive Modal unmount/re-mount
let sharedSessionState: CheckInState = {
  status: 'idle',
  activeToken: null,
  result: null,
  duplicateNotice: null,
  errorMessage: null,
  timestamp: null,
};

const listeners = new Set<(state: CheckInState) => void>();

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener(sharedSessionState);
    } catch {}
  }
}

export function updateSharedSessionState(patch: Partial<CheckInState>): void {
  sharedSessionState = { ...sharedSessionState, ...patch };
  notifyListeners();
}

export function getAttendanceCheckInSessionState(): CheckInState {
  return sharedSessionState;
}

export function resetAttendanceCheckInSession(): void {
  sharedSessionState = {
    status: 'idle',
    activeToken: null,
    result: null,
    duplicateNotice: null,
    errorMessage: null,
    timestamp: null,
  };
  notifyListeners();
}

export const useAttendanceCheckIn = () => {
  let queryClient: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    queryClient = useQueryClient();
  } catch {
    // Non-throwing fallback when rendered outside QueryClientProvider (e.g. static tests)
  }

  const [sessionState, setSessionState] = useState<CheckInState>(sharedSessionState);

  useEffect(() => {
    const listener = (newState: CheckInState) => {
      setSessionState(newState);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const mutation = useMutation<AttendanceCheckInResponse, Error, AttendanceCheckInRequest>({
    mutationFn: async (request: AttendanceCheckInRequest) => {
      return await studentApi.checkInAttendance(request);
    },
    onSuccess: () => {
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['student'] });
      }
    },
  });

  const submitCheckIn = useCallback(
    async (
      parsedToken: string,
      options?: {
        onSuccess?: (res: AttendanceCheckInResponse) => void;
      }
    ) => {
      if (sharedSessionState.status === 'submitting') {
        return; // Guard against concurrent double-submit
      }

      updateSharedSessionState({
        status: 'submitting',
        activeToken: parsedToken,
        result: null,
        duplicateNotice: null,
        errorMessage: null,
        timestamp: Date.now(),
      });

      try {
        const deviceInfo = await getDeviceCheckInInfo();
        const response = await mutation.mutateAsync({
          qrToken: parsedToken,
          deviceInfo,
          clientTimestampMs: Date.now(),
        });

        updateSharedSessionState({
          status: 'success',
          result: response,
          duplicateNotice: null,
          errorMessage: null,
        });

        if (queryClient) {
          queryClient.invalidateQueries({ queryKey: ['student'] });
        }

        options?.onSuccess?.(response);
        return response;
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Không thể xác thực mã điểm danh. Vui lòng thử lại.';

        if (isDuplicateAttendanceError(err)) {
          updateSharedSessionState({
            status: 'duplicate',
            result: null,
            duplicateNotice: { message: msg },
            errorMessage: null,
          });
          if (queryClient) {
            queryClient.invalidateQueries({ queryKey: ['student'] });
          }
        } else if (isNetworkOrTimeoutError(err)) {
          updateSharedSessionState({
            status: 'unknown_result',
            result: null,
            duplicateNotice: null,
            errorMessage:
              'Mất kết nối hoặc quá thời gian chờ. Hệ thống có thể đã ghi nhận điểm danh. Vui lòng kiểm tra lịch sử điểm danh trước khi quét lại.',
          });
        } else {
          updateSharedSessionState({
            status: 'error',
            result: null,
            duplicateNotice: null,
            errorMessage: msg,
          });
        }
        throw err;
      }
    },
    [mutation, queryClient]
  );

  const resetState = useCallback(() => {
    resetAttendanceCheckInSession();
  }, []);

  return {
    state: sessionState,
    submitCheckIn,
    resetState,
    isPending: sessionState.status === 'submitting' || mutation.isPending,
    mutateAsync: mutation.mutateAsync,
  };
};

export default useAttendanceCheckIn;
