/**
 * Hybrid WebView <-> Native Bridge Types
 * Defines Bridge Envelope v1.0, Token Lifecycle States, and Message Contracts.
 */

export type TokenStatus = 'VALID' | 'EXPIRING' | 'REFRESHING' | 'EXPIRED' | 'REVOKED';

export type BridgeMessageType =
  | 'AUTH_HANDSHAKE_INIT'
  | 'AUTH_HANDSHAKE_ACK'
  | 'AUTH_REFRESH_REQUEST'
  | 'AUTH_REFRESH_SUCCESS'
  | 'AUTH_REFRESH_FAILURE'
  | 'NAVIGATE_NATIVE'
  | 'APP_LOGOUT_REQUEST'
  | 'NATIVE_QR_SCANNED';

export interface BridgeEnvelope<T = unknown> {
  version: '1.0';
  id: string;              // UUIDv4
  type: BridgeMessageType;
  timestamp: number;       // Unix epoch ms
  payload: T;
}

export interface HandshakeAckPayload {
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
    academicYear?: string;
    className?: string;
  } | null;
}

export interface TokenRefreshSuccessPayload {
  accessToken: string;
}

export interface TokenRefreshFailurePayload {
  reason: string;
  requireLogin: boolean;
}
