/**
 * Native Token Broker Unit Tests
 * Verifies single-flight mutex, token status inspection, fast-path caching, and race condition protection.
 */

import { TokenBroker } from '@/bridge/tokenBroker';
import { tokenStorage } from '@/storage/tokenStorage';
import { AuthResponse } from '@/types';
import {
  RefreshUnauthorizedError,
  RefreshAmbiguousError,
  MissingRefreshTokenError,
  SessionTerminatedError,
  StoragePersistenceError,
} from '@/bridge/errors';

// Mock tokenStorage
jest.mock('@/storage/tokenStorage', () => {
  let inMemoryTokens: { accessToken: string | null; refreshToken: string | null } = {
    accessToken: null,
    refreshToken: null,
  };
  return {
    tokenStorage: {
      getAccessToken: jest.fn(async () => inMemoryTokens.accessToken),
      getRefreshToken: jest.fn(async () => inMemoryTokens.refreshToken),
      saveTokens: jest.fn(async (access: string, refresh?: string | null, _txId?: string | null, _epoch?: number) => {
        inMemoryTokens.accessToken = access;
        if (refresh) inMemoryTokens.refreshToken = refresh;
      }),
      clearTokens: jest.fn(async () => {
        inMemoryTokens.accessToken = null;
        inMemoryTokens.refreshToken = null;
      }),
      __setMockTokens: (access: string | null, refresh: string | null) => {
        inMemoryTokens = { accessToken: access, refreshToken: refresh };
      },
    },
  };
});

