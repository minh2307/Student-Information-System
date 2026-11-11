import { decodeJwtPayload, isTokenExpired, getTokenRemainingSeconds } from '@/utils/jwt';

describe('JWT Utilities (FIND-03 Validation)', () => {
  // Sample JWT with sub: "sv2024001", role: "STUDENT", exp: 253370764800 (year 9999)
  // Payload: {"sub":"sv2024001","role":"STUDENT","exp":253370764800} -> eyJzdWIiOiJzdjIwMjQwMDEiLCJyb2xlIjoiU1RVREVOVCIsImV4cCI6MjUzMzcwNzY0ODAwfQ
  const validFutureToken = 'header.eyJzdWIiOiJzdjIwMjQwMDEiLCJyb2xlIjoiU1RVREVOVCIsImV4cCI6MjUzMzcwNzY0ODAwfQ.signature';

  // Expired JWT: exp: 1000000000 (year 2001)
  // Payload: {"sub":"sv2024001","role":"STUDENT","exp":1000000000} -> eyJzdWIiOiJzdjIwMjQwMDEiLCJyb2xlIjoiU1RVREVOVCIsImV4cCI6MTAwMDAwMDAwMH0
  const expiredToken = 'header.eyJzdWIiOiJzdjIwMjQwMDEiLCJyb2xlIjoiU1RVREVOVCIsImV4cCI6MTAwMDAwMDAwMH0.signature';

  // Helper to build a JWT with arbitrary payload object
  const createMockToken = (payload: any): string => {
    const jsonStr = JSON.stringify(payload);
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

  it('correctly decodes claims from valid JWT payload', () => {
    const payload = decodeJwtPayload(validFutureToken);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('sv2024001');
    expect(payload?.role).toBe('STUDENT');
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJwtPayload('not-a-token')).toBeNull();
    expect(decodeJwtPayload('header.invalid-base64.signature')).toBeNull();
  });

  it('correctly identifies expired and non-expired tokens', () => {
    expect(isTokenExpired(validFutureToken)).toBe(false);
    expect(isTokenExpired(expiredToken)).toBe(true);
    expect(isTokenExpired('garbage-token')).toBe(true);
  });

  describe('FIND-03: Comprehensive Expiration & NaN Hardening', () => {
    it('handles null and empty token string as expired (0 seconds)', () => {
      expect(isTokenExpired(null as any)).toBe(true);
      expect(isTokenExpired('')).toBe(true);
      expect(getTokenRemainingSeconds(null as any)).toBe(0);
      expect(getTokenRemainingSeconds('')).toBe(0);
    });

    it('handles malformed JWT as expired (0 seconds)', () => {
      expect(isTokenExpired('not.a.valid.jwt.token')).toBe(true);
      expect(getTokenRemainingSeconds('not.a.valid.jwt.token')).toBe(0);
    });

    it('handles payload missing exp field as expired (0 seconds)', () => {
      const token = createMockToken({ sub: 'user1' });
      expect(isTokenExpired(token)).toBe(true);
      expect(getTokenRemainingSeconds(token)).toBe(0);
    });

    it('handles exp = null as expired (0 seconds)', () => {
      const token = createMockToken({ sub: 'user1', exp: null });
      expect(isTokenExpired(token)).toBe(true);
      expect(getTokenRemainingSeconds(token)).toBe(0);
    });

    it('handles exp = "invalid" string as expired (0 seconds)', () => {
      const token = createMockToken({ sub: 'user1', exp: 'invalid' });
      expect(isTokenExpired(token)).toBe(true);
      expect(getTokenRemainingSeconds(token)).toBe(0);
    });

    it('handles exp = NaN as expired (0 seconds)', () => {
      // JSON.stringify turns NaN into null, test with custom encoded payload
      const encoded = 'eyJzdWIiOiJ1c2VyMSIsImV4cCI6TmFOfQ'; // {"sub":"user1","exp":NaN}
      const token = `header.${encoded}.signature`;
      expect(isTokenExpired(token)).toBe(true);
      expect(getTokenRemainingSeconds(token)).toBe(0);
    });

    it('handles exp = Infinity and -Infinity as expired (0 seconds)', () => {
      const tokenInf = createMockToken({ sub: 'user1', exp: 1e999 }); // Infinity in JS
      expect(isTokenExpired(tokenInf)).toBe(true);
      expect(getTokenRemainingSeconds(tokenInf)).toBe(0);

      const tokenNegInf = createMockToken({ sub: 'user1', exp: -1e999 });
      expect(isTokenExpired(tokenNegInf)).toBe(true);
      expect(getTokenRemainingSeconds(tokenNegInf)).toBe(0);
    });

    it('handles exp = 0 and negative numbers as expired (0 seconds)', () => {
      const tokenZero = createMockToken({ sub: 'user1', exp: 0 });
      expect(isTokenExpired(tokenZero)).toBe(true);
      expect(getTokenRemainingSeconds(tokenZero)).toBe(0);

      const tokenNeg = createMockToken({ sub: 'user1', exp: -500 });
      expect(isTokenExpired(tokenNeg)).toBe(true);
      expect(getTokenRemainingSeconds(tokenNeg)).toBe(0);
    });

    it('accurately computes remaining seconds for exp = 60s and 61s', () => {
      const token60 = createMockToken({ sub: 'user1', exp: nowSec() + 60 });
      const rem60 = getTokenRemainingSeconds(token60);
      expect(rem60).toBeGreaterThanOrEqual(59);
      expect(rem60).toBeLessThanOrEqual(60);

      const token61 = createMockToken({ sub: 'user1', exp: nowSec() + 61 });
      const rem61 = getTokenRemainingSeconds(token61);
      expect(rem61).toBeGreaterThanOrEqual(60);
      expect(rem61).toBeLessThanOrEqual(61);
    });

    it('handles valid token that has passed expiration time', () => {
      const pastToken = createMockToken({ sub: 'user1', exp: nowSec() - 100 });
      expect(isTokenExpired(pastToken)).toBe(true);
      expect(getTokenRemainingSeconds(pastToken)).toBe(0);
    });
  });
});

