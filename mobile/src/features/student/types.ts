/**
 * Student Domain Types & Backend DTOs
 * Verified against services/enrollment-service and services/auth-service.
 */

export interface DashboardStats {
  registeredCourses: number;
  weeklyClasses: number;
  pendingRegistrations: number;
  scheduleConflicts: number;
}

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface UpcomingClass {
  id: number;
  courseCode: string;
  courseName: string;
  dayOfWeek: DayOfWeek | string;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:30"
  roomName: string;
  lecturerName: string;
  sectionCode?: string;
  credits?: number;
  semesterName?: string;
  status?: string;   // "REGISTERED" | "PENDING"
}

export interface SemesterProgress {
  creditsEarned: number;
  totalRequiredCredits: number;
  attendanceRate: number;
  currentCgpa: number;
  previousCgpa: number;
  academicStanding: string;
}

export interface StudentDashboardResponse {
  stats: DashboardStats;
  upcomingClasses: UpcomingClass[];
  semesterProgress: SemesterProgress;
}

export interface ExamSchedule {
  id: number;
  courseCode: string;
  courseName: string;
  sectionCode?: string;
  credits?: number;
  examDate: string;  // "YYYY-MM-DD"
  startTime: string; // "HH:mm:ss" or "HH:mm"
  endTime: string;   // "HH:mm:ss" or "HH:mm"
  roomName: string;
  examType: string;  // "THI MÁY" | "TỰ LUẬN" | "TRẮC NGHIỆM" | "BẢO VỆ ĐỒ ÁN"
  notes?: string;
  lecturerName?: string;
  classSectionId?: number;
  semesterName?: string;
  currentEnrolled?: number;
  maxCapacity?: number;
}

export interface StudentGrade {
  enrollmentId: number;
  courseCode: string;
  courseName: string;
  credits?: number;
  semesterName: string;
  attendanceScore?: number | null;
  midtermScore?: number | null;
  finalScore?: number | null;
  totalScore?: number | null;
  letterGrade?: string | null;
  isLocked?: boolean;
}

export interface TuitionCourseItem {
  courseCode: string;
  courseName: string;
  credits: number;
  fee: number;
}

export interface BankOption {
  bankBin: string;
  bankShortName: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  vietQrPayload?: string;
  vietQrQuickLink?: string;
}

export interface Tuition {
  id?: number;
  semesterName: string;
  totalCredits: number;
  creditUnitPrice: number;
  facilityFee: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  excessAmount: number;
  status: 'PAID' | 'UNPAID' | 'PARTIAL' | 'NOT_ENROLLED' | string;
  dueDate?: string | null;
  paymentDate?: string | null;
  transactionCode?: string | null;
  paymentMethod?: string | null;
  courses: TuitionCourseItem[];
  studentCode?: string;
  studentName?: string;
  bankBin?: string;
  bankName?: string;
  bankShortName?: string;
  accountNumber?: string;
  accountName?: string;
  transferContent?: string;
  vietQrPayload?: string;
  vietQrQuickLink?: string;
  supportedBanks?: BankOption[];
}

// Backward-compatible types for Phase 1 references
export interface StudentDashboardData {
  studentCode: string;
  fullName: string;
  major: string;
  currentSemester: number;
  cgpa: number;
  creditsEarned: number;
  totalRequiredCredits: number;
  attendanceRate: number;
  tuitionStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
}

export interface TimetableSlot {
  id: number;
  courseCode: string;
  courseName: string;
  room: string;
  dayOfWeek: number;
  startPeriod: number;
  endPeriod: number;
  lecturerName: string;
}

export interface GradeItem {
  courseCode: string;
  courseName: string;
  credits: number;
  attendanceScore?: number;
  midtermScore?: number;
  finalScore?: number;
  totalScore?: number;
  letterGrade?: string;
  status: 'PASSED' | 'FAILED' | 'IN_PROGRESS';
}
