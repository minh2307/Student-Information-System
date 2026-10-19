import React, { useState, useEffect } from 'react'
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
  Sparkles 
} from 'lucide-react'

export const StudentDashboard = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
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
        const res = await api.get('/student/dashboard')
        if (res.data?.data) {
          setDashboardData(res.data.data)
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

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-medium mb-2">
            <Sparkles size={14} />
            <span>Học kỳ 2024-25_SEM2</span>
          </div>
          <h1 className="text-2xl font-bold">
            Xin chào, {user?.fullName || 'Sinh viên'}!
          </h1>
          <p className="text-blue-100 text-sm mt-1">
            Mã SV: <span className="font-semibold">{user?.username || 'SV2024001'}</span> | Ngành: Computer Science
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 px-4 rounded-xl border border-white/20">
          <div>
            <div className="text-xs text-blue-200">Điểm CGPA tích lũy</div>
            <div className="text-2xl font-bold flex items-center gap-1.5">
              <span>{semesterProgress.currentCgpa}</span>
              <span className="text-xs text-emerald-300 font-semibold bg-emerald-500/20 px-2 py-0.5 rounded-full">
                +{(semesterProgress.currentCgpa - semesterProgress.previousCgpa).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards (FR-02) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Registered Courses</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.registeredCourses}</p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> Đã vào lớp chính thức
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Weekly Classes</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.weeklyClasses} <span className="text-xs font-normal text-slate-400">giờ</span></p>
            <p className="text-xs text-slate-400 mt-1">Tổng thời lượng/tuần</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Registrations</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingRegistrations}</p>
            <p className="text-xs text-amber-500 mt-1">Chờ giáo vụ duyệt</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Schedule Conflicts</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.scheduleConflicts}</p>
            <p className="text-xs text-slate-400 mt-1">
              {stats.scheduleConflicts > 0 ? 'Cần xử lý trùng lịch' : 'Lịch học hợp lệ'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </div>
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
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
              3 môn đã xếp ca
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {upcomingClasses.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex flex-col items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                    <span>{item.dayOfWeek}</span>
                    <span className="text-[10px] font-normal text-blue-500">{item.startTime}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{item.courseName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Mã môn: <span className="font-medium text-slate-700">{item.courseCode}</span> • GV: {item.lecturerName}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                    {item.roomName}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {item.startTime} - {item.endTime}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
              <span>{semesterProgress.creditsEarned} / {semesterProgress.totalRequiredCredits} TC</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${(semesterProgress.creditsEarned / semesterProgress.totalRequiredCredits) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-right">
              Đã hoàn thành {((semesterProgress.creditsEarned / semesterProgress.totalRequiredCredits) * 100).toFixed(1)}% chương trình
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
          </div>

          <div className="pt-3 border-t border-slate-100 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Award size={22} />
            </div>
            <div>
              <div className="text-xs text-slate-500">Xếp loại học lực</div>
              <div className="text-sm font-bold text-slate-800">{semesterProgress.academicStanding}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
