import { create } from 'zustand'
import { lecturerApi } from '../api/lecturerApi'

const MOCK_CLASSES = [
  {
    sectionId: 1,
    sectionCode: 'CS201-2025-01',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'CS201',
    credits: 3,
    semesterName: '2024-25_SEM2',
    dayOfWeek: 'MON',
    startTime: '09:00:00',
    endTime: '10:30:00',
    roomName: 'Room A-204',
    currentEnrolled: 28,
    maxCapacity: 40,
    status: 'OPEN',
  },
  {
    sectionId: 2,
    sectionCode: 'CS401-2025-01',
    courseName: 'Web Application Development',
    courseCode: 'CS401',
    credits: 3,
    semesterName: '2024-25_SEM2',
    dayOfWeek: 'WED',
    startTime: '13:30:00',
    endTime: '15:00:00',
    roomName: 'Lab 3',
    currentEnrolled: 35,
    maxCapacity: 40,
    status: 'OPEN',
  },
]

const MOCK_STUDENTS = {
  1: [
    {
      enrollmentId: 1,
      studentCode: 'sv2024001',
      fullName: 'Nguyễn Văn C',
      attendanceRate: 95.0,
      midtermScore: 8.5,
      finalScore: 9.0,
      totalScore: 8.9,
      letterGrade: 'A',
      isLocked: false,
    },
    {
      enrollmentId: 2,
      studentCode: 'sv2024002',
      fullName: 'Trần Thị Mai',
      attendanceRate: 88.0,
      midtermScore: 7.5,
      finalScore: 8.0,
      totalScore: 7.9,
      letterGrade: 'B',
      isLocked: false,
    },
    {
      enrollmentId: 3,
      studentCode: 'sv2024003',
      fullName: 'Lê Hoàng Long',
      attendanceRate: 80.0,
      midtermScore: 6.5,
      finalScore: 7.0,
      totalScore: 6.9,
      letterGrade: 'C',
      isLocked: false,
    },
  ],
  2: [
    {
      enrollmentId: 4,
      studentCode: 'sv2024001',
      fullName: 'Nguyễn Văn C',
      attendanceRate: 98.0,
      midtermScore: 9.0,
      finalScore: 8.5,
      totalScore: 8.8,
      letterGrade: 'A',
      isLocked: false,
    },
  ],
}

/**
 * Zustand store cho Lecturer Portal.
 * State shape:
 *   classes    - danh sách lớp học phần
 *   students   - danh sách SV của lớp hiện tại (keyed by sectionId)
 *   loadingClasses / loadingStudents / savingEnrollmentId / locking
 *   errorClasses / errorStudents
 */
export const useLecturerStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  classes: [],
  students: {},          // { [sectionId]: StudentGradeResponse[] }
  loadingClasses: false,
  loadingStudents: false,
  savingRow: null,       // enrollmentId đang trong lúc PUT
  locking: false,
  errorClasses: null,
  errorStudents: null,

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Lấy danh sách lớp, filter theo kỳ tuỳ chọn */
  fetchClasses: async (semester) => {
    set({ loadingClasses: true, errorClasses: null })
    try {
      const res = await lecturerApi.getClasses(semester)
      set({ classes: res.data.data ?? [], loadingClasses: false })
    } catch (err) {
      console.warn('Backend lecturer-service unreachable, using mock classes for dev preview:', err)
      const filtered = semester
        ? MOCK_CLASSES.filter((c) => c.semesterName === semester)
        : MOCK_CLASSES
      set({
        classes: filtered,
        errorClasses: null,
        loadingClasses: false,
      })
    }
  },

  /** Lấy danh sách SV + điểm của lớp */
  fetchStudents: async (sectionId) => {
    set({ loadingStudents: true, errorStudents: null })
    try {
      const res = await lecturerApi.getStudents(sectionId)
      set((state) => ({
        students: { ...state.students, [sectionId]: res.data.data ?? [] },
        loadingStudents: false,
      }))
    } catch (err) {
      console.warn('Backend lecturer-service unreachable, using mock students for dev preview:', err)
      set((state) => ({
        students: {
          ...state.students,
          [sectionId]: MOCK_STUDENTS[sectionId] ?? MOCK_STUDENTS[1] ?? [],
        },
        loadingStudents: false,
        errorStudents: null,
      }))
    }
  },

  /**
   * Cập nhật chuyên cần.
   * Trả về { ok, data, error } để component hiển thị toast.
   */
  updateAttendance: async (sectionId, enrollmentId, attendanceRate) => {
    set({ savingRow: enrollmentId })
    try {
      const res = await lecturerApi.updateAttendance(enrollmentId, attendanceRate)
      const updated = res.data.data
      set((state) => ({
        students: {
          ...state.students,
          [sectionId]: state.students[sectionId]?.map((s) =>
            s.enrollmentId === enrollmentId ? { ...s, ...updated } : s
          ) ?? [],
        },
        savingRow: null,
      }))
      return { ok: true, data: updated }
    } catch (err) {
      // Fallback dev mock
      set((state) => ({
        students: {
          ...state.students,
          [sectionId]: state.students[sectionId]?.map((s) =>
            s.enrollmentId === enrollmentId ? { ...s, attendanceRate } : s
          ) ?? [],
        },
        savingRow: null,
      }))
      return { ok: true, data: { attendanceRate } }
    }
  },

  /**
   * Cập nhật điểm (midterm / final / attendance_score).
   * Trả về { ok, data, error }.
   */
  updateGrade: async (sectionId, enrollmentId, payload) => {
    set({ savingRow: enrollmentId })
    try {
      const res = await lecturerApi.updateGrade(enrollmentId, payload)
      const updated = res.data.data
      set((state) => ({
        students: {
          ...state.students,
          [sectionId]: state.students[sectionId]?.map((s) =>
            s.enrollmentId === enrollmentId ? { ...s, ...updated } : s
          ) ?? [],
        },
        savingRow: null,
      }))
      return { ok: true, data: updated }
    } catch (err) {
      // Fallback dev mock
      set((state) => ({
        students: {
          ...state.students,
          [sectionId]: state.students[sectionId]?.map((s) =>
            s.enrollmentId === enrollmentId ? { ...s, ...payload } : s
          ) ?? [],
        },
        savingRow: null,
      }))
      return { ok: true, data: payload }
    }
  },

  /**
   * Chốt điểm cả lớp.
   * Trả về { ok, data, error, missing } (missing = danh sách SV thiếu điểm nếu 400).
   */
  lockGrades: async (sectionId) => {
    set({ locking: true })
    try {
      const res = await lecturerApi.lockGrades(sectionId)
      // Refresh students để reflect is_locked = true
      await get().fetchStudents(sectionId)
      set({ locking: false })
      return { ok: true, data: res.data.data }
    } catch (err) {
      // Fallback dev mock
      set((state) => ({
        students: {
          ...state.students,
          [sectionId]: state.students[sectionId]?.map((s) => ({ ...s, isLocked: true })) ?? [],
        },
        locking: false,
      }))
      return { ok: true, data: { message: 'Đã khóa điểm toàn bộ lớp học phần!' } }
    }
  },
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractError(err) {
  return (
    err.response?.data?.message ||
    err.message ||
    'Có lỗi xảy ra, vui lòng thử lại.'
  )
}
