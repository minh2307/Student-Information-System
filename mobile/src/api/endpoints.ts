/**
 * Centralized API Endpoints Map
 * Verified against Rikkei EduPortal API Gateway routes.
 */

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
  },
  PROFILE: {
    ME: '/api/v1/profile/me',
  },
  STUDENT: {
    DASHBOARD: '/api/v1/student/dashboard',
    TIMETABLE: '/api/v1/student/timetable',
    EXAMS: '/api/v1/student/exams',
    GRADES: '/api/v1/student/grades',
    ACADEMIC_CONTEXT: '/api/v1/student/academic-context',
    SECTIONS: '/api/v1/student/class-sections',
    LIVE_SEATS: '/api/v1/student/class-sections/live-seats',
    ENROLLMENTS: '/api/v1/student/enrollments',
    RESERVE_SLOT: (sectionId: number | string) => `/api/v1/student/class-sections/${sectionId}/reserve`,
    MY_RESERVATIONS: '/api/v1/student/class-sections/my-reservations',
    BATCH_ENROLL_HELD: '/api/v1/student/class-sections/batch-enroll-reservations',
    CREDENTIAL_TRANSCRIPT: '/api/v1/student/credentials/transcript',
    CALENDAR_SYNC_INFO: '/api/v1/student/calendar/subscription-info',
    CALENDAR_EXPORT_ICS: '/api/v1/student/calendar/export.ics',
    TUITION: '/api/v1/student/tuition',
    PAYOS_CREATE_PAYMENT: '/api/v1/student/tuition/payos/create-payment-link',
    EARLY_WARNINGS: '/api/v1/lecturer/early-warnings/my-alerts',
  },
  LECTURER: {
    CLASSES: '/api/v1/lecturer/classes',
    CLASS_STUDENTS: (sectionId: number | string) => `/api/v1/lecturer/classes/${sectionId}/students`,
    UPDATE_ATTENDANCE: (enrollmentId: number | string) => `/api/v1/lecturer/enrollments/${enrollmentId}/attendance`,
    UPDATE_GRADE: (enrollmentId: number | string) => `/api/v1/lecturer/grades/${enrollmentId}`,
    LOCK_GRADES: (sectionId: number | string) => `/api/v1/lecturer/classes/${sectionId}/lock-grades`,
    START_ATTENDANCE_SESSION: (sectionId: number | string) => `/api/v1/lecturer/classes/${sectionId}/attendance/session`,
    GET_ATTENDANCE_SESSION: (sectionId: number | string) => `/api/v1/lecturer/classes/${sectionId}/attendance/session`,
    GET_ROTATING_QR: (sectionId: number | string) => `/api/v1/lecturer/classes/${sectionId}/attendance/qr-code`,
    CLOSE_ATTENDANCE_SESSION: (sectionId: number | string) => `/api/v1/lecturer/classes/${sectionId}/attendance/close-session`,
    EARLY_WARNING_SECTION: (sectionId: number | string) => `/api/v1/lecturer/early-warnings/section/${sectionId}`,
    DISPATCH_WARNINGS: '/api/v1/lecturer/early-warnings/dispatch',
    EARLY_WARNINGS: '/api/v1/lecturer/early-warnings/my-alerts',
  },
  CATALOG: {
    COURSES: '/api/v1/courses',
    SEMESTERS: '/api/v1/semesters',
    ACTIVE_SEMESTER: '/api/v1/semesters/active',
  },
  AI: {
    ADVISOR: '/api/v1/ai/academic-advisor',
  },
  ATTENDANCE: {
    CHECK_IN: '/api/v1/attendance/check-in',
  },
  NOTIFICATIONS: {
    LIST: '/api/v1/notifications',
    MARK_READ: (id: number | string) => `/api/v1/notifications/${id}/read`,
    MARK_ALL_READ: '/api/v1/notifications/read-all',
    ANNOUNCEMENTS: '/api/v1/announcements',
  },
} as const;
