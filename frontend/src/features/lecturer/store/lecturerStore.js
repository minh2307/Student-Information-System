import { create } from 'zustand'
import { lecturerApi } from '../api/lecturerApi'

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
      set({
        errorClasses: extractError(err),
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
      set({
        errorStudents: extractError(err),
        loadingStudents: false,
      })
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
      set({ savingRow: null })
      return { ok: false, error: extractError(err), statusCode: err.response?.status }
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
      set({ savingRow: null })
      return { ok: false, error: extractError(err), statusCode: err.response?.status }
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
      set({ locking: false })
      const missing = err.response?.data?.data?.missingStudents ?? []
      return {
        ok: false,
        error: extractError(err),
        statusCode: err.response?.status,
        missing,
      }
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
