import api from '../../../services/api'

const BASE = '/lecturer'

export const lecturerApi = {
  /** GET /lecturer/classes?semester= */
  getClasses: (semester) =>
    api.get(`${BASE}/classes`, { params: semester ? { semester } : {} }),

  /** GET /lecturer/classes/:sectionId/students */
  getStudents: (sectionId) =>
    api.get(`${BASE}/classes/${sectionId}/students`),

  /** PUT /lecturer/enrollments/:enrollmentId/attendance */
  updateAttendance: (enrollmentId, attendanceRate) =>
    api.put(`${BASE}/enrollments/${enrollmentId}/attendance`, { attendanceRate }),

  /** PUT /lecturer/grades/:enrollmentId */
  updateGrade: (enrollmentId, payload) =>
    api.put(`${BASE}/grades/${enrollmentId}`, payload),

  /** POST /lecturer/classes/:sectionId/lock-grades */
  lockGrades: (sectionId) =>
    api.post(`${BASE}/classes/${sectionId}/lock-grades`),
}
