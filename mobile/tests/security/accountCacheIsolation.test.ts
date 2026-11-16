import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '@/storage/tokenStorage';
import { useAuthStore } from '@/stores/authStore';
import { queryClient } from '@/providers/queryClient';
import { queryKeys } from '@/api/queryKeys';
import { AuthResponse } from '@/types';

describe('Account & Role Cache Isolation Audit (Zero-Leakage Assurance)', () => {
  beforeEach(async () => {
    await useAuthStore.getState().logout();
    queryClient.clear();
  });

  const studentAccountA: AuthResponse = {
    accessToken: 'student_jwt_account_a',
    refreshToken: 'student_refresh_account_a',
    tokenType: 'Bearer',
    user: {
      id: 4,
      username: 'sv2024001',
      email: 'sv2024001@rikkei.edu.vn',
      fullName: 'Sinh Viên Nguyễn Văn A',
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
    lecturerProfile: null,
  };

  const lecturerAccountB: AuthResponse = {
    accessToken: 'lecturer_jwt_account_b',
    refreshToken: 'lecturer_refresh_account_b',
    tokenType: 'Bearer',
    user: {
      id: 2,
      username: 'gv001',
      email: 'gv001@rikkei.edu.vn',
      fullName: 'TS. Nguyễn Văn Giảng',
      role: 'LECTURER',
      status: 'ACTIVE',
    },
    studentProfile: null,
    lecturerProfile: {
      lecturerCode: 'GV001',
      department: 'Khoa Công nghệ Thông tin',
      degree: 'Tiến sĩ',
    },
  };

  it('guarantees complete isolation across full login -> query caching -> logout -> account switch -> cold start lifecycle', async () => {
    // -------------------------------------------------------------
    // 1. Login Account A (STUDENT)
    // -------------------------------------------------------------
    await useAuthStore.getState().login(studentAccountA);

    expect(useAuthStore.getState().role).toBe('STUDENT');
    expect(useAuthStore.getState().user?.username).toBe('sv2024001');

    // 2. Load dashboard data into TanStack Query Cache for Account A
    queryClient.setQueryData(
      queryKeys.student.dashboard('SV2024001'),
      { gpa: 8.74, studentName: 'Sinh Viên Nguyễn Văn A', academicWarnings: [] }
    );
    queryClient.setQueryData(
      queryKeys.auth.me(4),
      { user: studentAccountA.user, studentProfile: studentAccountA.studentProfile }
    );

    // Verify cache holds Student A data
    const cachedDashboardA = queryClient.getQueryData(queryKeys.student.dashboard('SV2024001'));
    expect(cachedDashboardA).toBeDefined();

    // -------------------------------------------------------------
    // 3. Logout Account A
    // -------------------------------------------------------------
    await useAuthStore.getState().logout();

    // 4. Verify memory and persisted storage are completely purged
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().studentProfile).toBeNull();

    // Query cache must be completely empty
    expect(queryClient.getQueryData(queryKeys.student.dashboard('SV2024001'))).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.auth.me(4))).toBeUndefined();

    // SecureStore must be empty
    expect(await tokenStorage.getAccessToken()).toBeNull();
    expect(await tokenStorage.getRefreshToken()).toBeNull();

    // AsyncStorage cached profiles must be deleted
    expect(await AsyncStorage.getItem('rikkei_eduportal_user_profile')).toBeNull();
    expect(await AsyncStorage.getItem('rikkei_eduportal_student_profile')).toBeNull();

    // -------------------------------------------------------------
    // 5. Login Account B (LECTURER)
    // -------------------------------------------------------------
    await useAuthStore.getState().login(lecturerAccountB);

    // 6. Verify Account B has LECTURER role and zero Student A residue
    const stateB = useAuthStore.getState();
    expect(stateB.isAuthenticated).toBe(true);
    expect(stateB.role).toBe('LECTURER');
    expect(stateB.user?.username).toBe('gv001');
    expect(stateB.studentProfile).toBeNull();
    expect(stateB.lecturerProfile?.lecturerCode).toBe('GV001');

    // 7. Populate Lecturer B query cache
    queryClient.setQueryData(
      queryKeys.lecturer.classes('2024-2', 'GV001'),
      [{ classId: 'IT001', className: 'Lập trình Di động' }]
    );

    // Ensure Student A cache key remains completely empty
    expect(queryClient.getQueryData(queryKeys.student.dashboard('SV2024001'))).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.auth.me(4))).toBeUndefined();

    // -------------------------------------------------------------
    // 8. Simulate App Kill & Cold Start Session Restoration
    // -------------------------------------------------------------
    // Create new clean in-memory state
    useAuthStore.setState({
      user: null,
      studentProfile: null,
      lecturerProfile: null,
      role: null,
      isAuthenticated: false,
      isInitializing: true,
    });

    // Run cold start restoration
    await useAuthStore.getState().restoreSession();

    const restoredState = useAuthStore.getState();
    expect(restoredState.isAuthenticated).toBe(true);
    expect(restoredState.isInitializing).toBe(false);
    expect(restoredState.role).toBe('LECTURER');
    expect(restoredState.user?.username).toBe('gv001');
    expect(restoredState.studentProfile).toBeNull();
    expect(restoredState.lecturerProfile?.lecturerCode).toBe('GV001');
  });
});
