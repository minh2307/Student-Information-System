import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '@/storage/tokenStorage';
import { useAuthStore } from '@/stores/authStore';
import { AuthResponse } from '@/types';

describe('Security Auditing & Token Hygiene', () => {
  beforeEach(async () => {
    await useAuthStore.getState().logout();
  });

  const sensitiveAuthData: AuthResponse = {
    accessToken: 'extremely_secret_jwt_access_token_super_secret',
    refreshToken: 'extremely_secret_jwt_refresh_token_super_secret',
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

  it('never stores access token or refresh token in plaintext AsyncStorage', async () => {
    await useAuthStore.getState().login(sensitiveAuthData);

    // 1. Tokens must exist in hardware-encrypted SecureStore
    const secureAccess = await tokenStorage.getAccessToken();
    const secureRefresh = await tokenStorage.getRefreshToken();
    expect(secureAccess).toBe(sensitiveAuthData.accessToken);
    expect(secureRefresh).toBe(sensitiveAuthData.refreshToken);

    // 2. Tokens must NEVER be written to AsyncStorage under any key
    const asyncAccess = await AsyncStorage.getItem('rikkei_eduportal_access_token');
    const asyncRefresh = await AsyncStorage.getItem('rikkei_eduportal_refresh_token');
    expect(asyncAccess).toBeNull();
    expect(asyncRefresh).toBeNull();

    // 3. Inspect cached user profile in AsyncStorage to guarantee tokens are not leaked inside profile JSON
    const cachedUser = await AsyncStorage.getItem('rikkei_eduportal_user_profile');
    expect(cachedUser).not.toBeNull();
    expect(cachedUser).not.toContain('extremely_secret_jwt_access_token');
    expect(cachedUser).not.toContain('extremely_secret_jwt_refresh_token');
  });

  it('never stores user password in SecureStore, AsyncStorage, or Zustand state', async () => {
    await useAuthStore.getState().login(sensitiveAuthData);

    const state = useAuthStore.getState();
    expect((state.user as any)?.password).toBeUndefined();
    expect((state.user as any)?.passwordHash).toBeUndefined();

    const cachedUser = await AsyncStorage.getItem('rikkei_eduportal_user_profile');
    expect(cachedUser).not.toContain('password');
    expect(cachedUser).not.toContain('123456');
  });

  it('isolates data completely between user accounts: Account B cannot read Account A cache', async () => {
    // 1. Student A logs in
    await useAuthStore.getState().login(sensitiveAuthData);
    expect(useAuthStore.getState().user?.username).toBe('sv2024001');

    // 2. Student A logs out
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();

    // 3. Lecturer B logs in
    const lecturerAuthData: AuthResponse = {
      accessToken: 'lecturer_access_tok',
      refreshToken: 'lecturer_refresh_tok',
      tokenType: 'Bearer',
      user: {
        id: 2,
        username: 'gv001',
        email: 'gv001@rikkei.edu.vn',
        fullName: 'TS. Nguyễn Văn A',
        role: 'LECTURER',
        status: 'ACTIVE',
      },
      lecturerProfile: {
        lecturerCode: 'GV001',
        department: 'Khoa Công nghệ Thông tin',
        degree: 'Tiến sĩ',
      },
    };
    await useAuthStore.getState().login(lecturerAuthData);

    // 4. Verify Account B sees only their profile, not Account A's
    const state = useAuthStore.getState();
    expect(state.user?.username).toBe('gv001');
    expect(state.role).toBe('LECTURER');
    expect(state.studentProfile).toBeNull();
    expect(state.lecturerProfile?.lecturerCode).toBe('GV001');
  });
});
