/**
 * Safe JWT Payload Inspection Utilities
 * Used for role inspection and token expiration checks on client.
 */

export interface DecodedJwtPayload {
  sub?: string;
  role?: string;
  roles?: string[];
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export const decodeJwtPayload = (token: string): DecodedJwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  if (
    !payload ||
    typeof payload.exp !== 'number' ||
    !Number.isFinite(payload.exp) ||
    payload.exp <= 0
  ) {
    return true;
  }
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp <= currentTime;
};

export const getTokenRemainingSeconds = (token: string): number => {
  const payload = decodeJwtPayload(token);
  if (
    !payload ||
    typeof payload.exp !== 'number' ||
    !Number.isFinite(payload.exp) ||
    payload.exp <= 0
  ) {
    return 0;
  }
  const currentTime = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - currentTime);
};

