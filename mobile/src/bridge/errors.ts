/**
 * Typed Client Errors for Token Broker, Secure Storage & Authentication Lifecycle
 * Phase 7.1.1.2: Persistent Session Integrity & Auth Error Hardening
 */

export abstract class BridgeAuthError extends Error {
  public abstract readonly code: string;
  public readonly isAuthFailure: boolean;

  constructor(message: string, isAuthFailure = true) {
    super(message);
    this.name = this.constructor.name;
    this.isAuthFailure = isAuthFailure;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when TokenBroker is locked or logout occurred while refresh was in-flight.
 */
export class SessionTerminatedError extends BridgeAuthError {
  public readonly code = 'SESSION_TERMINATED';

  constructor(message = 'Session terminated: TokenBroker is locked or epoch mismatch') {
    super(message, true);
  }
}

/**
 * Thrown when SecureStore or disk persistence operation fails, or rollback fails.
 */
export class StoragePersistenceError extends BridgeAuthError {
  public readonly code = 'STORAGE_PERSISTENCE_FAILED';
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message, true);
    this.cause = cause;
  }
}

/**
 * Thrown when attempting to refresh but no refresh token exists in SecureStore.
 */
export class MissingRefreshTokenError extends BridgeAuthError {
  public readonly code = 'MISSING_REFRESH_TOKEN';

  constructor(message = 'No refresh token available in SecureStore') {
    super(message, true);
  }
}

/**
 * Thrown when backend explicitly rejects refresh token with HTTP 401 Unauthorized or revocation.
 */
export class RefreshUnauthorizedError extends BridgeAuthError {
  public readonly code = 'REFRESH_UNAUTHORIZED';
  public readonly status: number;

  constructor(message = 'Refresh token rejected or revoked by server', status = 401) {
    super(message, true);
    this.status = status;
  }
}

/**
 * Thrown when network timeout, HTTP 502/503/504, or transport failure occurs during refresh.
 * Subject to Zero Auto-Retry policy: the token rotation state on backend is ambiguous.
 */
export class RefreshAmbiguousError extends BridgeAuthError {
  public readonly code = 'REFRESH_AMBIGUOUS';
  public readonly status?: number;
  public readonly cause?: unknown;

  constructor(message = 'Ambiguous refresh response: Network failure or 5xx server error', status?: number, cause?: unknown) {
    super(message, false); // Not an auth failure -> do not immediately revoke session or wipe SecureStore
    this.status = status;
    this.cause = cause;
  }
}
