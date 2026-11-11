import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import {
  setupAuthInterceptors,
  cancelPendingRefresh,
  setAuthFailureHandler,
} from '@/api/interceptors/authInterceptor';
import { tokenStorage } from '@/storage/tokenStorage';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Refresh Mutex & Logout Race Condition Guard', () => {
  let client: AxiosInstance;
  let requestInterceptor: (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig>;
  let responseErrorInterceptor: (error: AxiosError) => Promise<any>;

  beforeEach(async () => {
    jest.clearAllMocks();
    await tokenStorage.clearTokens();

    const requestInterceptors: Array<(config: any) => any> = [];
    const responseErrorInterceptors: Array<(err: any) => any> = [];

    client = {
      interceptors: {
        request: {
          use: jest.fn((onFulfilled) => {
            requestInterceptors.push(onFulfilled);
          }),
        },
        response: {
          use: jest.fn((_, onRejected) => {
            responseErrorInterceptors.push(onRejected);
          }),
        },
      },
    } as unknown as AxiosInstance;

    setupAuthInterceptors(client, 'https://rikkeiportal.io.vn');

    requestInterceptor = requestInterceptors[0];
    responseErrorInterceptor = responseErrorInterceptors[0];
  });

  it('discards in-flight refresh tokens and refuses to persist if user logged out before completion', async () => {
    await tokenStorage.saveTokens('initial_access_token', 'initial_refresh_token');

    let resolveRefreshCall: (val: any) => void = () => {};
    const refreshPromise = new Promise((resolve) => {
      resolveRefreshCall = resolve;
    });

    mockedAxios.post.mockReturnValue(refreshPromise as any);

    // Simulate 401 error triggering refresh
    const mock401Error = {
      config: {
        url: '/api/v1/student/timetable',
        headers: {},
      },
      response: { status: 401 },
    } as AxiosError;

    // Trigger refresh in flight
    const inFlightPromise = responseErrorInterceptor(mock401Error);

    // User taps "Logout" while refresh is in flight
    cancelPendingRefresh();
    await tokenStorage.clearTokens();

    // Now server returns successful 200 with new rotated tokens
    resolveRefreshCall({
      data: {
        status: 200,
        data: {
          accessToken: 'fresh_rotated_access_token',
          refreshToken: 'fresh_rotated_refresh_token',
        },
      },
    });

    // The in-flight refresh promise should be rejected and NOT resurrect the session
    await expect(inFlightPromise).rejects.toThrow();

    // Verify SecureStore tokens remain NULL (never resurrected)
    const storedAccess = await tokenStorage.getAccessToken();
    const storedRefresh = await tokenStorage.getRefreshToken();
    expect(storedAccess).toBeNull();
    expect(storedRefresh).toBeNull();
  });

  it('triggers auth failure handler and clears tokens when refresh call fails with 401', async () => {
    await tokenStorage.saveTokens('initial_access_token', 'initial_refresh_token');

    const authFailureSpy = jest.fn();
    setAuthFailureHandler(authFailureSpy);

    mockedAxios.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          message: 'Refresh token đã hết hạn. Vui lòng đăng nhập lại!',
        },
      },
    });

    const mock401Error = {
      config: {
        url: '/api/v1/student/grades',
        headers: {},
      },
      response: { status: 401 },
    } as AxiosError;

    await expect(responseErrorInterceptor(mock401Error)).rejects.toBeDefined();

    // Verify auth failure was triggered
    expect(authFailureSpy).toHaveBeenCalled();

    // Verify tokens were purged from SecureStore
    const storedAccess = await tokenStorage.getAccessToken();
    expect(storedAccess).toBeNull();
  });
});
