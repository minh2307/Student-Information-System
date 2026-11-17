/**
 * Authentication & Profile API Service
 * Interacts with Backend auth-service endpoints via API Gateway.
 */

import { apiClient, extractData } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { solveChallenge } from './challengeSolver';
import {
  ApiResponse,
  AuthResponse,
  ChallengeResponse,
  LoginRequest,
  RefreshTokenRequest,
  UpdateProfileRequest,
  UserProfileResponse,
} from '@/types';

export const authApi = {
  /**
   * Fetch dynamic Proof-of-Work challenge for Native Mobile anti-bot verification.
   */
  async getChallenge(): Promise<ChallengeResponse> {
    const response = await apiClient.get<ApiResponse<ChallengeResponse>>(
      ENDPOINTS.AUTH.CHALLENGE
    );
    return extractData(response);
  },

  /**
   * Authenticate user with credentials against backend.
   * Automatically fulfills Native Mobile cryptographic challenge if Turnstile is omitted.
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const payload: LoginRequest = {
      username: credentials.username.trim(),
      password: credentials.password,
      clientType: credentials.clientType || 'MOBILE_NATIVE',
    };

    if (credentials.turnstileToken) {
      payload.turnstileToken = credentials.turnstileToken.trim();
    } else if (credentials.challengeToken && credentials.challengeSolution) {
      payload.challengeToken = credentials.challengeToken.trim();
      payload.challengeSolution = credentials.challengeSolution.trim();
    } else {
      // Native Mobile auto-solve challenge flow
      try {
        const challenge = await this.getChallenge();
        if (challenge?.challengeToken && challenge?.nonce) {
          const solution = solveChallenge(challenge.nonce, challenge.difficulty ?? 3);
          payload.challengeToken = challenge.challengeToken;
          payload.challengeSolution = solution;
        }
      } catch {
        // Fallback gracefully for local mock / dev environments where challenge endpoint might be optional
      }
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
   */
  async logout(refreshToken?: string | null): Promise<void> {
    try {
      const payload: RefreshTokenRequest | undefined = refreshToken
        ? { refreshToken }
        : undefined;
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT, payload);
    } catch {
      // Best-effort logout: ignore network offline errors
    }
  },

  /**
   * Fetch authenticated user's profile and academic standing.
   */
  async getProfile(): Promise<UserProfileResponse> {
    const response = await apiClient.get<ApiResponse<UserProfileResponse>>(
      ENDPOINTS.PROFILE.ME
    );
    return extractData(response);
  },

  /**
   * Update authenticated user's profile information or password.
   */
  async updateProfile(data: UpdateProfileRequest): Promise<UserProfileResponse> {
    const response = await apiClient.put<ApiResponse<UserProfileResponse>>(
      ENDPOINTS.PROFILE.ME,
      data
    );
    return extractData(response);
  },
};
