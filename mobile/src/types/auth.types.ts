/**
 * Authentication & Identity Contracts
 * Matches auth-service DTOs verified against production backend.
 */

export type Role = 'STUDENT' | 'LECTURER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'LOCKED';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl?: string | null;
  status: UserStatus;
  createdAt?: string;
}

export interface StudentProfile {
  studentCode: string;
  major: string;
  currentSemester: number;
  creditsEarned: number;
  totalRequiredCredits: number;
  currentCgpa: number;
  previousCgpa: number;
}

export interface LecturerProfile {
  lecturerCode: string;
  department: string;
  degree?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  user: User;
  studentProfile?: StudentProfile | null;
  lecturerProfile?: LecturerProfile | null;
}

export interface LoginRequest {
  username: string;
  password: string;
  turnstileToken?: string | null;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UserProfileResponse {
  user: User;
  studentProfile?: StudentProfile | null;
  lecturerProfile?: LecturerProfile | null;
}

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  avatarUrl?: string | null;
  oldPassword?: string;
  newPassword?: string;
}
