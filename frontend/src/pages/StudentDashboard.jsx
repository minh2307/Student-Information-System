import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getRealAvatar } from '../utils/avatarUtils'
import api from '../services/api'
import StudentQrScannerModal from '../components/StudentQrScannerModal'
import { 
  BookOpen, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  TrendingUp, 
  Award, 
  ArrowRight,
  CalendarDays,
  CreditCard,
  GraduationCap,
  FileCheck2,
  MapPin,
  User,
  ShieldCheck,
  QrCode,
  Download,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react'

// Các tiết học chuẩn trường đại học
const CAMPUS_PERIODS = [
  { id: 1, label: 'Tiết 1 - 3', time: '07:00 - 09:15', startH: 7.0, endH: 9.25 },
  { id: 2, label: 'Tiết 4 - 6', time: '09:30 - 11:45', startH: 9.5, endH: 11.75 },
  { id: 3, label: 'Tiết 7 - 9', time: '13:00 - 15:15', startH: 13.0, endH: 15.25 },
  { id: 4, label: 'Tiết 10 - 12', time: '15:30 - 17:45', startH: 15.5, endH: 17.75 },
  { id: 5, label: 'Tiết 13 - 15', time: '18:00 - 20:15', startH: 18.0, endH: 20.25 },
]

export const StudentDashboard = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [activeSemester, setActiveSemester] = useState(null)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [showQrScanModal, setShowQrScanModal] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

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
      totalRequiredCredits: 135,
      attendanceRate: 97.5,
      currentCgpa: 8.74,
      previousCgpa: 8.62,
      academicStanding: 'Xuất sắc',
    },
  })
  const [academicWarnings, setAcademicWarnings] = useState([])

  // Cập nhật đồng hồ mỗi phút
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Xác định tiết học hiện tại theo thời gian thực
  const currentPeriod = useMemo(() => {
    const hours = currentTime.getHours() + currentTime.getMinutes() / 60
    return CAMPUS_PERIODS.find(p => hours >= p.startH && hours <= p.endH) || null
  }, [currentTime])

  // Xác định thứ hôm nay
  const todayKey = useMemo(() => {
    const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    return map[currentTime.getDay()]
  }, [currentTime])

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
        const [dashRes, semRes, alertRes] = await Promise.allSettled([
          api.get('/student/dashboard'),
          api.get('/semesters/active'),
          api.get('/lecturer/early-warnings/my-alerts')
        ])
        if (dashRes.status === 'fulfilled' && dashRes.value.data?.data) {
          setDashboardData(dashRes.value.data.data)
        }
        if (semRes.status === 'fulfilled' && semRes.value.data?.data) {
          setActiveSemester(semRes.value.data.data)
        }
        if (alertRes.status === 'fulfilled' && Array.isArray(alertRes.value.data?.data)) {
          setAcademicWarnings(alertRes.value.data.data.filter(w => w.riskLevel === 'CRITICAL' || w.riskLevel === 'WARNING'))
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

  // Dữ liệu biến thiên GPA qua các kỳ
  const gpaHistory = useMemo(() => [
    { semester: 'Kỳ 1 (2023)', gpa: 8.10, target: 8.0 },
    { semester: 'Kỳ 2 (2023)', gpa: 8.35, target: 8.0 },
    { semester: 'Kỳ 1 (2024)', gpa: 8.62, target: 8.0 },
    { semester: 'Kỳ 2 (Hiện tại)', gpa: Number(semesterProgress.currentCgpa) || 8.74, target: 8.0 },
  ], [semesterProgress.currentCgpa])

  const studentFullName = user?.fullName || 'Nguyễn Văn C'
  const studentCode = user?.username || 'SV2024001'

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── TOP SECTION: BESPOKE DIGITAL STUDENT IDENTITY & ACADEMIC DOSSIER ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* 1. DIGITAL STUDENT ID CARD (Thẻ Sinh Viên Điện Tử) - 5 Cols */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between h-full relative overflow-hidden group">
            {/* Top Bar inside Card: University Crest & RFID */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
              <div className="flex items-center gap-2.5">
                <img 
                  src="/images/logo.png" 
                  alt="Rikkei Logo" 
                  className="h-7 w-auto object-contain"
                  onError={(e) => {
                    e.target.src = '/images/logo.svg'
                  }}
                />
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-xs tracking-tight uppercase leading-none">
                    HỌC VIỆN CÔNG NGHỆ RIKKEI
                  </h3>
                  <span className="text-[9px] font-mono font-medium text-red-700 tracking-wider">
                    THẺ SINH VIÊN ĐIỆN TỬ
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Contactless RFID waves symbol */}
                <span className="font-mono text-[10px] text-stone-600 font-bold px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">
                  RFID • CHIP
                </span>
              </div>
            </div>

            {/* Card Body: Portrait, Info, Watermark */}
            <div className="py-4 flex gap-4 items-center relative">
              {/* Subtle Guilloche / Watermark in Background */}
              <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none w-32 h-32">
                <img src="/images/stamp-seal.svg" alt="Watermark" className="w-full h-full" />
              </div>

              {/* Student Portrait Photo */}
              <div className="relative shrink-0">
                <div className="w-24 h-32 rounded-lg border-2 border-stone-300 overflow-hidden shadow-2xs bg-stone-100 flex items-center justify-center">
                  <img
                    src={getRealAvatar(user)}
                    alt={studentFullName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = '/images/avatar-student.jpg'
                    }}
                  />
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-700 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shadow-2xs whitespace-nowrap">
                  CHÍNH QUY
                </span>
              </div>

              {/* Student Details */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div>
                  <span className="text-[10px] uppercase font-mono text-stone-600 block">Họ và tên</span>
                  <h4 className="font-bold text-sm sm:text-base text-stone-900 truncate tracking-tight uppercase">
                    {studentFullName}
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-mono text-stone-600 block">Mã số SV (MSSV)</span>
                    <span className="font-mono font-bold text-red-800 text-xs">{studentCode}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-mono text-stone-600 block">Khóa đào tạo</span>
                    <span className="font-mono font-bold text-stone-800 text-xs">K2024 (2024-2028)</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-mono text-stone-600 block">Chuyên ngành đào tạo</span>
                  <span className="text-xs font-semibold text-stone-800 block truncate">
                    Kỹ nghệ Phần mềm (SE)
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Bar: Barcode & Security Hologram */}
            <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between">
              <div>
                {/* SVG Mock Barcode */}
                <div className="font-mono text-[10px] tracking-widest text-stone-600">
                  ||||| | |||| ||||| || | |||| |||
                </div>
                <span className="text-[9px] font-mono text-stone-600">VALID THRU: 10/2028</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                  <ShieldCheck size={12} /> Hợp lệ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. ACADEMIC DOSSIER & DEGREE AUDIT (Sổ Học Vụ & Tiến Độ) - 7 Cols */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between h-full">
            <div>
              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200/80">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700">
                    Sổ Học Vụ Tích Lũy • Niên khóa 2024 - 2028
                  </span>
                  <h3 className="font-bold text-base sm:text-lg text-stone-900 tracking-tight">
                    Hồ Sơ Đào Tạo & Tiến Độ Tốt Nghiệp
                  </h3>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-100 border border-stone-200 text-stone-700 text-xs font-mono font-medium">
                  <span>Học kỳ hiện tại:</span>
                  <strong className="text-red-700">
                    {activeSemester ? activeSemester.semesterCode : '2024-SEM2'}
                  </strong>
                </div>
              </div>

              {/* 3 Academic Metrics: Tabular Numbers, Zero Slop */}
              <div className="grid grid-cols-3 gap-4 my-4 py-3 bg-stone-50/70 rounded-xl border border-stone-200/80 px-4">
                <div>
                  <span className="text-[10px] font-mono uppercase text-stone-600 block">Điểm CGPA Tích lũy</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono text-2xl font-bold text-stone-900">
                      {semesterProgress.currentCgpa}
                    </span>
                    <span className="text-stone-600 text-xs font-mono">/10.0</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-0.5">
                    Tương đương 3.52 (Hệ 4)
                  </span>
                </div>

                <div className="border-l border-stone-200 pl-4">
                  <span className="text-[10px] font-mono uppercase text-stone-600 block">Tín chỉ hoàn thành</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono text-2xl font-bold text-red-800">
                      {semesterProgress.creditsEarned}
                    </span>
                    <span className="text-stone-600 text-xs font-mono">/{semesterProgress.totalRequiredCredits} TC</span>
                  </div>
                  <span className="text-[10px] text-stone-600 font-mono mt-0.5 block">
                    Đạt {((semesterProgress.creditsEarned / semesterProgress.totalRequiredCredits) * 100).toFixed(1)}% tiến độ
                  </span>
                </div>

                <div className="border-l border-stone-200 pl-4">
                  <span className="text-[10px] font-mono uppercase text-stone-600 block">Xếp loại Học vụ</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-bold text-stone-900 mt-1 block">
                      {semesterProgress.academicStanding}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-600 font-medium mt-0.5 block">
                    Chuyên cần: <strong className="text-stone-800">{semesterProgress.attendanceRate}%</strong>
                  </span>
                </div>
              </div>

              {/* Degree Audit Breakdown (Tiến độ theo khối kiến thức) */}
              <div className="space-y-2 mt-4 text-xs">
                <div>
                  <div className="flex justify-between text-stone-700 font-medium mb-1 text-[11px]">
                    <span>Khối Kiến thức Giáo dục Đại cương (GDTC, GDQP, Triết học...)</span>
                    <span className="font-mono font-bold text-emerald-700">24 / 24 TC (100% Hoàn thành)</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-1.5">
                    <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-stone-700 font-medium mb-1 text-[11px]">
                    <span>Khối Cơ sở ngành CNTT (Cấu trúc dữ liệu, OOP, Hệ điều hành...)</span>
                    <span className="font-mono font-bold text-stone-800">36 / 40 TC (90%)</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-1.5">
                    <div className="bg-red-700 h-1.5 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-stone-700 font-medium mb-1 text-[11px]">
                    <span>Khối Chuyên ngành & Đồ án tốt nghiệp (Software Engineering)</span>
                    <span className="font-mono font-bold text-stone-800">24 / 71 TC (33.8%)</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-1.5">
                    <div className="bg-stone-400 h-1.5 rounded-full" style={{ width: '33.8%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Audit Action Bar */}
            <div className="pt-4 mt-4 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-stone-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Tình trạng công nợ: <strong className="text-stone-900">Đã quyết toán xong kỳ 2024-SEM2</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/student/registration"
                  className="px-3 py-1.5 rounded-lg bg-red-700 text-white font-medium hover:bg-red-800 transition flex items-center gap-1.5"
                >
                  <BookOpen size={13} />
                  <span>Đăng ký môn</span>
                </Link>
                <Link
                  to="/student/grades"
                  className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium transition flex items-center gap-1.5 border border-stone-200"
                >
                  <GraduationCap size={13} />
                  <span>Bảng điểm</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── ACADEMIC EARLY WARNING ALERT BANNER ── */}
      {academicWarnings.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-300 shadow-xs text-xs text-rose-950 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-2.5 text-rose-800 text-sm font-black">
              <AlertTriangle size={18} className="text-rose-600 animate-bounce shrink-0" />
              Cảnh Báo Sớm Nguy Cơ Học Vụ: Bạn có {academicWarnings.length} học phần cần chú ý khẩn cấp!
            </span>
            <span className="text-[11px] text-rose-700 font-mono font-semibold">Theo quy chế đào tạo tín chỉ</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {academicWarnings.map((w, idx) => (
              <div key={idx} className="bg-white/95 p-3.5 rounded-xl border border-rose-200 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-xs">
                    {w.courseName} <span className="font-mono text-[11px] text-slate-500">({w.sectionCode})</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${
                    w.riskLevel === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {w.riskLevel === 'CRITICAL' ? 'NGUY CƠ CẤM THI' : 'CẦN CHÚ Ý'}
                  </span>
                </div>

                <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-800 font-medium">
                  {w.riskReasons.map((r, rIdx) => (
                    <li key={rIdx}>{r}</li>
                  ))}
                </ul>

                {w.suggestions && w.suggestions.length > 0 && (
                  <div className="pt-1.5 border-t border-rose-100 text-[11px] text-slate-600">
                    <strong className="text-slate-800">Khuyến nghị: </strong>
                    {w.suggestions[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MIDDLE SECTION: TODAY'S SCHEDULE & REALTIME PERIOD CLOCK ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Today's Classes List (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-red-50 border border-red-200 text-red-700 flex items-center justify-center font-bold">
                  <CalendarDays size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                    Lịch học hôm nay ({todayLabel})
                  </h3>
                  <span className="text-[11px] text-stone-600">
                    Phân bố các ca giảng đường theo thời khóa biểu học kỳ
                  </span>
                </div>
              </div>

              <Link
                to="/student/timetable"
                className="text-xs font-semibold text-red-700 hover:text-red-900 flex items-center gap-1"
              >
                <span>Xem thời khóa biểu tuần</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {todayClasses.length === 0 ? (
              <div className="p-6 rounded-xl bg-stone-50 border border-stone-200/80 text-center my-4">
                <CheckCircle2 size={24} className="text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-stone-900 text-sm">Hôm nay không có lịch học tại giảng đường</h4>
                <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto">
                  Bạn có thể dành thời gian này để tự học tại thư viện, ôn tập học phần hoặc chuẩn bị bài tập lớn cho các ca học tiếp theo.
                </p>
              </div>
            ) : (
              <div className="space-y-3 my-2">
                {todayClasses.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white hover:border-red-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-200 text-red-800 flex flex-col items-center justify-center shrink-0">
                        <span className="font-mono text-xs font-bold leading-none">{item.startTime}</span>
                        <span className="text-[9px] text-stone-600 mt-0.5">bắt đầu</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-stone-200 text-stone-800 rounded">
                            {item.courseCode}
                          </span>
                          <h4 className="font-bold text-stone-900 text-sm">
                            {item.courseName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-stone-600 mt-1.5">
                          <span className="flex items-center gap-1 font-medium text-red-800">
                            <MapPin size={12} /> {item.roomName}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={12} /> GV: {item.lecturerName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:border-l sm:border-stone-200 sm:pl-4 shrink-0">
                      <span className="font-mono text-xs font-bold text-stone-900 block">
                        {item.startTime} - {item.endTime}
                      </span>
                      <span className="text-[10px] font-mono text-stone-600 uppercase">
                        Ca học chính khóa
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <span>Tổng số môn đã đăng ký: <strong className="text-stone-900">{stats.registeredCourses} môn ({stats.weeklyClasses} giờ/tuần)</strong></span>
            {stats.scheduleConflicts > 0 ? (
              <span className="text-red-700 font-semibold flex items-center gap-1">
                <AlertTriangle size={13} /> Có {stats.scheduleConflicts} môn trùng lịch
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <ShieldCheck size={13} /> Lịch học không bị xung đột
              </span>
            )}
          </div>
        </div>

        {/* Realtime Campus Period Indicator (4 Cols) */}
        <div className="lg:col-span-4 bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 mb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  Khung Tiết Học Chuẩn
                </h3>
                <span className="text-[11px] text-stone-600">
                  Quy định khung giờ giảng đường
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="space-y-2 mt-2">
              {CAMPUS_PERIODS.map(period => {
                const isCurrent = currentPeriod?.id === period.id
                return (
                  <div
                    key={period.id}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-red-50 border-red-300 text-red-950 font-semibold shadow-2xs'
                        : 'bg-stone-50/60 border-stone-200/80 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-red-600 animate-ping' : 'bg-stone-400'}`}></span>
                      <span className="font-bold">{period.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px]">{period.time}</span>
                      {isCurrent && (
                        <span className="text-[9px] font-mono font-bold bg-red-700 text-white px-1.5 py-0.2 rounded">
                          ĐANG DIỄN RA
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-600 mt-4">
            <span className="flex items-center gap-1.5">
              <Info size={13} className="text-stone-500 shrink-0" />
              <span>Sinh viên có mặt trước giờ học 5 phút để điểm danh vân tay / thẻ từ.</span>
            </span>
          </div>
        </div>

      </div>

      {/* ── BOTTOM SECTION: GPA PROGRESSION SVG CHART & QUICK DISPATCH ACTIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* GPA Progression SVG Chart (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100 mb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <TrendingUp size={17} className="text-red-700" />
                Biến Thiên Kết Quả Học Tập (GPA Progression)
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Bảng theo dõi điểm trung bình chung học tập qua từng học kỳ đào tạo
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-stone-800 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-700"></span> Điểm GPA đạt
              </span>
              <span className="flex items-center gap-1.5 text-stone-600">
                <span className="w-3 h-0.5 bg-amber-500"></span> Chuẩn Giỏi (8.0)
              </span>
            </div>
          </div>

          <div className="relative h-44 w-full pt-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 150">
              {/* Reference Grid lines */}
              <line x1="40" y1="15" x2="580" y2="15" stroke="#f1f5f9" strokeWidth="1" />
              <text x="32" y="19" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">10.0</text>

              {/* Benchmark 8.0 line */}
              <line x1="40" y1="45" x2="580" y2="45" stroke="#fde68a" strokeWidth="1" strokeDasharray="3 3" />
              <text x="32" y="49" fill="#d97706" fontSize="10" fontFamily="monospace" textAnchor="end">8.0</text>

              <line x1="40" y1="80" x2="580" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <text x="32" y="84" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">6.0</text>

              <line x1="40" y1="115" x2="580" y2="115" stroke="#f1f5f9" strokeWidth="1" />
              <text x="32" y="119" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">4.0</text>

              {/* GPA Curve line */}
              <path
                d="M 90,43.5 L 240,39.75 L 390,35.7 L 530,33.9"
                fill="none"
                stroke="#b91c1c"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {gpaHistory.map((item, idx) => {
                const xPositions = [90, 240, 390, 530]
                const yPositions = [43.5, 39.75, 35.7, 33.9]
                const cx = xPositions[idx]
                const cy = yPositions[idx]

                return (
                  <g key={idx}>
                    <circle cx={cx} cy={cy} r="4.5" fill="#ffffff" stroke="#b91c1c" strokeWidth="2.5" />
                    <text
                      x={cx}
                      y={cy - 10}
                      fill="#881337"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {item.gpa.toFixed(2)}
                    </text>
                    <text
                      x={cx}
                      y={135}
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="sans-serif"
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

        {/* Quick Portal Shortcuts (4 Cols) */}
        <div className="lg:col-span-4 bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-stone-900 text-sm sm:text-base pb-3 border-b border-stone-200/80 mb-3">
              Lối Tắt Xử Lý Học Vụ
            </h3>
            <div className="space-y-2">
              <Link
                to="/student/registration"
                className="p-3 rounded-xl border border-stone-200/80 hover:border-red-300 hover:bg-stone-50/70 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-red-50 text-stone-700 group-hover:text-red-700 flex items-center justify-center">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900 group-hover:text-red-800">
                      Đăng Ký Học Phần
                    </h5>
                    <p className="text-[10px] text-stone-600">Đăng ký, hủy lớp, đổi ca</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-stone-400 group-hover:text-red-700" />
              </Link>

              <Link
                to="/student/tuition"
                className="p-3 rounded-xl border border-stone-200/80 hover:border-red-300 hover:bg-stone-50/70 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-red-50 text-stone-700 group-hover:text-red-700 flex items-center justify-center">
                    <CreditCard size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900 group-hover:text-red-800">
                      Học Phí & VietQR
                    </h5>
                    <p className="text-[10px] text-stone-600">Tra cứu biểu phí & hóa đơn</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-stone-400 group-hover:text-red-700" />
              </Link>

              <Link
                to="/student/exams"
                className="p-3 rounded-xl border border-stone-200/80 hover:border-red-300 hover:bg-stone-50/70 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-red-50 text-stone-700 group-hover:text-red-700 flex items-center justify-center">
                    <FileCheck2 size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900 group-hover:text-red-800">
                      Lịch Thi & Phòng Thi
                    </h5>
                    <p className="text-[10px] text-stone-600">Xem SBD, phòng thi, ca thi</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-stone-400 group-hover:text-red-700" />
              </Link>

              <button
                onClick={() => setShowQrScanModal(true)}
                className="w-full p-3 rounded-xl border border-indigo-200/80 hover:border-indigo-400 hover:bg-indigo-50/70 transition flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <QrCode size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900 group-hover:text-indigo-800">
                      Quét QR Điểm Danh
                    </h5>
                    <p className="text-[10px] text-stone-600">Điểm danh bằng mã QR bảo mật</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-stone-400 group-hover:text-indigo-700" />
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600">
            <span>Trợ giúp trực tuyến:</span>
            <span className="font-mono font-bold text-stone-800">Hotline: 1900.6886</span>
          </div>
        </div>

      </div>

      <StudentQrScannerModal
        isOpen={showQrScanModal}
        onClose={() => setShowQrScanModal(false)}
        onSuccess={(result) => {
          setShowQrScanModal(false)
        }}
      />
    </div>
  )
}

export default StudentDashboard
