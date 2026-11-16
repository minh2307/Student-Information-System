/**
 * securityPolicy.test.ts
 * Rigorous RFC 3986 Origin & Navigation Security Tests (TASK 7.2)
 *
 * Verifies Scenarios 1-6 of TASK 7.2:
 * 1. Valid origin (HTTPS production and dev).
 * 2. Wrong scheme (HTTP in production).
 * 3. Spoofed domain & typosquatting.
 * 4. Disallowed port.
 * 5. Safe external URLs.
 * 6. Dangerous URL schemes (javascript:, file:, intent:, data:, content:, blob:).
 */

import {
  isValidOrigin,
  isDangerousScheme,
  isSafeExternalUrl,
  evaluateNavigationPolicy,
  DEFAULT_PRODUCTION_ORIGINS,
  DEFAULT_DEV_ORIGINS,
} from '@/bridge/securityPolicy';

describe('securityPolicy Engine (TASK 7.2)', () => {
  const prodOrigins = DEFAULT_PRODUCTION_ORIGINS;
  const devOrigins = [...DEFAULT_PRODUCTION_ORIGINS, ...DEFAULT_DEV_ORIGINS];

  // ── Scenario 1: Valid Origin Verification ──
  describe('Scenario 1: Valid Origin Verification', () => {
    it('accepts exact production HTTPS origin', () => {
      expect(isValidOrigin('https://rikkeiportal.io.vn', prodOrigins, false)).toBe(true);
      expect(isValidOrigin('https://rikkeiportal.io.vn/student/profile', prodOrigins, false)).toBe(true);
      expect(isValidOrigin('https://rikkeiportal.io.vn/api/v1/data', prodOrigins, false)).toBe(true);
    });

    it('accepts development origins only when isDev is true', () => {
      expect(isValidOrigin('http://localhost:5173', devOrigins, true)).toBe(true);
      expect(isValidOrigin('http://127.0.0.1:5173/profile', devOrigins, true)).toBe(true);
      expect(isValidOrigin('http://localhost:3000/dashboard', devOrigins, true)).toBe(true);

      // In production mode (isDev=false), dev origins with http: MUST be rejected
      expect(isValidOrigin('http://localhost:5173', devOrigins, false)).toBe(false);
    });
  });

  // ── Scenario 2: Origin with Wrong Scheme ──
  describe('Scenario 2: Origin with Wrong Scheme', () => {
    it('rejects HTTP production origin strictly', () => {
      expect(isValidOrigin('http://rikkeiportal.io.vn', prodOrigins, false)).toBe(false);
      expect(isValidOrigin('http://rikkeiportal.io.vn/profile', prodOrigins, false)).toBe(false);
    });

    it('rejects FTP, WS, or other non-HTTPS schemes', () => {
      expect(isValidOrigin('ftp://rikkeiportal.io.vn', prodOrigins, false)).toBe(false);
      expect(isValidOrigin('ws://rikkeiportal.io.vn', prodOrigins, false)).toBe(false);
      expect(isValidOrigin('wss://rikkeiportal.io.vn', prodOrigins, false)).toBe(false);
    });
  });

  // ── Scenario 3: Spoofed Domain & Typosquatting (No Substrings or .includes) ──
  describe('Scenario 3: Spoofed Domain & Typosquatting', () => {
    it('rejects subdomain prefix spoofing', () => {
      expect(isValidOrigin('https://attacker-rikkeiportal.io.vn', prodOrigins, false)).toBe(false);
      expect(isValidOrigin('https://sub.rikkeiportal.io.vn', prodOrigins, false)).toBe(false);
    });

    it('rejects suffix / TLD spoofing (domain appended)', () => {
      expect(isValidOrigin('https://rikkeiportal.io.vn.evil.com', prodOrigins, false)).toBe(false);
      expect(isValidOrigin('https://rikkeiportal.io.vn.attacker.io', prodOrigins, false)).toBe(false);
    });

    it('rejects username embedded spoofing', () => {
      expect(isValidOrigin('https://rikkeiportal.io.vn@attacker.com', prodOrigins, false)).toBe(false);
    });

    it('rejects similar lookalike / typosquatting domains', () => {
      expect(isValidOrigin('https://rikkeiportal.vn', prodOrigins, false)).toBe(false);
      expect(isValidOrigin('https://rikkei-portal.io.vn', prodOrigins, false)).toBe(false);
      expect(isValidOrigin('https://rikkeiporta1.io.vn', prodOrigins, false)).toBe(false);
    });
  });

  // ── Scenario 4: Disallowed Port ──
  describe('Scenario 4: Disallowed Port', () => {
    it('rejects non-standard ports on production domain', () => {
      expect(isValidOrigin('https://rikkeiportal.io.vn:8443', prodOrigins, false)).toBe(false);
      expect(isValidOrigin('https://rikkeiportal.io.vn:8080/profile', prodOrigins, false)).toBe(false);
      expect(isValidOrigin('https://rikkeiportal.io.vn:3000', prodOrigins, false)).toBe(false);
    });

    it('accepts dev origin only with matching configured port', () => {
      expect(isValidOrigin('http://localhost:5173', devOrigins, true)).toBe(true);
      expect(isValidOrigin('http://localhost:9999', devOrigins, true)).toBe(false);
    });
  });

  // ── Scenario 5: External URL Detection ──
  describe('Scenario 5: External URL Detection', () => {
    it('recognizes valid external HTTP/HTTPS websites', () => {
      expect(isSafeExternalUrl('https://google.com')).toBe(true);
      expect(isSafeExternalUrl('https://payos.vn/checkout')).toBe(true);
      expect(isSafeExternalUrl('http://example.com/docs')).toBe(true);
    });

    it('evaluates external navigation policy to EXTERNAL_BROWSER', () => {
      const result = evaluateNavigationPolicy('https://payos.vn/checkout', prodOrigins, false);
      expect(result.action).toBe('EXTERNAL_BROWSER');
    });
  });

  // ── Scenario 6: Dangerous URL Schemes ──
  describe('Scenario 6: Dangerous URL Schemes', () => {
    it('detects javascript: scheme as dangerous and blocks it', () => {
      expect(isDangerousScheme('javascript:alert(1)')).toBe(true);
      expect(isDangerousScheme('JAVASCRIPT:void(0)')).toBe(true);
      const res = evaluateNavigationPolicy('javascript:alert(1)', prodOrigins, false);
      expect(res.action).toBe('BLOCK');
    });

    it('detects file: scheme as dangerous and blocks it', () => {
      expect(isDangerousScheme('file:///android_asset/secret.txt')).toBe(true);
      expect(isDangerousScheme('FILE:///etc/passwd')).toBe(true);
      const res = evaluateNavigationPolicy('file:///etc/passwd', prodOrigins, false);
      expect(res.action).toBe('BLOCK');
    });

    it('detects intent: scheme as dangerous and blocks it', () => {
      expect(isDangerousScheme('intent://scan/#Intent;scheme=zxing;package=com.google.zxing.client.android;end')).toBe(true);
      const res = evaluateNavigationPolicy('intent://malicious', prodOrigins, false);
      expect(res.action).toBe('BLOCK');
    });

    it('detects data: and content: schemes as dangerous and blocks them', () => {
      expect(isDangerousScheme('data:text/html,<script>alert(1)</script>')).toBe(true);
      expect(isDangerousScheme('content://media/external/images')).toBe(true);
      expect(isDangerousScheme('blob:https://rikkeiportal.io.vn/uuid')).toBe(true);

      expect(evaluateNavigationPolicy('data:text/html,evil', prodOrigins, false).action).toBe('BLOCK');
      expect(evaluateNavigationPolicy('content://media', prodOrigins, false).action).toBe('BLOCK');
    });
  });
});
