/**
 * securityPolicy.ts
 * WebView Origin & Navigation Security Policy Engine (TASK 7.2)
 *
 * Implements strict RFC 3986 origin verification, dangerous scheme containment,
 * and external navigation evaluation for EduPortal Hybrid Mobile.
 */

export const DEFAULT_PRODUCTION_ORIGINS = ['https://rikkeiportal.io.vn'];
export const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

/**
 * Schemes that represent code injection, local file access, or unverified platform intents.
 * These schemes are strictly BLOCKED from loading in the WebView and NEVER delegated to external browser.
 */
export const DANGEROUS_SCHEMES = [
  'javascript:',
  'file:',
  'intent:',
  'data:',
  'content:',
  'blob:',
  'vbscript:',
];

export type NavigationAction = 'ALLOW' | 'EXTERNAL_BROWSER' | 'BLOCK';

export interface NavigationPolicyResult {
  action: NavigationAction;
  url: string;
  reason?: string;
}

/**
 * Normalizes an origin according to RFC 3986:
 * scheme + "//" + hostname + (port if present and non-default).
 */
export function extractOrigin(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const parsed = new URL(rawUrl);
    const portPart = parsed.port ? `:${parsed.port}` : '';
    return `${parsed.protocol}//${parsed.hostname}${portPart}`;
  } catch {
    return null;
  }
}

/**
 * Strict RFC 3986 Origin Verification.
 * - Scheme + Hostname + Port exact match against allowlist.
 * - In production mode, protocol MUST be 'https:'.
 * - Substring, wildcard or .includes() matching on hostnames is strictly forbidden.
 */
export function isValidOrigin(
  rawUrl: string,
  allowedOrigins: string[] = DEFAULT_PRODUCTION_ORIGINS,
  isDev: boolean = false
): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  try {
    const parsed = new URL(rawUrl);
    const portPart = parsed.port ? `:${parsed.port}` : '';
    const origin = `${parsed.protocol}//${parsed.hostname}${portPart}`;

    // In production, strictly enforce HTTPS
    if (!isDev && parsed.protocol !== 'https:') {
      return false;
    }

    return allowedOrigins.includes(origin);
  } catch {
    return false;
  }
}

/**
 * Checks if a URL starts with or uses a prohibited / dangerous scheme.
 */
export function isDangerousScheme(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return true;
  const trimmed = rawUrl.trim().toLowerCase();

  for (const scheme of DANGEROUS_SCHEMES) {
    if (trimmed.startsWith(scheme)) {
      return true;
    }
  }

  // Also verify via URL parser if valid URL
  try {
    const parsed = new URL(rawUrl);
    const proto = parsed.protocol.toLowerCase();
    if (DANGEROUS_SCHEMES.includes(proto)) {
      return true;
    }
  } catch {
    // Malformed URL with non-standard scheme
    if (trimmed.includes(':') && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return true;
    }
  }

  return false;
}

/**
 * Verifies if an external URL is safe to delegate to the OS system browser.
 * Only HTTP and HTTPS protocols are considered safe external URLs.
 */
export function isSafeExternalUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  if (isDangerousScheme(rawUrl)) return false;

  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Evaluates the navigation policy for a target URL requested inside the WebView.
 *
 * 1. If origin matches the allowlist -> ALLOW (navigate within WebView).
 * 2. If scheme is dangerous (javascript:, file:, intent:, etc.) -> BLOCK (abort immediately).
 * 3. If external URL is safe (http:, https:) -> EXTERNAL_BROWSER (delegate to system WebBrowser).
 * 4. Otherwise -> BLOCK.
 */
export function evaluateNavigationPolicy(
  targetUrl: string,
  allowedOrigins: string[],
  isDev: boolean = false
): NavigationPolicyResult {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return { action: 'BLOCK', url: targetUrl, reason: 'Invalid or empty URL' };
  }

  // Check dangerous schemes first
  if (isDangerousScheme(targetUrl)) {
    return {
      action: 'BLOCK',
      url: targetUrl,
      reason: `Blocked dangerous URL scheme: ${targetUrl.slice(0, 30)}`,
    };
  }

  // Check if allowlisted internal origin
  if (isValidOrigin(targetUrl, allowedOrigins, isDev)) {
    return { action: 'ALLOW', url: targetUrl };
  }

  // Check if safe external link
  if (isSafeExternalUrl(targetUrl)) {
    return {
      action: 'EXTERNAL_BROWSER',
      url: targetUrl,
      reason: 'External URL delegated to system browser',
    };
  }

  return {
    action: 'BLOCK',
    url: targetUrl,
    reason: 'Untrusted or unparseable destination URL',
  };
}
