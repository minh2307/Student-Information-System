/**
 * Lecturer Domain Types
 * Exactly matches lecturer-service DTOs verified against Backend.
 */

export interface LecturerClassSection {
  sectionId: number;
  sectionCode: string;
  courseName: string;
  courseCode: string;
  credits: number;
  semesterName: string;
  dayOfWeek: string; // e.g. "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"
  startTime: string; // e.g. "09:00:00"
  endTime: string; // e.g. "10:30:00"
  roomName: string;
  currentEnrolled: number;
  maxCapacity: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
}

export interface StudentGrade {
  enrollmentId: number;
  studentCode: string;
  fullName: string;
  attendanceRate: number | null;
  attendanceScore: number | null;
  midtermScore: number | null;
  finalScore: number | null;
  totalScore: number | null;
  letterGrade: string | null;
  isLocked: boolean;
}

export interface AttendanceRecord {
  recordId: number;
  studentCode: string;
  studentName: string;
  checkInTime: string;
  deviceInfo?: string;
}

export interface AttendanceSession {
  sessionId: number;
  sectionId: number;
  sectionCode: string;
  courseName: string;
  sessionName: string;
  status: 'ACTIVE' | 'OPEN' | 'CLOSED';
  stepSeconds: number;
  totalAttendees: number;
  createdAt: string;
  closedAt: string | null;
  records: AttendanceRecord[];
}

export interface DynamicQrResponse {
  sessionId: number;
  sectionId: number;
  qrToken: string;
  qrImageBase64: string;
  stepSeconds: number;
  remainingSeconds: number;
  expiresAtEpochMs: number;
}

export interface StudentRisk {
  studentId: number;
  studentCode: string;
  fullName: string;
  email: string;
  classSectionId?: number;
  sectionCode?: string;
  courseName?: string;
  totalSessionsHeld?: number;
  attendedSessions?: number;
  absentSessions?: number;
  absenceRate: number;
  attendanceScore?: number | null;
  midtermScore?: number | null;
  finalScore?: number | null;
  totalScore?: number | null;
  riskLevel: 'CRITICAL' | 'WARNING' | 'SAFE';
  riskScore: number;
  riskReasons: string[];
  suggestions: string[];
  warningDispatched?: boolean;
}

export interface EarlyWarningSummary {
  sectionId: number;
  sectionCode: string;
  courseName: string;
  totalStudents: number;
  criticalCount: number;
  warningCount: number;
  safeCount: number;
  attendanceRiskCount: number;
  gradeRiskCount: number;
  students: StudentRisk[];
  evaluationSummary?: string;
}

export interface DispatchWarningRequest {
  sectionId: number;
  studentIds: number[];
  customMessage?: string;
}

export interface DispatchWarningResponse {
  sentCount: number;
  status: string;
  dispatchedAt: string;
  recipientNames: string[];
  message: string;
}

export interface AttendanceUpdateRequest {
  attendanceRate: number;
}

export interface GradeUpdateRequest {
  attendanceScore?: number | null;
  midtermScore?: number | null;
  finalScore?: number | null;
}

export interface LockGradesResponse {
  sectionId: number;
  lockedCount: number;
  locked: boolean;
  message: string;
}
