import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { 
  BookOpen, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  TrendingUp, 
  Award,
  Sparkles,
  ArrowRight,
  Layers
} from 'lucide-react'

export const StudentDashboard = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [activeSemester, setActiveSemester] = useState(null)
  const [dashboardData, setDashboardData] = useState({
    stats: {
      registeredCourses: 3,
      weeklyClasses: 12,
      pendingRegistrations: 1,
      scheduleConflicts: 0,
    },
    upcomingClasses: [
      {
        id: 1,
        courseCode: 'CS201',
        courseName: 'Data Structures and Algorithms',
        dayOfWeek: 'MON',
        startTime: '09:00',
        endTime: '10:30',
        roomName: 'Room A-204',
        lecturerName: 'TS. Nguyễn Văn A',
      },
      {
        id: 2,
        courseCode: 'CS301',
        courseName: 'Database Management Systems',
        dayOfWeek: 'TUE',
        startTime: '07:30',
        endTime: '09:00',
        roomName: 'Room B-101',
        lecturerName: 'ThS. Trần Thị B',
      },
      {
        id: 3,
        courseCode: 'CS401',
        courseName: 'Web Application Development',
        dayOfWeek: 'WED',
        startTime: '13:30',
        endTime: '15:00',
        roomName: 'Lab 3',
        lecturerName: 'TS. Nguyễn Văn A',
      },
    ],
    semesterProgress: {
      creditsEarned: 84,
      totalRequiredCredits: 160,
      attendanceRate: 97.5,
      currentCgpa: 8.74,
      previousCgpa: 8.62,
      academicStanding: 'Xuất sắc',
    },
  })

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, semRes] = await Promise.allSettled([
          api.get('/student/dashboard'),
          api.get('/semesters/active')
        ])
        if (dashRes.status === 'fulfilled' && dashRes.value.data?.data) {
          setDashboardData(dashRes.value.data.data)
        }
        if (semRes.status === 'fulfilled' && semRes.value.data?.data) {
          setActiveSemester(semRes.value.data.data)
        }
      } catch (err) {
        console.info('Using seed dashboard data:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const { stats, upcomingClasses, semesterProgress } = dashboardData
  const cgpaDiff = (semesterProgress.currentCgpa - semesterProgress.previousCgpa).toFixed(2)

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-medium mb-2">
            <Sparkles size={14} />
            <span>{activeSemester ? `${activeSemester.semesterName} (${activeSemester.semesterCode})` : 'Học kỳ 2024-25_SEM2'}</span>
          </div>
          <h1 className="text-2xl font-bold">
            Xin chào, {user?.fullName || 'Nguyễn Văn C'}!
          </h1>
          <p className="text-blue-100 text-sm mt-1">
            Mã SV: <span className="font-semibold text-white">{user?.username || 'SV2024001'}</span> • Chuyên ngành: <span className="text-white font-medium">Khoa học Máy tính (B.Tech - Computer Science)</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/10 backdrop-blur-md p-3 px-5 rounded-xl border border-white/20">
            <div className="text-xs text-blue-200">Điểm CGPA tích lũy</div>
            <div className="text-2xl font-bold flex items-center gap-2 mt-0.5">
              <span>{semesterProgress.currentCgpa}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                Number(cgpaDiff) >= 0 ? 'bg-emerald-500/25 text-emerald-200' : 'bg-rose-500/25 text-rose-200'
              }`}>
                {Number(cgpaDiff) >= 0 ? `+${cgpaDiff}` : cgpaDiff}
              </span>
            </div>
          </div>
          <Link
            to="/student/registration"
            className="hidden sm:flex items-center gap-2 px-4 py-3 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <span>Đăng ký môn</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards (FR-02) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition-colors">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Registered Courses</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.registeredCourses}</p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 size={13} /> Đã vào lớp chính thức
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-indigo-300 transition-colors">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Weekly Classes</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.weeklyClasses} <span className="text-xs font-normal text-slate-400">giờ</span></p>
            <p className="text-xs text-slate-400 mt-1">Tổng thời lượng ca học/tuần</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-amber-300 transition-colors">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Registrations</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingRegistrations}</p>
            <p className="text-xs text-amber-600 mt-1">Chờ giáo vụ duyệt tín</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar size={24} />
          </div>
        </div>

        <Link
          to="/student/registration"
          className={`bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between transition-colors ${
            stats.scheduleConflicts > 0
              ? 'border-rose-300 hover:bg-rose-50/30'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Schedule Conflicts</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.scheduleConflicts}</p>
            <p className="text-xs mt-1 font-medium">
              {stats.scheduleConflicts > 0 ? (
                <span className="text-rose-600 flex items-center gap-1">
                  <AlertTriangle size={12} /> Cần điều chỉnh lịch!
                </span>
              ) : (
                <span className="text-emerald-600">Lịch học hợp lệ</span>
              )}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            stats.scheduleConflicts > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'
          }`}>
            <AlertTriangle size={24} />
          </div>
        </Link>
      </div>

      {/* Main Content: Upcoming Classes & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Classes List (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Lịch học trong tuần (Upcoming Classes)
            </h3>
            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-semibold border border-blue-100">
              {upcomingClasses.length} môn đã xếp ca
            </span>
          </div>

          {upcomingClasses.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Layers size={24} />
              </div>
              <p className="text-sm text-slate-500">Bạn chưa có lịch học nào trong tuần này.</p>
              <Link
                to="/student/registration"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                <span>Đăng ký học phần ngay</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingClasses.map((item) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center text-blue-700 font-bold text-xs shrink-0 shadow-2xs">
                      <span className="uppercase">{item.dayOfWeek}</span>
                      <span className="text-[10px] font-medium text-blue-500">{item.startTime}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{item.courseName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mã môn: <span className="font-semibold text-slate-700">{item.courseCode}</span> • Giảng viên: <span className="text-slate-700">{item.lecturerName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {item.roomName}
                    </span>
                    <p className="text-[11px] font-medium text-slate-400 mt-1">
                      {item.startTime} - {item.endTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Semester Progress & Standing (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-600" />
            Tiến độ học kỳ & Tín chỉ
          </h3>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span>Tín chỉ tích lũy</span>
              <span className="font-bold text-slate-800">{semesterProgress.creditsEarned} / {semesterProgress.totalRequiredCredits} TC</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (semesterProgress.creditsEarned / semesterProgress.totalRequiredCredits) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-right">
              Đã hoàn thành {((semesterProgress.creditsEarned / semesterProgress.totalRequiredCredits) * 100).toFixed(1)}% chương trình đào tạo
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span>Tỷ lệ chuyên cần (Attendance)</span>
              <span className="text-emerald-600 font-bold">{semesterProgress.attendanceRate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${semesterProgress.attendanceRate}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-right">Đạt chuẩn điều kiện dự thi</p>
          </div>

          <div className="pt-3 border-t border-slate-100 p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/25">
              <Award size={22} />
            </div>
            <div>
              <div className="text-xs text-indigo-600 font-medium">Xếp loại học lực hiện tại</div>
              <div className="text-base font-bold text-indigo-950">{semesterProgress.academicStanding}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
