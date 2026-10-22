import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { Login } from './pages/Login'
import { MainLayout } from './components/MainLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { StudentDashboard } from './pages/StudentDashboard'
import { CourseRegistration } from './pages/CourseRegistration'
import { StudentGrades } from './pages/StudentGrades'
import { AdminUsers } from './pages/AdminUsers'
import { AdminCourses } from './pages/AdminCourses'
import { AdminSections } from './pages/AdminSections'
import { AiAdvisor } from './pages/AiAdvisor'

// ── Lecturer Portal (Hoàng Văn Lương) ─────────────────────────────────────
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
      <Routes>
        {/* Public Login */}
        <Route path="/login" element={<Login />} />

        {/* Protected App Shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<RootRedirect />} />

            {/* Student Portal */}
            <Route path="/student/dashboard"    element={<StudentDashboard />} />
            <Route path="/student/registration" element={<CourseRegistration />} />
            <Route path="/student/grades"       element={<StudentGrades />} />

            {/* ── Lecturer Portal ── */}
            <Route path="/lecturer/classes"                  element={<LecturerClassesPage />} />
            <Route path="/lecturer/classes/:sectionId"       element={<ClassStudentsPage />} />

            {/* Admin Portal */}
            <Route path="/admin/users"    element={<AdminUsers />} />
            <Route path="/admin/courses"  element={<AdminCourses />} />
            <Route path="/admin/sections" element={<AdminSections />} />

            {/* AI Advisor Chatbot */}
            <Route path="/ai/advisor" element={<AiAdvisor />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
