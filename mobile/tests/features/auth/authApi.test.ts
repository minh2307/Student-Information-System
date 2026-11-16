import { authApi } from '@/features/auth/services/authApi';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { AuthResponse, UserProfileResponse } from '@/types';

jest.mock('@/api/client', () => {
  const original = jest.requireActual('@/api/client');
  return {
    ...original,
    apiClient: {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
    },
  };
});

describe('Auth API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAuthResponse: AuthResponse = {
    accessToken: 'mock_jwt_access_token',
    refreshToken: 'mock_jwt_refresh_token',
    tokenType: 'Bearer',
    user: {
      id: 4,
      username: 'sv2024001',
      email: 'sv2024001@rikkei.edu.vn',
      fullName: 'Nguyễn Văn C',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
    studentProfile: {
      studentCode: 'SV2024001',
      major: 'B.Tech - Computer Science',
      currentSemester: 6,
      creditsEarned: 84,
      totalRequiredCredits: 160,
      currentCgpa: 8.74,
      previousCgpa: 8.62,
    },
  };

  it('calls POST /api/v1/auth/login and returns auth data', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        status: 200,
        message: 'Đăng nhập thành công',
        data: mockAuthResponse,
      },
    });

    const result = await authApi.login({
      username: 'sv2024001',
      password: '123456',
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      ENDPOINTS.AUTH.LOGIN,
      expect.objectContaining({
        username: 'sv2024001',
        password: '123456',
      })
    );
    expect(result.accessToken).toBe('mock_jwt_access_token');
    expect(result.user.role).toBe('STUDENT');
  });

  it('calls POST /api/v1/auth/refresh with refreshToken and returns rotated tokens', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        status: 200,
        message: 'Làm mới token thành công',
        data: {
          ...mockAuthResponse,
          accessToken: 'rotated_access_token',
          refreshToken: 'rotated_refresh_token',
        },
      },
    });

    const result = await authApi.refreshToken('current_refresh_token');

    expect(apiClient.post).toHaveBeenCalledWith(
      ENDPOINTS.AUTH.REFRESH,
      { refreshToken: 'current_refresh_token' }
    );
    expect(result.accessToken).toBe('rotated_access_token');
    expect(result.refreshToken).toBe('rotated_refresh_token');
  });

  it('calls POST /api/v1/auth/logout and succeeds even when backend is offline', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network offline'));

    // Should not throw
    await expect(authApi.logout('some_refresh_token')).resolves.toBeUndefined();
    expect(apiClient.post).toHaveBeenCalledWith(
      ENDPOINTS.AUTH.LOGOUT,
      { refreshToken: 'some_refresh_token' }
    );
  });

  it('calls GET /api/v1/profile/me and returns UserProfileResponse', async () => {
    const mockProfile: UserProfileResponse = {
      user: mockAuthResponse.user,
      studentProfile: mockAuthResponse.studentProfile,
      lecturerProfile: null,
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        status: 200,
        message: 'Lấy thông tin hồ sơ thành công',
        data: mockProfile,
      },
    });

    const result = await authApi.getProfile();
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.PROFILE.ME);
    expect(result.user.username).toBe('sv2024001');
    expect(result.studentProfile?.studentCode).toBe('SV2024001');
  });
});
