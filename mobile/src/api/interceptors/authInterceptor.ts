/**
 * Concurrency-Safe Authentication Interceptor (Mutex Queue)
 *
 * CRITICAL SECURITY ASSURANCE:
 * Backend applies Refresh Token Rotation (RTR) and Token Reuse Detection.
 * If multiple concurrent requests refresh using the same stale token, the backend revokes all tokens.
 * This interceptor enforces a strict single-flight mutex:
 * - Only ONE refresh request runs at a time.
 * - All concurrent 401 requests wait in `failedQueue`.
 * - All waiting requests are replayed with the single newly issued access token.
 * - Circular retries on /auth endpoints are strictly prevented.
 * - Logout during in-flight refresh cancels token persistence (Race Condition Guard).
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '@/storage/tokenStorage';
import { ENDPOINTS } from '../endpoints';
import { ApiResponse, AuthResponse } from '@/types';

interface QueuedPromise {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let refreshEpoch = 0;
let failedQueue: QueuedPromise[] = [];
let authFailureHandler: (() => void) | null = null;
let tokenUpdatedHandler: ((authData: AuthResponse) => void) | null = null;

export const setAuthFailureHandler = (handler: () => void): void => {
  authFailureHandler = handler;
};

export const setTokenUpdatedHandler = (handler: (authData: AuthResponse) => void): void => {
  tokenUpdatedHandler = handler;
};

/**
 * Explicitly cancel in-flight refresh upon logout or account switching.
 * Prevents newly rotated tokens from being persisted into SecureStore after logout.
 */
export const cancelPendingRefresh = (): void => {
  refreshEpoch++;
  isRefreshing = false;
  processQueue(new Error('Session terminated: Refresh cancelled'), null);
};

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Configure request and response interceptors on the Axios client.
 */
export const setupAuthInterceptors = (
  client: AxiosInstance,
  baseURL: string
): void => {
  // 1. Request Interceptor: Attach Access Token
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await tokenStorage.getAccessToken();
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // 2. Response Interceptor: Mutex Refresh Queue on 401
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

      if (!originalRequest) {
        return Promise.reject(error);
      }

      const status = error.response?.status;
      const url = originalRequest.url || '';

      // Skip refresh for auth endpoints to prevent infinite retry loops
      const isAuthEndpoint =
        url.includes(ENDPOINTS.AUTH.LOGIN) ||
        url.includes(ENDPOINTS.AUTH.REFRESH) ||
        url.includes(ENDPOINTS.AUTH.LOGOUT);

      if (status === 401 && !isAuthEndpoint && !originalRequest._retry) {
        const refreshToken = await tokenStorage.getRefreshToken();

        // If no refresh token exists, immediately trigger logout
        if (!refreshToken) {
          await tokenStorage.clearTokens();
          authFailureHandler?.();
          return Promise.reject(error);
        }

        // If a refresh is already in flight, queue this request
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((newAccessToken) => {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return client(originalRequest);
            })
            .catch((queueErr) => Promise.reject(queueErr));
        }

        // Lock mutex and execute refresh
        originalRequest._retry = true;
        isRefreshing = true;
        const currentEpoch = ++refreshEpoch;

        try {
          // Use isolated axios call without interceptors to prevent circular trapping
          const refreshUrl = `${baseURL.replace(/\/+$/, '')}${ENDPOINTS.AUTH.REFRESH}`;
          const response = await axios.post<ApiResponse<AuthResponse>>(
            refreshUrl,
            { refreshToken },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 10000,
            }
          );

          // Race condition check: Did user logout while refresh request was in flight?
          if (currentEpoch !== refreshEpoch) {
            return Promise.reject(new Error('Session terminated: In-flight refresh discarded'));
          }

          const currentStoredToken = await tokenStorage.getRefreshToken();
          if (!currentStoredToken) {
            return Promise.reject(new Error('Session terminated: Tokens cleared during refresh'));
          }

          const authData = response.data?.data;
          const newAccessToken = authData?.accessToken;
          const newRefreshToken = authData?.refreshToken;

          if (!newAccessToken) {
            throw new Error('Refresh endpoint did not return an access token');
          }

          // Securely persist rotated tokens
          await tokenStorage.saveTokens(newAccessToken, newRefreshToken);

          // Notify state manager (Zustand)
          if (authData && currentEpoch === refreshEpoch) {
            tokenUpdatedHandler?.(authData);
          }

          // Unblock queued requests with the new token
          processQueue(null, newAccessToken);

          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return client(originalRequest);
        } catch (refreshErr) {
          if (currentEpoch === refreshEpoch) {
            // Refresh failed: terminate session, flush queue, and notify UI
            processQueue(refreshErr, null);
            await tokenStorage.clearTokens();
            authFailureHandler?.();
          }
          return Promise.reject(refreshErr);
        } finally {
          if (currentEpoch === refreshEpoch) {
            isRefreshing = false;
          }
        }
      }

      return Promise.reject(error);
    }
  );
};
