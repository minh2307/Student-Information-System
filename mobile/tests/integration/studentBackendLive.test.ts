/**
 * Real Backend Live Integration Test Suite for Student Endpoints
 * Target Environment: https://rikkeiportal.io.vn
 *
 * CRITICAL DISCRIMINATION:
 * This suite executes REAL HTTPS NETWORK CALLS against the running production API Gateway.
 * It strictly validates:
 * 1. Live login with STUDENT (sv2024001) to obtain real Bearer JWT.
 * 2. Live query of GET /api/v1/student/dashboard (HTTP 200).
 * 3. Live query of GET /api/v1/student/timetable (HTTP 200).
 * 4. Live query of GET /api/v1/student/exams (HTTP 200).
 * 5. Live query of GET /api/v1/student/grades (HTTP 200).
 * 6. Live query of GET /api/v1/student/tuition (HTTP 200).
 * 7. Security: STUDENT token blocked with HTTP 403 on Lecturer routes.
 * 8. Security: STUDENT token blocked with HTTP 403 on Admin routes.
 * 9. Security: Missing token blocked with HTTP 401 on student routes.
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
        timeout: 15000,
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
      reject(new Error('Request timeout after 15000ms'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

describe('REAL BACKEND LIVE STUDENT INTEGRATION (https://rikkeiportal.io.vn)', () => {
  jest.setTimeout(30000);

  let studentToken = '';

  beforeAll(async () => {
    // Obtain real STUDENT token
    const studentLogin = await httpsRequest('POST', '/api/v1/auth/login', {
      username: 'sv2024001',
      password: '123456',
    });
    expect(studentLogin.statusCode).toBe(200);
    studentToken = studentLogin.bodyJson?.data?.accessToken;
    expect(studentToken).toBeTruthy();
  });

  it('[LIVE-STU-01] GET /api/v1/student/dashboard returns 200 with stats and progress', async () => {
    const res = await httpsRequest('GET', '/api/v1/student/dashboard', null, {
      Authorization: `Bearer ${studentToken}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.bodyJson?.success).toBe(true);

    const data = res.bodyJson?.data;
    expect(data?.stats).toBeDefined();
    expect(data?.stats?.registeredCourses).toBeGreaterThanOrEqual(0);
    expect(data?.semesterProgress).toBeDefined();
    expect(data?.semesterProgress?.totalRequiredCredits).toBeDefined();
    expect(Array.isArray(data?.upcomingClasses)).toBe(true);
  });

  it('[LIVE-STU-02] GET /api/v1/student/timetable returns 200 with valid class list', async () => {
    const res = await httpsRequest('GET', '/api/v1/student/timetable', null, {
      Authorization: `Bearer ${studentToken}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.bodyJson?.success).toBe(true);
    expect(Array.isArray(res.bodyJson?.data)).toBe(true);

    if (res.bodyJson?.data.length > 0) {
      const firstClass = res.bodyJson?.data[0];
      expect(firstClass.courseCode).toBeDefined();
      expect(firstClass.startTime).toBeDefined();
      expect(firstClass.dayOfWeek).toBeDefined();
    }
  });

  it('[LIVE-STU-03] GET /api/v1/student/exams returns 200 with exam schedules', async () => {
    const res = await httpsRequest('GET', '/api/v1/student/exams', null, {
      Authorization: `Bearer ${studentToken}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.bodyJson?.success).toBe(true);
    expect(Array.isArray(res.bodyJson?.data)).toBe(true);

    if (res.bodyJson?.data.length > 0) {
      const firstExam = res.bodyJson?.data[0];
      expect(firstExam.courseCode).toBeDefined();
      expect(firstExam.examDate).toBeDefined();
      expect(firstExam.roomName).toBeDefined();
    }
  });

  it('[LIVE-STU-04] GET /api/v1/student/grades returns 200 with student grades', async () => {
    const res = await httpsRequest('GET', '/api/v1/student/grades', null, {
      Authorization: `Bearer ${studentToken}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.bodyJson?.success).toBe(true);
    expect(Array.isArray(res.bodyJson?.data)).toBe(true);

    if (res.bodyJson?.data.length > 0) {
      const firstGrade = res.bodyJson?.data[0];
      expect(firstGrade.courseCode).toBeDefined();
      expect(firstGrade.enrollmentId).toBeDefined();
    }
  });

  it('[LIVE-STU-05] GET /api/v1/student/tuition returns 200 with tuition billing breakdown', async () => {
    const res = await httpsRequest('GET', '/api/v1/student/tuition', null, {
      Authorization: `Bearer ${studentToken}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.bodyJson?.success).toBe(true);

    const data = res.bodyJson?.data;
    expect(data?.totalAmount).toBeDefined();
    expect(data?.status).toBeDefined();
    expect(data?.bankBin).toBeDefined();
    expect(data?.accountNumber).toBeDefined();
    expect(Array.isArray(data?.courses)).toBe(true);
  });

  it('[LIVE-STU-06] Gateway RBAC: Rejects STUDENT role from /api/v1/lecturer/classes with HTTP 403', async () => {
    const res = await httpsRequest('GET', '/api/v1/lecturer/classes', null, {
      Authorization: `Bearer ${studentToken}`,
    });

    expect(res.statusCode).toBe(403);
    expect(res.bodyJson?.message).toContain('Forbidden');
  });

  it('[LIVE-STU-07] Gateway RBAC: Rejects STUDENT role from /api/v1/admin/users with HTTP 403', async () => {
    const res = await httpsRequest('GET', '/api/v1/admin/users', null, {
      Authorization: `Bearer ${studentToken}`,
    });

    expect(res.statusCode).toBe(403);
    expect(res.bodyJson?.message).toContain('Forbidden');
  });

  it('[LIVE-STU-08] Gateway Security: Rejects unauthenticated request on student endpoints with HTTP 401 Unauthorized', async () => {
    const res = await httpsRequest('GET', '/api/v1/student/dashboard');

    expect(res.statusCode).toBe(401);
    expect(res.bodyJson?.message).toContain('xác thực');
  });
});
