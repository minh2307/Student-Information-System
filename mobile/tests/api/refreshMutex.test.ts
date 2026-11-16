import axios from 'axios';
import {
  setupAuthInterceptors,
  setAuthFailureHandler,
  cancelPendingRefresh,
} from '@/api/interceptors/authInterceptor';
import { tokenStorage } from '@/storage/tokenStorage';

describe('Refresh Token Concurrency Protection (Mutex Queue)', () => {
  const BASE_URL = 'https://rikkeiportal.io.vn';

  beforeEach(async () => {
    await tokenStorage.clearTokens();
    jest.clearAllMocks();
  });

  it('guarantees only 1 refresh call for multiple concurrent 401 requests and replays all with new token', async () => {
    // 1. Initial State: Stale tokens in storage
    await tokenStorage.saveTokens('expired_token_1', 'valid_refresh_token_1');

    const testClient = axios.create({ baseURL: BASE_URL });
    setupAuthInterceptors(testClient, BASE_URL);

    let refreshCallCount = 0;
    const axiosPostSpy = jest.spyOn(axios, 'post').mockImplementation((url) => {
      if ((url as string).includes('/api/v1/auth/refresh')) {
        refreshCallCount++;
        return Promise.resolve({
          data: {
            status: 200,
            message: 'Làm mới token thành công',
            data: {
              accessToken: 'rotated_new_access_token',
              refreshToken: 'rotated_new_refresh_token',
              user: { id: 4, username: 'sv2024001', role: 'STUDENT' },
            },
            success: true,
          },
        }) as any;
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    testClient.defaults.adapter = async (config) => {
      const authHeader = config.headers?.Authorization;

      if (authHeader === 'Bearer expired_token_1') {
        const error = new axios.AxiosError('Unauthorized', '401', config, null, {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
          data: { status: 401, message: 'Token expired' },
        });
        return Promise.reject(error);
      }

      if (authHeader === 'Bearer rotated_new_access_token') {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: { status: 200, message: 'Success', data: { resource: 'data' } },
        };
      }

      return Promise.reject(new Error(`Unexpected header: ${authHeader}`));
    };

    // 2. Fire 5 concurrent requests simultaneously
    const requests = [
      testClient.get('/api/v1/student/dashboard'),
      testClient.get('/api/v1/student/timetable'),
      testClient.get('/api/v1/student/grades'),
      testClient.get('/api/v1/student/exams'),
      testClient.get('/api/v1/student/tuition'),
    ];

    const results = await Promise.all(requests);

    // 3. Verifications
    expect(refreshCallCount).toBe(1);
    expect(results).toHaveLength(5);
    results.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.data.data.resource).toBe('data');
    });

    const latestAccessToken = await tokenStorage.getAccessToken();
    const latestRefreshToken = await tokenStorage.getRefreshToken();
    expect(latestAccessToken).toBe('rotated_new_access_token');
    expect(latestRefreshToken).toBe('rotated_new_refresh_token');

    axiosPostSpy.mockRestore();
  });

  it('handles 10 concurrent 401 requests with exactly 1 refresh operation', async () => {
    await tokenStorage.saveTokens('expired_tok_10', 'valid_refresh_tok_10');

    const testClient = axios.create({ baseURL: BASE_URL });
    setupAuthInterceptors(testClient, BASE_URL);

    let refreshCallCount = 0;
    const axiosPostSpy = jest.spyOn(axios, 'post').mockImplementation((url) => {
      if ((url as string).includes('/api/v1/auth/refresh')) {
        refreshCallCount++;
        return Promise.resolve({
          data: {
            status: 200,
            message: 'Làm mới token thành công',
            data: {
              accessToken: 'new_token_10',
              refreshToken: 'new_refresh_10',
              user: { id: 4, username: 'sv2024001', role: 'STUDENT' },
            },
            success: true,
          },
        }) as any;
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    testClient.defaults.adapter = async (config) => {
      const authHeader = config.headers?.Authorization;
      if (authHeader === 'Bearer expired_tok_10') {
        return Promise.reject(
          new axios.AxiosError('Unauthorized', '401', config, null, {
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
            data: { status: 401, message: 'Token expired' },
          })
        );
      }
      if (authHeader === 'Bearer new_token_10') {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: { status: 200, message: 'Success', data: { ok: true } },
        };
      }
      return Promise.reject(new Error(`Unexpected header: ${authHeader}`));
    };

    const promises = Array.from({ length: 10 }, (_, i) =>
      testClient.get(`/api/v1/student/resource/${i}`)
    );

    const responses = await Promise.all(promises);

    expect(refreshCallCount).toBe(1);
    expect(responses).toHaveLength(10);
    responses.forEach((res) => expect(res.status).toBe(200));

    axiosPostSpy.mockRestore();
  });

  it('handles 20 concurrent 401 requests with exactly 1 refresh operation without race conditions', async () => {
    await tokenStorage.saveTokens('expired_tok_20', 'valid_refresh_tok_20');

    const testClient = axios.create({ baseURL: BASE_URL });
    setupAuthInterceptors(testClient, BASE_URL);

    let refreshCallCount = 0;
    const axiosPostSpy = jest.spyOn(axios, 'post').mockImplementation((url) => {
      if ((url as string).includes('/api/v1/auth/refresh')) {
        refreshCallCount++;
        return Promise.resolve({
          data: {
            status: 200,
            message: 'Làm mới token thành công',
            data: {
              accessToken: 'new_token_20',
              refreshToken: 'new_refresh_20',
              user: { id: 4, username: 'sv2024001', role: 'STUDENT' },
            },
            success: true,
          },
        }) as any;
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    testClient.defaults.adapter = async (config) => {
      const authHeader = config.headers?.Authorization;
      if (authHeader === 'Bearer expired_tok_20') {
        return Promise.reject(
          new axios.AxiosError('Unauthorized', '401', config, null, {
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
            data: { status: 401, message: 'Token expired' },
          })
        );
      }
      if (authHeader === 'Bearer new_token_20') {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: { status: 200, message: 'Success', data: { ok: true } },
        };
      }
      return Promise.reject(new Error(`Unexpected header: ${authHeader}`));
    };

    const promises = Array.from({ length: 20 }, (_, i) =>
      testClient.get(`/api/v1/student/concurrent/${i}`)
    );

    const responses = await Promise.all(promises);

    expect(refreshCallCount).toBe(1);
    expect(responses).toHaveLength(20);
    responses.forEach((res) => expect(res.status).toBe(200));

    axiosPostSpy.mockRestore();
  });

  it('purges tokens and notifies failure handler when refresh token itself fails', async () => {
    await tokenStorage.saveTokens('expired_token_1', 'revoked_refresh_token');

    const testClient = axios.create({ baseURL: BASE_URL });
    setupAuthInterceptors(testClient, BASE_URL);

    const failureHandlerMock = jest.fn();
    setAuthFailureHandler(failureHandlerMock);

    const axiosPostSpy = jest.spyOn(axios, 'post').mockImplementation((url) => {
      if ((url as string).includes('/api/v1/auth/refresh')) {
        const error = new axios.AxiosError('Revoked token', '401', null as any, null, {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config: {} as any,
          data: { status: 401, message: 'Refresh token đã bị thu hồi' },
        });
        return Promise.reject(error);
      }
      return Promise.reject(new Error('Unknown'));
    });

    testClient.defaults.adapter = async (config) => {
      const error = new axios.AxiosError('Unauthorized', '401', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: { status: 401, message: 'Token expired' },
      });
      return Promise.reject(error);
    };

    await expect(testClient.get('/api/v1/student/dashboard')).rejects.toThrow();

    const token = await tokenStorage.getAccessToken();
    expect(token).toBeNull();
    expect(failureHandlerMock).toHaveBeenCalledTimes(1);

    axiosPostSpy.mockRestore();
  });

  it('safely handles two consecutive logout calls without crashing or throwing errors', async () => {
    await tokenStorage.saveTokens('access_tok_double_logout', 'refresh_tok_double_logout');

    cancelPendingRefresh();
    await tokenStorage.clearTokens();

    // Call logout cancellation and cleanup a second time immediately
    cancelPendingRefresh();
    await tokenStorage.clearTokens();

    const storedAccess = await tokenStorage.getAccessToken();
    const storedRefresh = await tokenStorage.getRefreshToken();
    expect(storedAccess).toBeNull();
    expect(storedRefresh).toBeNull();
  });
});
