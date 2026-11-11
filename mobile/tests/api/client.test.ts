import axios from 'axios';
import { normalizeError, getApiBaseUrl, DEFAULT_API_BASE_URL } from '@/api/client';

describe('API Client Foundation', () => {
  const originalEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = originalEnv;
  });

  it('resolves default production API base URL when env is empty', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    expect(getApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });

  it('normalizes custom base URL by trimming trailing slashes', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://custom-gateway.io.vn///';
    expect(getApiBaseUrl()).toBe('https://custom-gateway.io.vn');
  });

  it('normalizes network errors accurately', () => {
    const error = new axios.AxiosError('Network Error');
    error.code = 'ERR_NETWORK';

    const normalized = normalizeError(error);
    expect(normalized.status).toBe(500);
    expect(normalized.message).toContain('Không thể kết nối đến máy chủ');
  });

  it('normalizes timeout errors accurately', () => {
    const error = new axios.AxiosError('timeout of 15000ms exceeded');
    error.code = 'ECONNABORTED';

    const normalized = normalizeError(error);
    expect(normalized.status).toBe(500);
    expect(normalized.message).toContain('quá thời gian phản hồi');
  });

  it('normalizes structured backend API errors from ApiResponse', () => {
    const error = new axios.AxiosError('Bad Request');
    error.response = {
      status: 400,
      data: {
        status: 400,
        message: 'Lớp học phần đã đầy sĩ số.',
        data: null,
        success: false,
      },
      statusText: 'Bad Request',
      headers: {},
      config: {} as any,
    };

    const normalized = normalizeError(error);
    expect(normalized.status).toBe(400);
    expect(normalized.message).toBe('Lớp học phần đã đầy sĩ số.');
  });
});
