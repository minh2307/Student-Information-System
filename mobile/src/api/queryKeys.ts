/**
 * Centralized TanStack Query Keys Factory
 * Provides type-safe and consistent cache keys with user-scoped isolation.
 */

export const queryKeys = {
  auth: {
    me: (userId?: number | string) => ['auth', 'me', String(userId ?? 'current')] as const,
  },
  student: {
    all: (scope?: string) => ['student', scope ?? 'current'] as const,
    dashboard: (scope?: string) => ['student', scope ?? 'current', 'dashboard'] as const,
    academicContext: (scope?: string) => ['student', scope ?? 'current', 'academicContext'] as const,
    timetable: (semester?: string, scope?: string) =>
      ['student', scope ?? 'current', 'timetable', semester ?? 'all'] as const,
    exams: (semester?: string, scope?: string) =>
      ['student', scope ?? 'current', 'exams', semester ?? 'all'] as const,
    grades: (semester?: string, scope?: string) =>
      ['student', scope ?? 'current', 'grades', semester ?? 'all'] as const,
    sections: (semester?: string, keyword?: string, scope?: string) =>
      ['student', scope ?? 'current', 'sections', { semester: semester ?? '', keyword: keyword ?? '' }] as const,
    reservations: (scope?: string) => ['student', scope ?? 'current', 'reservations'] as const,
    credential: (scope?: string) => ['student', scope ?? 'current', 'credential', 'transcript'] as const,
    tuition: (semester?: string, scope?: string) =>
      ['student', scope ?? 'current', 'tuition', semester ?? 'current'] as const,
    calendarSyncInfo: (scope?: string) => ['student', scope ?? 'current', 'calendarSyncInfo'] as const,
    alerts: (scope?: string) => ['student', scope ?? 'current', 'earlyWarnings'] as const,
  },
  lecturer: {
    all: (scope?: string) => ['lecturer', scope ?? 'current'] as const,
    classes: (semester?: string, scope?: string) =>
      ['lecturer', scope ?? 'current', 'classes', semester ?? 'all'] as const,
    classStudents: (sectionId: number | string, scope?: string) =>
      ['lecturer', scope ?? 'current', 'classes', String(sectionId), 'students'] as const,
    attendanceSession: (sectionId: number | string, scope?: string) =>
      ['lecturer', scope ?? 'current', 'classes', String(sectionId), 'attendanceSession'] as const,
    rotatingQr: (sectionId: number | string, scope?: string) =>
      ['lecturer', scope ?? 'current', 'classes', String(sectionId), 'rotatingQr'] as const,
    sectionRisks: (sectionId: number | string, scope?: string) =>
      ['lecturer', scope ?? 'current', 'classes', String(sectionId), 'sectionRisks'] as const,
    alerts: (scope?: string) => ['lecturer', scope ?? 'current', 'earlyWarnings'] as const,
  },
  catalog: {
    all: ['catalog'] as const,
    courses: (keyword?: string) => ['catalog', 'courses', keyword ?? ''] as const,
    semesters: () => ['catalog', 'semesters'] as const,
    activeSemester: () => ['catalog', 'activeSemester'] as const,
  },
  notifications: {
    list: (scope?: string) => ['notifications', scope ?? 'current', 'list'] as const,
  },
} as const;
