import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { MainLayout } from './components/MainLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastContainer } from './components/ui/ToastContainer'
import { GlobalConfirmModal } from './components/ui/GlobalConfirmModal'
import { PwaInstallPrompt } from './components/PwaInstallPrompt'

// Safe helper for lazy loading components with either default or named exports
const lazyRoute = (importer, exportName) =>
  lazy(async () => {
    const mod = await importer()
    return { default: (exportName && mod[exportName]) ? mod[exportName] : (mod.default || mod) }
  })

// ── Lazy Loaded Page Routes (Code Splitting for Production Performance) ──
const Login = lazyRoute(() => import('./pages/Login'), 'Login')
const TranscriptVerifyPage = lazyRoute(() => import('./pages/TranscriptVerifyPage'), 'TranscriptVerifyPage')
const Profile = lazyRoute(() => import('./pages/Profile'), 'Profile')
const StudentDashboard = lazyRoute(() => import('./pages/StudentDashboard'), 'StudentDashboard')
const StudentTimetable = lazyRoute(() => import('./pages/StudentTimetable'), 'StudentTimetable')
const CourseRegistration = lazyRoute(() => import('./pages/CourseRegistration'), 'CourseRegistration')
const StudentGrades = lazyRoute(() => import('./pages/StudentGrades'), 'StudentGrades')
const StudentTuition = lazyRoute(() => import('./pages/StudentTuition'), 'StudentTuition')
const StudentExams = lazyRoute(() => import('./pages/StudentExams'), 'StudentExams')
const LecturerTimetable = lazyRoute(() => import('./pages/LecturerTimetable'), 'LecturerTimetable')
const AnnouncementsPage = lazyRoute(() => import('./pages/AnnouncementsPage'), 'AnnouncementsPage')
const AdminUsers = lazyRoute(() => import('./pages/AdminUsers'), 'AdminUsers')
const AdminCourses = lazyRoute(() => import('./pages/AdminCourses'), 'AdminCourses')
const AdminSections = lazyRoute(() => import('./pages/AdminSections'), 'AdminSections')
const AdminExams = lazyRoute(() => import('./pages/AdminExams'), 'AdminExams')
const AiAdvisor = lazyRoute(() => import('./pages/AiAdvisor'), 'AiAdvisor')

// Lecturer Portal
const LecturerClassesPage = lazyRoute(() => import('./features/lecturer'), 'LecturerClassesPage')
const ClassStudentsPage = lazyRoute(() => import('./features/lecturer'), 'ClassStudentsPage')

// Lightweight fallback spinner during chunk transition
const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh] w-full" role="status" aria-label="Loading page">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-medium text-slate-500">Đang tải trang...</span>
    </div>
  </div>
)

// Error Boundary to prevent full white screen crash
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-lg font-bold text-slate-800">Gặp sự cố khi hiển thị</h2>
            <p className="text-xs text-slate-500">
              {this.state.error?.message || 'Có lỗi không mong muốn xảy ra khi dựng giao diện.'}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Tải lại trang
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.href = '/'
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

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
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer />
        <GlobalConfirmModal />
        <PwaInstallPrompt />
        <Suspense fallback={<PageFallback />}>
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
                  <Route path="/admin/exams"    element={<AdminExams />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