describe('Native Token Broker (TASK 7.1.1)', () => {
  // Helpers to construct mock JWTs with specific expiration timestamps
  const makeTokenWithExp = (expSeconds: number): string => {
    const payload = { sub: 'test_user', role: 'STUDENT', exp: expSeconds };
    const jsonStr = JSON.stringify(payload);
    // Standard base64 encoding without relying on Node Buffer type
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let encodedPayload = '';
    for (let i = 0; i < jsonStr.length; i += 3) {
      const a = jsonStr.charCodeAt(i);
      const b = i + 1 < jsonStr.length ? jsonStr.charCodeAt(i + 1) : 0;
      const c = i + 2 < jsonStr.length ? jsonStr.charCodeAt(i + 2) : 0;
      encodedPayload += base64Chars[(a >> 2) & 63];
      encodedPayload += base64Chars[((a & 3) << 4) | ((b >> 4) & 15)];
      encodedPayload += i + 1 < jsonStr.length ? base64Chars[((b & 15) << 2) | ((c >> 6) & 3)] : '=';
      encodedPayload += i + 2 < jsonStr.length ? base64Chars[c & 63] : '=';
    }
    return `header.${encodedPayload}.signature`;
  };

  const nowSec = () => Math.floor(Date.now() / 1000);

  beforeEach(() => {
    jest.clearAllMocks();
    (tokenStorage as any).__setMockTokens(null, null);
  });

  describe('1. Token Status Inspection (getTokenStatus)', () => {
    it('returns EXPIRED when token is null or missing', () => {
      const broker = new TokenBroker();
      expect(broker.getTokenStatus(null)).toBe('EXPIRED');
    });

    it('returns EXPIRED when token exp timestamp is in the past', () => {
      const broker = new TokenBroker();
      const pastToken = makeTokenWithExp(nowSec() - 100);
      expect(broker.getTokenStatus(pastToken)).toBe('EXPIRED');
    });

    it('returns EXPIRING when token has less than bufferSeconds (60s) remaining', () => {
      const broker = new TokenBroker({ expiringBufferSeconds: 60 });
      const expiringToken = makeTokenWithExp(nowSec() + 30); // 30s remaining <= 60s
      expect(broker.getTokenStatus(expiringToken)).toBe('EXPIRING');
    });

    it('returns VALID when token has sufficient TTL (> 60s)', () => {
      const broker = new TokenBroker({ expiringBufferSeconds: 60 });
      const validToken = makeTokenWithExp(nowSec() + 300); // 5 minutes remaining
      expect(broker.getTokenStatus(validToken)).toBe('VALID');
    });

    it('returns REVOKED when broker is locked (logout)', () => {
      const broker = new TokenBroker();
      broker.lockBroker();
      expect(broker.getTokenStatus(makeTokenWithExp(nowSec() + 300))).toBe('REVOKED');
    });
  });

  describe('2. Fast-Path Caching (No Backend Refresh if Valid)', () => {
    it('returns current access token immediately without calling refreshFn if token is VALID', async () => {
      const mockRefreshFn = jest.fn();
      const broker = new TokenBroker({ refreshFn: mockRefreshFn });

      const healthyToken = makeTokenWithExp(nowSec() + 600); // 10 mins remaining
      (tokenStorage as any).__setMockTokens(healthyToken, 'mock-refresh-token');

      const token = await broker.getAccessToken();

      expect(token).toBe(healthyToken);
      expect(mockRefreshFn).not.toHaveBeenCalled();
    });
  });

  describe('3. Single-Flight Mutex Concurrency Protection', () => {
    it('calls refreshFn exactly ONCE for multiple concurrent requests when token is expired', async () => {
      let callCount = 0;
      const mockRefreshFn = jest.fn(async () => {
        callCount++;
        // Simulate network latency of 50ms
        await new Promise((res) => setTimeout(res, 50));
        return {
          accessToken: makeTokenWithExp(nowSec() + 900),
          refreshToken: `new-refresh-token-${callCount}`,
        } as AuthResponse;
      });

      const broker = new TokenBroker({ refreshFn: mockRefreshFn });
      (tokenStorage as any).__setMockTokens(null, 'initial-refresh-token');

      // Dispatch 10 concurrent requests at the exact same time
      const results = await Promise.all([
        broker.getAccessToken(),
        broker.getAccessToken(),
        broker.getAccessToken(),
        broker.getAccessToken(),
        broker.getAccessToken(),
        broker.getAccessToken(),
        broker.getAccessToken(),
        broker.getAccessToken(),
        broker.getAccessToken(),
        broker.getAccessToken(),
      ]);

      expect(mockRefreshFn).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(10);
      results.forEach((token) => {
        expect(token).toBe(results[0]);
      });
      expect(tokenStorage.saveTokens).toHaveBeenCalledTimes(1);
    });

    it('forceRefreshToken shares the in-flight mutex with standard getAccessToken calls', async () => {
      const mockRefreshFn = jest.fn(async () => {
        await new Promise((res) => setTimeout(res, 30));
        return {
          accessToken: 'fresh-forced-token',
          refreshToken: 'fresh-refresh-token',
        } as AuthResponse;
      });

      const broker = new TokenBroker({ refreshFn: mockRefreshFn });
      (tokenStorage as any).__setMockTokens('stale-token', 'valid-refresh-token');

      const [res1, res2] = await Promise.all([
        broker.forceRefreshToken(),
        broker.getAccessToken(),
      ]);

      expect(mockRefreshFn).toHaveBeenCalledTimes(1);
      expect(res1).toBe('fresh-forced-token');
      expect(res2).toBe('fresh-forced-token');
    });
  });

  describe('4. Logout & Race Condition Protection (FIND-01 Verification)', () => {
    it('discards rotated tokens if lockBroker() is called while refresh is in-flight', async () => {
      let resolveRefresh: (data: AuthResponse) => void = () => {};

      const mockRefreshFn = jest.fn(
        () =>
          new Promise<AuthResponse>((resolve) => {
            resolveRefresh = resolve;
          })
      );

      const broker = new TokenBroker({ refreshFn: mockRefreshFn });
      (tokenStorage as any).__setMockTokens(null, 'old-refresh-token');

      const refreshPromise = broker.getAccessToken();

      // Give microtasks a tick so tokenStorage.getRefreshToken resolves and mockRefreshFn is invoked
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 10);
      });

      // User logs out while refresh is still waiting on network
      broker.lockBroker();

      // Network responds afterwards with rotated token pair
      resolveRefresh({
        accessToken: 'stale-late-token',
        refreshToken: 'stale-late-refresh-token',
      } as AuthResponse);

      await expect(refreshPromise).rejects.toThrow('Session terminated');
      // CRITICAL: Rotated token was NEVER persisted into SecureStore
      expect(tokenStorage.saveTokens).not.toHaveBeenCalled();
    });

    it('handles refresh completion strictly before logout begins', async () => {
      const mockRefreshFn = jest.fn(async () => ({
        accessToken: makeTokenWithExp(nowSec() + 900),
        refreshToken: 'fresh-persisted-token',
      } as AuthResponse));

      const broker = new TokenBroker({ refreshFn: mockRefreshFn });
      (tokenStorage as any).__setMockTokens(null, 'old-refresh-token');

      const token = await broker.getAccessToken();
      expect(token).toBeDefined();
      expect(tokenStorage.saveTokens).toHaveBeenCalledWith(
        token,
        'fresh-persisted-token',
        expect.any(String),
        expect.any(Number)
      );

      // Logout happens afterwards
      broker.lockBroker();
      expect(broker.getIsLocked()).toBe(true);
    });

    it('rejects subsequent getAccessToken requests when broker is locked', async () => {
      const broker = new TokenBroker();
      broker.lockBroker();

      await expect(broker.getAccessToken()).rejects.toThrow('TokenBroker is locked');
    });
  });

  describe('5. Storage Consistency & Fail-Closed Guard (FIND-02 Verification)', () => {
    it('locks broker and rejects all waiting requests if SecureStore saving fails', async () => {
      const failureHandler = jest.fn();
      const mockRefreshFn = jest.fn(async () => ({
        accessToken: makeTokenWithExp(nowSec() + 900),
        refreshToken: 'new-rotated-token',
      } as AuthResponse));

      // Mock saveTokens to simulate partial write / storage failure
      (tokenStorage.saveTokens as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to safely persist tokens in SecureStore')
      );

      const broker = new TokenBroker({ refreshFn: mockRefreshFn });
      broker.onAuthFailure(failureHandler);
      (tokenStorage as any).__setMockTokens(null, 'valid-refresh-token');

      // 3 concurrent requests awaiting refresh
      const promises = [
        broker.getAccessToken(),
        broker.getAccessToken(),
        broker.getAccessToken(),
      ];

      for (const p of promises) {
        await expect(p).rejects.toThrow('Failed to safely persist tokens in SecureStore');
      }

      // Broker is locked to prevent running with mismatched or unsaved tokens
      expect(broker.getIsLocked()).toBe(true);
      expect(failureHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. Error & Revocation Handling (FIND-04 Verification)', () => {
    it('locks broker and notifies auth failure on 401 Unauthorized from refresh endpoint', async () => {
      const failureHandler = jest.fn();
      const mockRefreshFn = jest.fn(async () => {
        const error: any = new Error('Unauthorized');
        error.response = { status: 401 };
        throw error;
      });

      const broker = new TokenBroker({ refreshFn: mockRefreshFn });
      broker.onAuthFailure(failureHandler);
      (tokenStorage as any).__setMockTokens(null, 'revoked-token');

      await expect(broker.getAccessToken()).rejects.toThrow('Unauthorized');
      expect(failureHandler).toHaveBeenCalledTimes(1);
      expect(broker.getIsLocked()).toBe(true);
    });

    it('locks broker when error message explicitly indicates token revoked', async () => {
      const failureHandler = jest.fn();
      const mockRefreshFn = jest.fn(async () => {
        throw new Error('Refresh token đã bị thu hồi trước đó');
      });

      const broker = new TokenBroker({ refreshFn: mockRefreshFn });
      broker.onAuthFailure(failureHandler);
      (tokenStorage as any).__setMockTokens(null, 'revoked-token');

      await expect(broker.getAccessToken()).rejects.toThrow('thu hồi');
      expect(failureHandler).toHaveBeenCalledTimes(1);
      expect(broker.getIsLocked()).toBe(true);
    });

    it('does NOT lock broker on 403 Forbidden (e.g. from Gateway/WAF) and increments failures', async () => {
      const failureHandler = jest.fn();
      const mockRefreshFn = jest.fn(async () => {
        const error: any = new Error('Forbidden by Cloudflare WAF');
        error.response = { status: 403 };
        throw error;
      });

      const broker = new TokenBroker({ refreshFn: mockRefreshFn });
      broker.onAuthFailure(failureHandler);
      (tokenStorage as any).__setMockTokens(null, 'valid-token');

      await expect(broker.getAccessToken()).rejects.toThrow('Forbidden');
      expect(failureHandler).not.toHaveBeenCalled();
      expect(broker.getIsLocked()).toBe(false);
      expect(broker.getConsecutiveFailures()).toBe(1);
    });

    it('does NOT lock broker on 500/502/503 server errors and increments failures', async () => {
      const failureHandler = jest.fn();
      const mockRefreshFn = jest.fn(async () => {
        const error: any = new Error('Bad Gateway');
        error.response = { status: 502 };
        throw error;
      });

      const broker = new TokenBroker({ refreshFn: mockRefreshFn });
      broker.onAuthFailure(failureHandler);
      (tokenStorage as any).__setMockTokens(null, 'valid-token');

      await expect(broker.getAccessToken()).rejects.toThrow('Bad Gateway');
      expect(failureHandler).not.toHaveBeenCalled();
      expect(broker.getIsLocked()).toBe(false);
      expect(broker.getConsecutiveFailures()).toBe(1);
    });

    it('does NOT lock broker on network timeout and increments failures', async () => {
      const failureHandler = jest.fn();
      const mockRefreshFn = jest.fn(async () => {
        const error: any = new Error('Network timeout');
        error.code = 'ECONNABORTED';
        throw error;
      });

      const broker = new TokenBroker({ refreshFn: mockRefreshFn });
      broker.onAuthFailure(failureHandler);
      (tokenStorage as any).__setMockTokens(null, 'valid-token');

      await expect(broker.getAccessToken()).rejects.toThrow('Network timeout');
      expect(failureHandler).not.toHaveBeenCalled();
      expect(broker.getConsecutiveFailures()).toBe(1);
      expect(broker.getIsLocked()).toBe(false);
    });
  });

  describe('7. Typed Client Errors & Zero Auto-Retry Policy (Phase 7.1.1.2 Hardening)', () => {
    it('throws MissingRefreshTokenError when no refresh token exists in SecureStore', async () => {
      const broker = new TokenBroker();
      (tokenStorage as any).__setMockTokens(null, null);

      await expect(broker.getAccessToken()).rejects.toThrow(MissingRefreshTokenError);
      expect(broker.getIsLocked()).toBe(true);
    });

    it('throws RefreshUnauthorizedError on HTTP 401 and locks broker fail-closed', async () => {
      const mockRefreshFn = jest.fn().mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } },
      });
      const broker = new TokenBroker({ refreshFn: mockRefreshFn });
      (tokenStorage as any).__setMockTokens(null, 'rt_401');

      await expect(broker.getAccessToken()).rejects.toThrow(RefreshUnauthorizedError);
      expect(broker.getIsLocked()).toBe(true);
    });

    it('throws RefreshAmbiguousError on HTTP 502 Bad Gateway and applies Zero Auto-Retry (TC-FI17)', async () => {
      const mockRefreshFn = jest.fn().mockRejectedValue({
        response: { status: 502, data: { message: 'Bad Gateway' } },
      });
      const broker = new TokenBroker({ refreshFn: mockRefreshFn });
      (tokenStorage as any).__setMockTokens(null, 'rt_ambiguous');

      await expect(broker.getAccessToken()).rejects.toThrow(RefreshAmbiguousError);
      // Zero Auto-Retry: does not lock broker and does NOT wipe SecureStore
      expect(broker.getIsLocked()).toBe(false);
      expect(broker.getConsecutiveFailures()).toBe(1);
      expect(tokenStorage.clearTokens).not.toHaveBeenCalled();
    });

    it('throws RefreshAmbiguousError on Network Timeout ECONNABORTED (TC-FI16)', async () => {
      const mockRefreshFn = jest.fn().mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      });
      const broker = new TokenBroker({ refreshFn: mockRefreshFn });
      (tokenStorage as any).__setMockTokens(null, 'rt_timeout');

      await expect(broker.getAccessToken()).rejects.toThrow(RefreshAmbiguousError);
      expect(broker.getIsLocked()).toBe(false);
      expect(broker.getConsecutiveFailures()).toBe(1);
      expect(tokenStorage.clearTokens).not.toHaveBeenCalled();
    });

    it('throws SessionTerminatedError when locked broker receives token request', async () => {
      const broker = new TokenBroker();
      broker.lockBroker();

      await expect(broker.getAccessToken()).rejects.toThrow(SessionTerminatedError);
    });
  });
});
