/**
 * Centralized API Client
 * Configured with base URL, timeout, error normalization and auth interceptors.
 */

import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { setupAuthInterceptors } from './interceptors/authInterceptor';
import { ApiError, ApiResponse } from '@/types';

export const DEFAULT_API_BASE_URL = 'https://rikkeiportal.io.vn';

export const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return DEFAULT_API_BASE_URL;
};

export const BASE_URL = getApiBaseUrl();

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach mutex-protected auth interceptor
setupAuthInterceptors(apiClient, BASE_URL);

/**
 * Clean up backend messages to never expose internal Java exceptions or stack traces to end users.
 */
const sanitizeMessage = (message: string, status: number): string => {
  if (
    message.includes('Exception') ||
    message.includes('java.') ||
    message.includes('org.springframework.') ||
    message.includes('SQLException') ||
    message.includes('stack trace') ||
    message.includes('nested exception')
  ) {
    return getStatusDefaultMessage(status);
  }
  return message;
};

/**
 * Standard HTTP status default messages in clear Vietnamese.
 */
const getStatusDefaultMessage = (status: number): string => {
  switch (status) {
    case 400:
      return 'Dữ liệu yêu cầu không hợp lệ. Vui lòng kiểm tra lại.';
    case 401:
      return 'Tên đăng nhập hoặc mật khẩu không chính xác, hoặc phiên đăng nhập đã hết hạn.';
    case 403:
      return 'Từ chối truy cập: Bạn không có quyền thực hiện thao tác này.';
    case 404:
      return 'Không tìm thấy dữ liệu yêu cầu trên hệ thống.';
    case 409:
      return 'Dữ liệu đang có sự xung đột. Vui lòng làm mới trang.';
    case 422:
      return 'Dữ liệu không thể xử lý. Vui lòng kiểm tra lại thông tin nhập.';
    case 429:
      return 'Bạn đang gửi quá nhiều yêu cầu. Vui lòng chờ giây lát.';
    case 500:
      return 'Hệ thống đang gặp sự cố tạm thời. Vui lòng thử lại sau.';
    case 502:
      return 'Không thể kết nối đến hệ thống Gateway. Vui lòng thử lại sau.';
    case 503:
      return 'Máy chủ đang bảo trì hoặc tạm thời gián đoạn. Vui lòng quay lại sau ít phút.';
    default:
      return 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
  }
};

/**
 * Standardize API errors for consistent UI error handling.
 */
export const normalizeError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<ApiResponse<any> | { message?: string }>;
    const status = axiosErr.response?.status || 500;
    const responseData = axiosErr.response?.data;

    let message = getStatusDefaultMessage(status);

    if (responseData && typeof responseData === 'object' && 'message' in responseData && responseData.message) {
      message = sanitizeMessage(responseData.message, status);
    } else if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.toLowerCase().includes('timeout')) {
      message = 'Kết nối mạng quá thời gian phản hồi (Timeout). Vui lòng kiểm tra lại đường truyền.';
    } else if (axiosErr.message?.toLowerCase().includes('network error') || !axiosErr.response) {
      message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng (Wifi/4G).';
    }

    return {
      status,
      message,
      code: axiosErr.code,
      details: responseData,
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      message: sanitizeMessage(error.message, 500),
    };
  }

  return {
    status: 500,
    message: 'Lỗi không xác định.',
  };
};

/**
 * Helper to extract response data cleanly while preserving TypeScript types.
 */
export const extractData = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  return response.data.data;
};

export default apiClient;
