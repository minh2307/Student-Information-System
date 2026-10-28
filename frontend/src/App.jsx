import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { Login } from './pages/Login'
import { TranscriptVerifyPage } from './pages/TranscriptVerifyPage'
import { MainLayout } from './components/MainLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Profile } from './pages/Profile'
import { StudentDashboard } from './pages/StudentDashboard'
import { StudentTimetable } from './pages/StudentTimetable'
import { CourseRegistration } from './pages/CourseRegistration'
import { StudentGrades } from './pages/StudentGrades'
import { StudentTuition } from './pages/StudentTuition'
import { StudentExams } from './pages/StudentExams'
import { LecturerTimetable } from './pages/LecturerTimetable'
import { AnnouncementsPage } from './pages/AnnouncementsPage'
import { AdminUsers } from './pages/AdminUsers'
import { AdminCourses } from './pages/AdminCourses'
import { AdminSections } from './pages/AdminSections'
import { AiAdvisor } from './pages/AiAdvisor'
import { ToastContainer } from './components/ui/ToastContainer'
import { GlobalConfirmModal } from './components/ui/GlobalConfirmModal'
import { PwaInstallPrompt } from './components/PwaInstallPrompt'

// ── Lecturer Portal ─────────────────────────────────────
import { LecturerClassesPage, ClassStudentsPage } from './features/lecturer'

// Component to redirect root to specific role dashboard
const RootRedirect = () => {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (user?.role === 'ADMIN')    return <Navigate to="/admin/users"          replace />
  if (user?.role === 'LECTURER') return <Navigate to="/lecturer/classes"     replace />
  return <Navigate to="/student/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <GlobalConfirmModal />
      <PwaInstallPrompt />
      <Routes>
        {/* Public Login & Verifiable Credentials Verification */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify/transcript" element={<TranscriptVerifyPage />} />

        {/* Protected App Shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<RootRedirect />} />

            {/* Profile Route */}
            <Route path="/profile" element={<Profile />} />

            {/* Announcements (General for all logged in roles) */}
            <Route path="/announcements" element={<AnnouncementsPage />} />

            {/* Student Portal (Role: STUDENT) */}
            <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
              <Route path="/student/dashboard"    element={<StudentDashboard />} />
              <Route path="/student/timetable"    element={<StudentTimetable />} />
              <Route path="/student/registration" element={<CourseRegistration />} />
              <Route path="/student/grades"       element={<StudentGrades />} />
              <Route path="/student/tuition"      element={<StudentTuition />} />
              <Route path="/student/exams"        element={<StudentExams />} />
              <Route path="/ai/advisor"           element={<AiAdvisor />} />
            </Route>

            {/* ── Lecturer Portal (Role: LECTURER, ADMIN) ── */}
            <Route element={<ProtectedRoute allowedRoles={['LECTURER', 'ADMIN']} />}>
              <Route path="/lecturer/classes"            element={<LecturerClassesPage />} />
              <Route path="/lecturer/classes/:sectionId" element={<ClassStudentsPage />} />
              <Route path="/lecturer/timetable"          element={<LecturerTimetable />} />
            </Route>

            {/* Admin Portal (Strictly Role: ADMIN) */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/users"    element={<AdminUsers />} />
              <Route path="/admin/courses"  element={<AdminCourses />} />
              <Route path="/admin/sections" element={<AdminSections />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
