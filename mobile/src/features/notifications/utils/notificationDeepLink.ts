/**
 * Notification Deep Link Resolver & RBAC Route Guard
 * Enforces role-based isolation on deep link navigation from in-app notifications.
 */

import { Role } from '@/types';

export interface RouteResolutionResult {
  /**
   * Safe, sanitized path to navigate to.
   */
  targetRoute: string;

  /**
   * Whether navigation was allowed directly or redirected due to RBAC/Auth.
   */
  isAllowed: boolean;

  /**
   * Reason for redirection, if any.
   */
  reason?: 'UNAUTHENTICATED' | 'ROLE_MISMATCH' | 'INVALID_PATH';
}

const STUDENT_ALLOWED_PREFIXES = ['/(student)', '/student'];
const LECTURER_ALLOWED_PREFIXES = ['/(lecturer)', '/lecturer'];

/**
 * Resolves a notification linkUrl into a safe Expo Router navigation path.
 * Guarantees that:
 * 1. Unauthenticated users are directed to login.
 * 2. Students cannot navigate to lecturer screens.
 * 3. Lecturers cannot navigate to student screens.
 */
export function resolveNotificationRoute(
  linkUrl: string | null | undefined,
  userRole: Role | null | undefined,
  isAuthenticated: boolean
): RouteResolutionResult {
  // 1. Unauthenticated guard
  if (!isAuthenticated || !userRole) {
    return {
      targetRoute: '/(auth)/login',
      isAllowed: false,
      reason: 'UNAUTHENTICATED',
    };
  }

  // 2. Default fallback routes when linkUrl is empty or missing
  const defaultDashboard =
    userRole === 'STUDENT'
      ? '/(student)/dashboard'
      : userRole === 'LECTURER'
      ? '/(lecturer)/dashboard'
      : '/unauthorized';

  if (!linkUrl || typeof linkUrl !== 'string' || linkUrl.trim() === '') {
    return {
      targetRoute: defaultDashboard,
      isAllowed: true,
    };
  }

  const cleanPath = linkUrl.trim();

  // 3. Student RBAC Validation
  if (userRole === 'STUDENT') {
    const isStudentPath = STUDENT_ALLOWED_PREFIXES.some((p) => cleanPath.startsWith(p));
    if (isStudentPath) {
      return {
        targetRoute: cleanPath,
        isAllowed: true,
      };
    }

    // Role mismatch: Student clicked a lecturer link
    return {
      targetRoute: '/(student)/dashboard',
      isAllowed: false,
      reason: 'ROLE_MISMATCH',
    };
  }

  // 4. Lecturer RBAC Validation
  if (userRole === 'LECTURER') {
    const isLecturerPath = LECTURER_ALLOWED_PREFIXES.some((p) => cleanPath.startsWith(p));
    if (isLecturerPath) {
      return {
        targetRoute: cleanPath,
        isAllowed: true,
      };
    }

    // Role mismatch: Lecturer clicked a student link
    return {
      targetRoute: '/(lecturer)/dashboard',
      isAllowed: false,
      reason: 'ROLE_MISMATCH',
    };
  }

  // 5. Admin or Unknown role
  return {
    targetRoute: '/unauthorized',
    isAllowed: false,
    reason: 'ROLE_MISMATCH',
  };
}
