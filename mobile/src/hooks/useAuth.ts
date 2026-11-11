/**
 * Convenience Hook for Auth State & Role Access Control
 */

import { useAuthStore } from '@/stores/authStore';

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const studentProfile = useAuthStore((state) => state.studentProfile);
  const lecturerProfile = useAuthStore((state) => state.lecturerProfile);
  const role = useAuthStore((state) => state.role);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  return {
    user,
    studentProfile,
    lecturerProfile,
    role,
    isAuthenticated,
    isInitializing,
    isStudent: role === 'STUDENT',
    isLecturer: role === 'LECTURER',
    isAdmin: role === 'ADMIN',
    login,
    logout,
  };
};
