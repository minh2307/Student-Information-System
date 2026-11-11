/**
 * Authentication & Profile API Service
 * Interacts with Backend auth-service endpoints via API Gateway.
 */

import { apiClient, extractData } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RefreshTokenRequest,
  UpdateProfileRequest,
  UserProfileResponse,
} from '@/types';

export const authApi = {
  /**
   * Authenticate user with credentials against backend.
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const payload: LoginRequest = {
      username: credentials.username.trim(),
      password: credentials.password,
    };
    if (credentials.turnstileToken) {
      payload.turnstileToken = credentials.turnstileToken.trim();
    }

    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      ENDPOINTS.AUTH.LOGIN,
      payload
    );
    return extractData(response);
  },

  /**
   * Explicitly refresh tokens via backend rotation endpoint.
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const payload: RefreshTokenRequest = { refreshToken };
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      ENDPOINTS.AUTH.REFRESH,
      payload
    );
    return extractData(response);
  },

  /**
   * Log out session on backend.
   * Tolerates network errors so client session can always be purged.
   */
  async logout(refreshToken?: string | null): Promise<void> {
    try {
      const payload: RefreshTokenRequest | undefined = refreshToken
        ? { refreshToken }
        : undefined;
      await apiClient.post<ApiResponse<void>>(ENDPOINTS.AUTH.LOGOUT, payload);
    } catch {
      // Fire-and-forget server revocation: never block local cleanup
    }
  },

  /**
   * Fetch current authenticated user's profile and academic details.
   */
  async getProfile(): Promise<UserProfileResponse> {
    const response = await apiClient.get<ApiResponse<UserProfileResponse>>(
      ENDPOINTS.PROFILE.ME
    );
    return extractData(response);
  },

  /**
   * Update personal profile information.
   */
  async updateProfile(data: UpdateProfileRequest): Promise<UserProfileResponse> {
    const response = await apiClient.put<ApiResponse<UserProfileResponse>>(
      ENDPOINTS.PROFILE.ME,
      data
    );
    return extractData(response);
  },
};
