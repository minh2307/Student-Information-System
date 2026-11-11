/**
 * Hybrid WebView <-> Native Bridge Types
 * Defines Bridge Envelope v1.0, Token Lifecycle States, and Message Contracts.
 */

export type TokenStatus = 'VALID' | 'EXPIRING' | 'REFRESHING' | 'EXPIRED' | 'REVOKED';

export type BridgeMessageType =
  | 'AUTH_HANDSHAKE_INIT'
  | 'AUTH_HANDSHAKE_ACK'
  | 'AUTH_HANDSHAKE_REJECT'
  | 'AUTH_REFRESH_REQUEST'
  | 'AUTH_REFRESH_SUCCESS'
  | 'AUTH_REFRESH_FAILURE'
  | 'AUTH_SESSION_INVALIDATED'
  | 'NAVIGATE_NATIVE'
  | 'APP_LOGOUT_REQUEST'
  | 'NATIVE_QR_SCANNED'
  | 'BRIDGE_ERROR';

export interface BridgeEnvelope<T = unknown> {
  version: '1.0';
  id: string;              // Unique request ID (UUIDv4)
  type: BridgeMessageType;
  timestamp: number;       // Unix epoch ms
  epoch?: number;          // Session epoch binding
  sessionId?: string;      // Session transaction ID binding
  seq?: number;            // Incrementing sequence counter per session
  payload: T;
}

export interface HandshakeInitPayload {
  clientVersion: string;
  url?: string;
}

export interface HandshakeAckPayload {
  challengeId: string;
  epoch: number;
  sessionId: string;
  expiresIn: number;
  accessToken: string;
  user: {
    id: number;
    username: string;
    fullName: string;
    role: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  studentProfile?: {
    studentCode: string;
    major: string;
    currentSemester?: number;
    creditsEarned?: number;
    totalRequiredCredits?: number;
    currentCgpa?: number;
    previousCgpa?: number;
  } | null;
}

export interface HandshakeRejectPayload {
  reason: string;
  requireLogin: boolean;
}

export interface TokenRefreshRequestPayload {
  reason: string;
  url?: string;
}

export interface TokenRefreshSuccessPayload {
  accessToken: string;
  epoch: number;
  sessionId: string;
  expiresIn: number;
}

export interface TokenRefreshFailurePayload {
  reason: string;
  requireLogin: boolean;
  statusCode?: number;
}

export interface NavigateNativePayload {
  route: string;
  params?: Record<string, unknown>;
}

export interface BridgeErrorPayload {
  code: string;
  message: string;
  requestId?: string;
}
