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

export interface StudentAttendanceRecord {
  recordId: number;
  sessionId: number;
  sessionName: string;
  sectionId: number;
  sectionCode: string;
  courseCode: string;
  courseName: string;
  semesterName: string;
  roomName: string;
  dayOfWeek: string;
  slotTime: string;
  checkInTime: string;
  status: string;
  deviceInfo: string;
}

export interface StudentAttendanceHistoryResponse {
  studentId: number;
  studentCode: string;
  studentName: string;
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  records: StudentAttendanceRecord[];
}

export interface AttendanceCheckInRequest {
  qrToken: string;
  deviceInfo?: string;
  clientTimestampMs?: number;
}

export interface AttendanceCheckInResponse {
  success: boolean;
  message: string;
  checkedInAt: string;
  sessionId: number;
  sectionId: number;
  sectionCode: string;
  courseName: string;
  studentCode: string;
  studentName: string;
  checkInTime?: string;
}

export interface CompletedCourseItem {
  courseCode: string;
  courseName: string;
  credits: number;
  letterGrade: string;
  gpa: number;
  semesterName: string;
}

export interface FailedCourseItem {
  courseCode: string;
  courseName: string;
  credits: number;
  letterGrade: string;
  semesterName: string;
}

export interface StudentAcademicContext {
  studentCode: string;
  fullName: string;
  major: string;
  currentSemester: number;
  completedCredits: number;
  registeredCredits: number;
  totalRequiredCredits: number;
  currentCgpa: number;
  previousCgpa: number;
  academicStanding: string;
  attendanceRate: number;
  completedCourses?: CompletedCourseItem[];
  failedCourses?: FailedCourseItem[];
}

export interface PayOSPaymentLinkResponse {
  orderCode: number;
  amount: number;
  description: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  checkoutUrl: string;
  qrCode: string;
  paymentLinkId: string;
  status: string;
  isMock?: boolean;
}

export interface ClassSection {
  id: number;
  sectionCode: string;
  courseId: number;
  courseCode: string;
  courseName: string;
  credits: number;
  weeklyHours?: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomName: string;
  maxCapacity: number;
  currentEnrolled: number;
  lecturerName: string;
  status: string;
  isEnrolled: boolean;
  isCompleted?: boolean;
  isOtherSectionEnrolled?: boolean;
  isCourseAlreadyPassed?: boolean;
  enrollmentStatus?: string;
  enrollmentId?: number;
  hasConflict: boolean;
  reservedCount?: number;
  availableSeats?: number;
  isReservedByMe?: boolean;
  myReservationRemainingSeconds?: number;
  myReservationId?: number;
}

export interface SlotReservation {
  reservationId: number;
  classSectionId: number;
  sectionCode: string;
  courseName: string;
  reservedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  status: string;
  message?: string;
}

export interface EnrollmentResult {
  enrollmentId: number;
  classSectionId: number;
  sectionCode: string;
  courseCode: string;
  courseName: string;
  credits: number;
  status: string;
  hasConflict: boolean;
  registeredAt: string;
  creditWarning?: string;
}

export interface CalendarSubscriptionInstructions {
  googleCalendar: string;
  appleCalendar: string;
  outlook: string;
}

export interface CalendarSubscriptionInfo {
  studentCode: string;
  feedToken: string;
  subscriptionUrl: string;
  webcalUrl: string;
  exportUrl: string;
  instructions: CalendarSubscriptionInstructions;
}

export interface CourseRecommendationItem {
  courseCode: string;
  courseName: string;
  credits: number;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'assistant';
  content: string;
  timestamp: string;
  mode?: string;
  fallbackUsed?: boolean;
  suggestions?: string[];
  recommendations?: CourseRecommendationItem[];
}

export interface AcademicAdvisorRequest {
  message: string;
  history?: { role: string; content: string }[];
  studentCode?: string;
  currentSemester?: number;
  major?: string;
  creditsEarned?: number;
  currentCgpa?: number;
  conflictingSections?: string[];
}

export interface AcademicAdvisorResponse {
  reply: string;
  mode?: string;
  category?: string;
  suggestions?: string[];
  provider?: string;
  model?: string;
  fallbackUsed?: boolean;
  academicSummary?: {
    studentCode?: string;
    currentCgpa?: number;
    creditsEarned?: number;
    currentSemester?: number;
  };
  recommendations?: CourseRecommendationItem[];
  limitations?: string[];
  timestamp?: string;
}




