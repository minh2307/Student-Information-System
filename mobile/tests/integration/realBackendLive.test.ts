/**
 * Real Backend Integration Test Suite
 * Target Environment: https://rikkeiportal.io.vn
 *
 * CRITICAL DISCRIMINATION:
 * This suite executes REAL HTTPS NETWORK CALLS against the running production API Gateway.
 * It strictly validates:
 * 1. Live login with STUDENT, LECTURER, ADMIN credentials.
 * 2. Rejection of incorrect credentials with HTTP 401.
 * 3. Live profile retrieval with Bearer token.
 * 4. Refresh token rotation & subsequent Token Reuse Detection (HTTP 401).
 * 5. Live session revocation via logout.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const https = require('https');

interface LiveResponse {
  statusCode: number;
  bodyJson: any;
  rawText: string;
}

function httpsRequest(
  method: string,
  path: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<LiveResponse> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    };
    if (postData) {
      reqHeaders['Content-Length'] = new TextEncoder().encode(postData).length.toString();
    }

    const req = https.request(
      `https://rikkeiportal.io.vn${path}`,
      {
        method,
        headers: reqHeaders,
        rejectUnauthorized: false,
        timeout: 10000,
      },
      (res: any) => {
        let rawText = '';
        res.on('data', (chunk: any) => {
          rawText += chunk;
        });
        res.on('end', () => {
          let bodyJson = null;
          try {
            bodyJson = JSON.parse(rawText);
          } catch {}
          resolve({
            statusCode: res.statusCode || 500,
            bodyJson,
            rawText,
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout after 10000ms'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

describe('REAL BACKEND LIVE INTEGRATION (https://rikkeiportal.io.vn)', () => {
  jest.setTimeout(20000);

  let studentAccessToken = '';
  let studentRefreshToken = '';

  it('[LIVE-AUTH-01] Real STUDENT login returns 200 with JWT and StudentProfile', async () => {
    const res = await httpsRequest('POST', '/api/v1/auth/login', {
      username: 'sv2024001',
      password: '123456',
    });

    expect(res.statusCode).toBe(200);
    expect(res.bodyJson?.success).toBe(true);
    expect(res.bodyJson?.data?.accessToken).toBeDefined();
    expect(res.bodyJson?.data?.refreshToken).toBeDefined();

    const user = res.bodyJson?.data?.user;
    expect(user?.username).toBe('sv2024001');
    expect(user?.role).toBe('STUDENT');

    const profile = res.bodyJson?.data?.studentProfile;
    expect(profile).not.toBeNull();
    expect(profile?.studentCode).toBe('SV2024001');

    studentAccessToken = res.bodyJson?.data?.accessToken;
    studentRefreshToken = res.bodyJson?.data?.refreshToken;
  });

  it('[LIVE-AUTH-02] Real LECTURER login returns 200 with JWT and LecturerProfile', async () => {
    const res = await httpsRequest('POST', '/api/v1/auth/login', {
      username: 'gv001',
      password: '123456',
    });

    expect(res.statusCode).toBe(200);
    expect(res.bodyJson?.success).toBe(true);

    const user = res.bodyJson?.data?.user;
    expect(user?.username).toBe('gv001');
    expect(user?.role).toBe('LECTURER');

    const profile = res.bodyJson?.data?.lecturerProfile;
    expect(profile).not.toBeNull();
    expect(profile?.lecturerCode).toBe('GV001');
    expect(res.bodyJson?.data?.studentProfile).toBeNull();
  });

  it('[LIVE-AUTH-03] Real ADMIN login returns 200 with role ADMIN', async () => {
    const res = await httpsRequest('POST', '/api/v1/auth/login', {
      username: 'admin',
      password: '123456',
    });

    expect(res.statusCode).toBe(200);
    expect(res.bodyJson?.data?.user?.role).toBe('ADMIN');
    expect(res.bodyJson?.data?.studentProfile).toBeNull();
    expect(res.bodyJson?.data?.lecturerProfile).toBeNull();
  });

  it('[LIVE-AUTH-04] Rejects incorrect password with HTTP 401 Unauthorized', async () => {
    const res = await httpsRequest('POST', '/api/v1/auth/login', {
      username: 'sv2024001',
      password: 'wrong_password_xyz',
    });

    expect(res.statusCode).toBe(401);
    expect(res.bodyJson?.message).toContain('Tên đăng nhập hoặc mật khẩu không chính xác');
  });

  it('[LIVE-AUTH-05] Fetches live profile via GET /api/v1/profile/me using Bearer token', async () => {
    expect(studentAccessToken).toBeTruthy();

    const res = await httpsRequest('GET', '/api/v1/profile/me', null, {
      Authorization: `Bearer ${studentAccessToken}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.bodyJson?.data?.user?.username).toBe('sv2024001');
    expect(res.bodyJson?.data?.studentProfile?.studentCode).toBe('SV2024001');
  });

  it('[LIVE-AUTH-06] Rotates Refresh Token and detects subsequent Token Reuse attempt', async () => {
    expect(studentRefreshToken).toBeTruthy();
    const staleRefreshToken = studentRefreshToken;

    // 1. First refresh call: Succeeds and issues rotated token
    const refreshRes = await httpsRequest('POST', '/api/v1/auth/refresh', {
      refreshToken: staleRefreshToken,
    });

    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.bodyJson?.data?.accessToken).toBeDefined();
    const newRefreshToken = refreshRes.bodyJson?.data?.refreshToken;
    expect(newRefreshToken).toBeDefined();
    expect(newRefreshToken).not.toBe(staleRefreshToken);

    // 2. Token Reuse Detection: Attempting to use the old staleRefreshToken must be rejected with 401
    const reuseRes = await httpsRequest('POST', '/api/v1/auth/refresh', {
      refreshToken: staleRefreshToken,
    });

    expect(reuseRes.statusCode).toBe(401);
    expect(reuseRes.bodyJson?.message).toContain('thu hồi');
  });

  it('[LIVE-AUTH-07] Revokes session on live backend via POST /api/v1/auth/logout', async () => {
    // Log in fresh user
    const loginRes = await httpsRequest('POST', '/api/v1/auth/login', {
      username: 'sv2024002',
      password: '123456',
    });
    const refreshTokenToRevoke = loginRes.bodyJson?.data?.refreshToken;
    expect(refreshTokenToRevoke).toBeTruthy();

    const logoutRes = await httpsRequest('POST', '/api/v1/auth/logout', {
      refreshToken: refreshTokenToRevoke,
    });
    expect(logoutRes.statusCode).toBe(200);

    // Verify revoked token cannot be refreshed
    const refreshAfterLogout = await httpsRequest('POST', '/api/v1/auth/refresh', {
      refreshToken: refreshTokenToRevoke,
    });
    expect(refreshAfterLogout.statusCode).toBe(401);
  });

  describe('LIVE LECTURER ENDPOINTS INTEGRATION', () => {
    let lecturerToken = '';

    beforeAll(async () => {
      const res = await httpsRequest('POST', '/api/v1/auth/login', {
        username: 'gv001',
        password: '123456',
      });
      lecturerToken = res.bodyJson?.data?.accessToken;
    });

    it('[LIVE-LECTURER-01] GET /api/v1/lecturer/classes returns real assigned classes', async () => {
      expect(lecturerToken).toBeTruthy();
      const res = await httpsRequest('GET', '/api/v1/lecturer/classes', null, {
        Authorization: `Bearer ${lecturerToken}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.bodyJson?.success).toBe(true);
      expect(Array.isArray(res.bodyJson?.data)).toBe(true);
      expect(res.bodyJson?.data.length).toBeGreaterThan(0);

      const firstClass = res.bodyJson?.data[0];
      expect(firstClass.sectionId).toBeDefined();
      expect(firstClass.sectionCode).toBeDefined();
      expect(firstClass.courseName).toBeDefined();
      expect(firstClass.roomName).toBeDefined();
    });

    it('[LIVE-LECTURER-02] GET /api/v1/lecturer/classes/1/students returns enrolled students', async () => {
      const res = await httpsRequest('GET', '/api/v1/lecturer/classes/1/students', null, {
        Authorization: `Bearer ${lecturerToken}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.bodyJson?.success).toBe(true);
      expect(Array.isArray(res.bodyJson?.data)).toBe(true);
      if (res.bodyJson?.data.length > 0) {
        const student = res.bodyJson?.data[0];
        expect(student.studentCode).toBeDefined();
        expect(student.fullName).toBeDefined();
        expect(student.enrollmentId).toBeDefined();
      }
    });

    it('[LIVE-LECTURER-03] GET /api/v1/lecturer/early-warnings/section/1 returns section risk report', async () => {
      const res = await httpsRequest('GET', '/api/v1/lecturer/early-warnings/section/1', null, {
        Authorization: `Bearer ${lecturerToken}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.bodyJson?.success).toBe(true);
      expect(res.bodyJson?.data?.sectionId).toBe(1);
      expect(res.bodyJson?.data?.totalStudents).toBeDefined();
      expect(res.bodyJson?.data?.criticalCount).toBeDefined();
    });

    it('[LIVE-LECTURER-04] GET /api/v1/lecturer/classes/1/attendance/session returns attendance session', async () => {
      const res = await httpsRequest('GET', '/api/v1/lecturer/classes/1/attendance/session', null, {
        Authorization: `Bearer ${lecturerToken}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.bodyJson?.success).toBe(true);
      expect(res.bodyJson?.data?.sectionId).toBe(1);
      expect(res.bodyJson?.data?.status).toBeDefined();
    });

    it('[LIVE-LECTURER-05] Security: STUDENT token calling /api/v1/lecturer/classes is blocked with 403 Forbidden', async () => {
      expect(studentAccessToken).toBeTruthy();
      const res = await httpsRequest('GET', '/api/v1/lecturer/classes', null, {
        Authorization: `Bearer ${studentAccessToken}`,
      });

      expect(res.statusCode).toBe(403);
      expect(res.bodyJson?.message).toMatch(/Forbidden|Từ chối truy cập/i);
    });

    it('[LIVE-LECTURER-06] Security: Unauthenticated request to /api/v1/lecturer/classes is blocked with 401 Unauthorized', async () => {
      const res = await httpsRequest('GET', '/api/v1/lecturer/classes');
      expect(res.statusCode).toBe(401);
    });
  });
});
