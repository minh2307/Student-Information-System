import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import { useLogin, UseLoginResult } from '@/features/auth/hooks/useLogin';
import { authApi } from '@/features/auth/services/authApi';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'expo-router';
import { AuthResponse } from '@/types';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/features/auth/services/authApi', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

function getLoginHook(): UseLoginResult {
  let hookInstance: UseLoginResult = null as any;

  function TestHarness() {
    hookInstance = useLogin();
    return null;
  }

  renderToStaticMarkup(<TestHarness />);
  return hookInstance;
}

describe('Login Flow & Role-Based Navigation Routing', () => {
  const mockReplace = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
    });
    await useAuthStore.getState().logout();
  });

  const baseUser = {
    id: 1,
    email: 'user@rikkei.edu.vn',
    fullName: 'Test User',
    status: 'ACTIVE' as const,
  };

  it('routes STUDENT role to /(student)/dashboard upon successful login', async () => {
    const studentAuth: AuthResponse = {
      accessToken: 'student_jwt_access',
      refreshToken: 'student_jwt_refresh',
      tokenType: 'Bearer',
      user: {
        ...baseUser,
        id: 4,
        username: 'sv2024001',
        role: 'STUDENT',
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

    (authApi.login as jest.Mock).mockResolvedValueOnce(studentAuth);

    const hook = getLoginHook();
    const success = await hook.handleSubmitLogin({
      username: 'sv2024001',
      password: 'password123',
    });

    expect(success).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith('/(student)/dashboard');
    expect(useAuthStore.getState().role).toBe('STUDENT');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('routes LECTURER role to /(lecturer)/dashboard upon successful login', async () => {
    const lecturerAuth: AuthResponse = {
      accessToken: 'lecturer_jwt_access',
      refreshToken: 'lecturer_jwt_refresh',
      tokenType: 'Bearer',
      user: {
        ...baseUser,
        id: 2,
        username: 'gv001',
        role: 'LECTURER',
      },
      lecturerProfile: {
        lecturerCode: 'GV001',
        department: 'Khoa Công nghệ Thông tin',
        degree: 'Tiến sĩ',
      },
    };

    (authApi.login as jest.Mock).mockResolvedValueOnce(lecturerAuth);

    const hook = getLoginHook();
    const success = await hook.handleSubmitLogin({
      username: 'gv001',
      password: 'password123',
    });

    expect(success).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith('/(lecturer)/dashboard');
    expect(useAuthStore.getState().role).toBe('LECTURER');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('routes ADMIN role to /unauthorized (Admin Guidance) upon login', async () => {
    const adminAuth: AuthResponse = {
      accessToken: 'admin_jwt_access',
      refreshToken: 'admin_jwt_refresh',
      tokenType: 'Bearer',
      user: {
        ...baseUser,
        id: 1,
        username: 'admin',
        role: 'ADMIN',
      },
    };

    (authApi.login as jest.Mock).mockResolvedValueOnce(adminAuth);

    const hook = getLoginHook();
    const success = await hook.handleSubmitLogin({
      username: 'admin',
      password: 'password123',
    });

    expect(success).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith('/unauthorized');
    expect(useAuthStore.getState().role).toBe('ADMIN');
  });

  it('routes UNKNOWN role safely to /unauthorized without granting dashboard access', async () => {
    const unknownAuth = {
      accessToken: 'unknown_jwt_access',
      refreshToken: 'unknown_jwt_refresh',
      tokenType: 'Bearer',
      user: {
        ...baseUser,
        id: 99,
        username: 'guest_user',
        role: 'SUPER_GUEST' as any,
      },
    };

    (authApi.login as jest.Mock).mockResolvedValueOnce(unknownAuth);

    const hook = getLoginHook();
    const success = await hook.handleSubmitLogin({
      username: 'guest_user',
      password: 'password123',
    });

    expect(success).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith('/unauthorized');
  });

  it('displays user-friendly error message on incorrect password without navigation', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 401,
        data: {
          status: 401,
          message: 'Tên đăng nhập hoặc mật khẩu không chính xác',
        },
      },
    };

    (authApi.login as jest.Mock).mockRejectedValueOnce(axiosError);

    const hook = getLoginHook();
    const success = await hook.handleSubmitLogin({
      username: 'sv2024001',
      password: 'wrong_password',
    });

    expect(success).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('prevents double submission when a login request is already in-flight', async () => {
    let resolveLogin: (val: any) => void = () => {};
    const pendingPromise = new Promise((res) => {
      resolveLogin = res;
    });

    (authApi.login as jest.Mock).mockReturnValue(pendingPromise);

    const hook = getLoginHook();

    // Trigger first submission
    const call1 = hook.handleSubmitLogin({
      username: 'sv2024001',
      password: 'password123',
    });

    // Trigger second submission while first is still pending
    const call2Result = await hook.handleSubmitLogin({
      username: 'sv2024001',
      password: 'password123',
    });

    // Second call must be rejected immediately without calling authApi again
    expect(call2Result).toBe(false);
    expect(authApi.login).toHaveBeenCalledTimes(1);

    // Resolve first submission
    resolveLogin({
      accessToken: 'tok',
      user: { ...baseUser, role: 'STUDENT' },
    });
    await call1;
  });
});
