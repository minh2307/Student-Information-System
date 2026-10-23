import React, { useState, useEffect, useMemo } from 'react'
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
  Layers,
  CalendarDays,
  CreditCard,
  GraduationCap,
  Bell,
  FileCheck2,
  MapPin,
  User,
  ShieldCheck
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
    upcomingClasses: [],
    semesterProgress: {
      creditsEarned: 84,
      totalRequiredCredits: 160,
      attendanceRate: 97.5,
      currentCgpa: 8.74,
      previousCgpa: 8.62,
      academicStanding: 'Xuất sắc',
    },
  })

  // Xác định thứ hôm nay
  const todayKey = useMemo(() => {
    const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    return map[new Date().getDay()]
  }, [])

  const todayLabel = useMemo(() => {
    const map = {
      MON: 'Thứ Hai',
      TUE: 'Thứ Ba',
      WED: 'Thứ Tư',
      THU: 'Thứ Năm',
      FRI: 'Thứ Sáu',
      SAT: 'Thứ Bảy',
      SUN: 'Chủ Nhật'
    }
    return map[todayKey] || 'Hôm nay'
  }, [todayKey])

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
        console.info('Sử dụng dữ liệu dashboard mặc định:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const { stats, upcomingClasses, semesterProgress } = dashboardData
  const cgpaDiff = (semesterProgress.currentCgpa - semesterProgress.previousCgpa).toFixed(2)

  // Lọc các tiết học hôm nay
  const todayClasses = useMemo(() => {
    return upcomingClasses.filter(c => c.dayOfWeek === todayKey)
  }, [upcomingClasses, todayKey])

  // Mock dữ liệu biến thiên GPA qua các kỳ để vẽ biểu đồ
  const gpaHistory = useMemo(() => [
    { semester: 'Kỳ 1', gpa: 7.8, target: 8.0 },
    { semester: 'Kỳ 2', gpa: 8.2, target: 8.0 },
    { semester: 'Kỳ 3', gpa: 8.5, target: 8.0 },
    { semester: 'Kỳ 4 (Hiện tại)', gpa: Number(semesterProgress.currentCgpa) || 8.74, target: 8.0 },
  ], [semesterProgress.currentCgpa])

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

      {/* Quick Action Shortcuts */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:inline">
          Lối tắt học vụ:
        </span>
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <Link
            to="/student/timetable"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-2xs border border-blue-200"
          >
            <CalendarDays size={15} />
            <span>Thời khóa biểu tuần</span>
          </Link>
          <Link
            to="/student/registration"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition shadow-2xs border border-indigo-200"
          >
            <BookOpen size={15} />
            <span>Đăng ký học phần</span>
          </Link>
          <Link
            to="/student/grades"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition shadow-2xs border border-emerald-200"
          >
            <GraduationCap size={15} />
            <span>Tra cứu điểm thi</span>
          </Link>
          <Link
            to="/student/tuition"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition shadow-2xs border border-amber-200"
          >
            <CreditCard size={15} />
            <span>Học phí & Công nợ</span>
          </Link>
          <Link
            to="/student/exams"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 transition shadow-2xs border border-purple-200"
          >
            <FileCheck2 size={15} />
            <span>Lịch thi học kỳ</span>
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition-colors">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Môn Đã Đăng Ký</p>
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
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Thời Lượng Học</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.weeklyClasses} <span className="text-xs font-normal text-slate-400">giờ</span></p>
            <p className="text-xs text-slate-400 mt-1">Tổng thời lượng ca học/tuần</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-amber-300 transition-colors">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chờ Xét Duyệt</p>
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
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trùng Lịch Học</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.scheduleConflicts}</p>
            <p className="text-xs mt-1 font-medium">
              {stats.scheduleConflicts > 0 ? (
                <span className="text-rose-600 flex items-center gap-1">
                  <AlertTriangle size={12} /> Cần điều chỉnh lịch!
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Lịch học hợp lệ
                </span>
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

      {/* Widget "Lịch Học Hôm Nay" */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <CalendarDays size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base">Lịch học hôm nay ({todayLabel})</h3>
              <p className="text-xs text-slate-400">Các ca học diễn ra trong ngày hiện tại</p>
            </div>
          </div>
          <Link
            to="/student/timetable"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
          >
            <span>Xem cả tuần</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {todayClasses.length === 0 ? (
          <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/60 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-300">Hôm nay bạn không có lịch học!</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Hãy tận dụng thời gian rảnh rỗi để ôn tập bài vở, làm bài tập lớn hoặc tham gia các hoạt động ngoại khóa.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayClasses.map((item) => (
              <div
                key={item.id}
                className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex items-center justify-between gap-3 hover:border-blue-500/50 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-500/30">
                      {item.courseCode}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold truncate max-w-[200px]">
                      {item.courseName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                    <span className="flex items-center gap-1 text-rose-300 font-medium">
                      <MapPin size={12} /> {item.roomName}
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={12} /> {item.lecturerName}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-amber-300 flex items-center gap-1 justify-end">
                    <Clock size={13} /> {item.startTime} - {item.endTime}
                  </div>
                  <span className="inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-500/30">
                    Sắp diễn ra
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content: Upcoming Classes & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Classes List (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Lịch học tuần này (Upcoming Classes)
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-600" />
            Tiến độ Tích lũy Cử nhân
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
            <p className="text-xs text-slate-400 mt-1 text-right">Đạt chuẩn điều kiện dự thi (&ge; 80%)</p>
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

          {/* Academic Warning / Security badge */}
          <div className="pt-2">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
              <span>Hồ sơ học vụ an toàn, không có cảnh báo học tập hoặc chuyên cần.</span>
            </div>
          </div>
        </div>
      </div>

      {/* GPA Progression SVG Line Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" />
              Biểu đồ Biến thiên Điểm GPA Qua Các Học Kỳ
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Theo dõi phong độ học tập tích lũy qua từng kỳ đào tạo</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span> Điểm GPA đạt được
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-1 bg-amber-400"></span> Ngưỡng Giỏi (8.0)
            </span>
          </div>
        </div>

        {/* Visual Chart */}
        <div className="relative h-48 w-full">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 600 160">
            {/* Grid horizontal lines */}
            <line x1="40" y1="20" x2="580" y2="20" stroke="#f1f5f9" strokeWidth="1" />
            <text x="30" y="24" fill="#94a3b8" fontSize="10" textAnchor="end">10.0</text>

            <line x1="40" y1="55" x2="580" y2="55" stroke="#fef3c7" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="30" y="59" fill="#d97706" fontSize="10" textAnchor="end">8.0</text>

            <line x1="40" y1="90" x2="580" y2="90" stroke="#f1f5f9" strokeWidth="1" />
            <text x="30" y="94" fill="#94a3b8" fontSize="10" textAnchor="end">6.0</text>

            <line x1="40" y1="125" x2="580" y2="125" stroke="#f1f5f9" strokeWidth="1" />
            <text x="30" y="129" fill="#94a3b8" fontSize="10" textAnchor="end">4.0</text>

            {/* GPA Trend Curve */}
            {/* Coordinates calculated for 4 points: x = [90, 240, 390, 530] */}
            {/* y = 160 - (gpa / 10 * 140) */}
            <defs>
              <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area under curve */}
            <path
              d="M 90,51 L 240,45 L 390,41 L 530,37.6 L 530,135 L 90,135 Z"
              fill="url(#gpaGradient)"
            />

            {/* Main Line */}
            <path
              d="M 90,51 L 240,45 L 390,41 L 530,37.6"
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points & Labels */}
            {gpaHistory.map((item, idx) => {
              const xPositions = [90, 240, 390, 530]
              const yPositions = [51, 45, 41, 37.6]
              const cx = xPositions[idx]
              const cy = yPositions[idx]

              return (
                <g key={idx}>
                  <circle cx={cx} cy={cy} r="6" fill="#ffffff" stroke="#2563eb" strokeWidth="3" />
                  <circle cx={cx} cy={cy} r="2.5" fill="#2563eb" />
                  <text
                    x={cx}
                    y={cy - 12}
                    fill="#1e293b"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {item.gpa}
                  </text>
                  <text
                    x={cx}
                    y={150}
                    fill="#64748b"
                    fontSize="11"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {item.semester}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </div>
  )
}
