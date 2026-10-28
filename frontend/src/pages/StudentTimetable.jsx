import React, { useState, useEffect, useMemo } from 'react'
import api from '../services/api'
import { toast } from '../store/toastStore'
import StudentQrScannerModal from '../components/StudentQrScannerModal'
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  BookOpen,
  Filter,
  Printer,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Award,
  Sparkles,
  CheckCircle2,
  ListFilter,
  Grid,
  Download,
  Copy,
  Check,
  Share2,
  X,
  Smartphone,
  QrCode
} from 'lucide-react'

// Mapping ngày trong tuần
const DAY_MAP = [
  { key: 'MON', label: 'Thứ 2', short: 'T2', order: 1 },
  { key: 'TUE', label: 'Thứ 3', short: 'T3', order: 2 },
  { key: 'WED', label: 'Thứ 4', short: 'T4', order: 3 },
  { key: 'THU', label: 'Thứ 5', short: 'T5', order: 4 },
  { key: 'FRI', label: 'Thứ 6', short: 'T6', order: 5 },
  { key: 'SAT', label: 'Thứ 7', short: 'T7', order: 6 },
  { key: 'SUN', label: 'Chủ Nhật', short: 'CN', order: 7 },
]

// Ca học chuẩn đại học
const TIME_SLOTS = [
  { id: 1, name: 'Ca 1 (Sáng sớm)', period: 'Tiết 1 - 3', time: '07:00 - 09:15', startHour: 7, endHour: 9.25 },
  { id: 2, name: 'Ca 2 (Sáng chính)', period: 'Tiết 4 - 6', time: '09:30 - 11:45', startHour: 9.5, endHour: 11.75 },
  { id: 3, name: 'Ca 3 (Chiều sớm)', period: 'Tiết 7 - 9', time: '13:00 - 15:15', startHour: 13, endHour: 15.25 },
  { id: 4, name: 'Ca 4 (Chiều muộn)', period: 'Tiết 10 - 12', time: '15:30 - 17:45', startHour: 15.5, endHour: 17.75 },
  { id: 5, name: 'Ca 5 (Tối)', period: 'Tiết 13 - 15', time: '18:00 - 20:15', startHour: 18, endHour: 20.25 },
]

// Bảng màu trực quan theo môn học (Red & Academic Palettes)
const COLOR_PALETTES = [
  { bg: 'bg-red-50/90 hover:bg-red-100/90', border: 'border-red-300', text: 'text-red-950', badge: 'bg-red-100 text-red-800 border-red-200' },
  { bg: 'bg-rose-50/90 hover:bg-rose-100/90', border: 'border-rose-300', text: 'text-rose-950', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
  { bg: 'bg-amber-50/90 hover:bg-amber-100/90', border: 'border-amber-300', text: 'text-amber-950', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  { bg: 'bg-emerald-50/90 hover:bg-emerald-100/90', border: 'border-emerald-300', text: 'text-emerald-950', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { bg: 'bg-orange-50/90 hover:bg-orange-100/90', border: 'border-orange-300', text: 'text-orange-950', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  { bg: 'bg-stone-100/90 hover:bg-stone-200/90', border: 'border-stone-300', text: 'text-stone-900', badge: 'bg-stone-200 text-stone-800 border-stone-300' },
]

const getCourseColor = (code = '') => {
  let hash = 0
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % COLOR_PALETTES.length
  return COLOR_PALETTES[index]
}

const timeStringToFloat = (tStr) => {
  if (!tStr) return 0
  const parts = tStr.split(':')
  return parseFloat(parts[0]) + parseFloat(parts[1] || 0) / 60
}

export const StudentTimetable = () => {
  const [semesters, setSemesters] = useState([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [timetable, setTimetable] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [selectedClassDetail, setSelectedClassDetail] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)

  // State đồng bộ Calendar (.ics)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncInfo, setSyncInfo] = useState(null)
  const [copying, setCopying] = useState(false)

  const openSyncModal = async () => {
    setShowSyncModal(true)
    try {
      const res = await api.get('/student/calendar/subscription-info')
      if (res.data?.data) {
        setSyncInfo(res.data.data)
      }
    } catch (err) {
      console.warn('Lỗi khi lấy thông tin subscription calendar', err)
    }
  }

  const handleDownloadIcs = () => {
    const url = `/api/v1/student/calendar/export.ics`
    window.open(url, '_blank')
    toast.success('Đang bắt đầu tải file lịch (.ics)!')
  }

  const handleCopyLink = (url) => {
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopying(true)
    toast.success('Đã sao chép link đăng ký Calendar!')
    setTimeout(() => setCopying(false), 2000)
  }

  // Dynamic QR Check-in State
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [qrTokenInput, setQrTokenInput] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkInResult, setCheckInResult] = useState(null)
  const [checkInError, setCheckInError] = useState(null)

  const handleCheckIn = async (e) => {
    if (e) e.preventDefault()
    if (!qrTokenInput.trim()) {
      setCheckInError('Vui lòng dán hoặc quét mã QR hợp lệ.')
      return
    }

    try {
      setCheckingIn(true)
      setCheckInError(null)
      const res = await api.post('/attendance/check-in', {
        qrToken: qrTokenInput.trim(),
        deviceInfo: navigator.userAgent
      })
      if (res.data?.data) {
        setCheckInResult(res.data.data)
        toast.success('Điểm danh thành công!')
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Điểm danh không thành công. Vui lòng thử lại.'
      setCheckInError(msg)
      toast.error(msg)
    } finally {
      setCheckingIn(false)
    }
  }

  // Xác định thứ hôm nay
  const todayKey = useMemo(() => {
    const day = new Date().getDay()
    // getDay: 0 is Sun, 1 is Mon, 2 is Tue ...
    const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    return map[day]
  }, [])

  // Tính ngày bắt đầu và kết thúc của tuần đang xem
  const currentWeekRange = useMemo(() => {
    const now = new Date()
    // Di chuyển theo weekOffset
    now.setDate(now.getDate() + weekOffset * 7)
    const day = now.getDay()
    const diffToMon = day === 0 ? -6 : 1 - day // thứ 2
    const mon = new Date(now)
    mon.setDate(now.getDate() + diffToMon)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)

    const format = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    return `${format(mon)} - ${format(sun)}`
  }, [weekOffset])

  // Lấy danh sách học kỳ
  useEffect(() => {
    const loadSemesters = async () => {
      try {
        const res = await api.get('/semesters')
        if (res.data?.data && res.data.data.length > 0) {
          setSemesters(res.data.data)
          const active = res.data.data.find(s => s.isActive) || res.data.data[0]
          setSelectedSemester(active.semesterCode)
        }
      } catch (err) {
        console.error('Không thể tải học kỳ:', err)
        setSelectedSemester('2024-25_SEM2')
      }
    }
    loadSemesters()
  }, [])

  // Tải thời khóa biểu khi thay đổi học kỳ
  useEffect(() => {
    if (!selectedSemester) return
    const fetchTimetable = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/student/timetable?semester=${selectedSemester}`)
        if (res.data?.data) {
          setTimetable(res.data.data)
        }
      } catch (err) {
        console.error('Lỗi tải TKB:', err)
        // Fallback demo data nếu chưa có
        setTimetable([])
      } finally {
        setLoading(false)
      }
    }
    fetchTimetable()
  }, [selectedSemester])

  // Thống kê nhanh
  const stats = useMemo(() => {
    const totalCourses = timetable.length
    const totalCredits = timetable.reduce((sum, item) => sum + (item.credits || 3), 0)
    const activeDays = new Set(timetable.map(t => t.dayOfWeek)).size
    return { totalCourses, totalCredits, activeDays }
  }, [timetable])

  // Match một lớp học vào Ca học
  const getClassesForSlot = (dayKey, slot) => {
    return timetable.filter(item => {
      if (item.dayOfWeek !== dayKey) return false
      const startF = timeStringToFloat(item.startTime)
      // Kiểm tra nếu lớp bắt đầu trong khoảng hoặc trùng với ca
      return (startF >= slot.startHour - 0.5 && startF < slot.endHour)
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
              <CalendarDays size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Thời Khóa Biểu Học Tập</h1>
              <p className="text-xs text-slate-500">Tra cứu lịch học dạng lưới trực quan theo tuần và học kỳ</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Semester Selector */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter size={15} className="text-slate-500" />
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              {semesters.map((s) => (
                <option key={s.id || s.semesterCode} value={s.semesterCode}>
                  {s.semesterName} {s.isActive ? '(Hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-red-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid size={14} />
              <span>Dạng lưới</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-red-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter size={14} />
              <span>Danh sách</span>
            </button>
          </div>

          {/* Calendar Sync Button */}
          <button
            onClick={openSyncModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-700 text-white hover:bg-red-800 transition-all shadow-sm shadow-red-700/20"
            title="Đồng bộ lịch học và lịch thi ra Google Calendar, Apple Calendar"
          >
            <Share2 size={15} />
            <span>Đồng bộ Lịch (.ics)</span>
          </button>

          {/* Quick QR Check-in Button */}
          <button
            onClick={() => {
              setCheckInResult(null)
              setCheckInError(null)
              setQrTokenInput('')
              setShowCheckInModal(true)
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20"
            title="Quét hoặc nhập mã QR điểm danh động"
          >
            <QrCode size={15} />
            <span>Điểm danh QR</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
          >
            <Printer size={15} />
            <span>In TKB</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Học phần đã đk</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalCourses} môn</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Award size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng số tín chỉ</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalCredits} TC</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CalendarDays size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Số ngày học/tuần</p>
            <p className="text-lg font-bold text-slate-900">{stats.activeDays} ngày</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Học kỳ hiển thị</p>
            <p className="text-sm font-bold text-slate-800 truncate max-w-[120px]">{selectedSemester}</p>
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title="Tuần trước"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            Tuần hiện tại
          </button>
          <button
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title="Tuần sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Clock size={15} className="text-red-600" />
          <span>Khoảng thời gian: <strong className="text-red-700">{currentWeekRange}</strong></span>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500"></span> Hôm nay
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-100 border border-red-300"></span> Có tiết học
          </span>
        </div>
      </div>

      {/* Main Timetable Content */}
      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center">
          <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500">Đang tải lịch học học kỳ...</p>
        </div>
      ) : timetable.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-300 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-3">
            <CalendarDays size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-700">Chưa có thời khóa biểu trong học kỳ này</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Bạn chưa đăng ký học phần nào cho học kỳ <span className="font-semibold">{selectedSemester}</span> hoặc các lớp đăng ký chưa được duyệt.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Visual Matrix Grid View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              {/* Header: Days of the week */}
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-3 w-36 text-center font-bold border-r border-slate-200 text-slate-500">
                    Ca / Khung Giờ
                  </th>
                  {DAY_MAP.map((day) => {
                    const isToday = day.key === todayKey && weekOffset === 0
                    return (
                      <th
                        key={day.key}
                        className={`py-3.5 px-3 text-center font-bold border-r border-slate-200 last:border-r-0 ${
                          isToday ? 'bg-red-50/80 text-red-700' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs">{day.label}</span>
                          {isToday && (
                            <span className="inline-block px-2 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-semibold shadow-xs">
                              Hôm nay
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              {/* Body: Time slots rows */}
              <tbody className="divide-y divide-slate-100 text-xs">
                {TIME_SLOTS.map((slot) => (
                  <tr key={slot.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Time slot header */}
                    <td className="py-4 px-3 border-r border-slate-200 bg-slate-50/50 text-center align-middle">
                      <div className="font-bold text-slate-800">{slot.name}</div>
                      <div className="text-[11px] font-semibold text-red-600 mt-0.5">{slot.time}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{slot.period}</div>
                    </td>

                    {/* 7 Days Columns */}
                    {DAY_MAP.map((day) => {
                      const isToday = day.key === todayKey && weekOffset === 0
                      const matchedClasses = getClassesForSlot(day.key, slot)

                      return (
                        <td
                          key={day.key}
                          className={`p-2 border-r border-slate-200 last:border-r-0 align-top h-28 transition-colors ${
                            isToday ? 'bg-red-50/20' : ''
                          }`}
                        >
                          {matchedClasses.length > 0 ? (
                            <div className="space-y-2">
                              {matchedClasses.map((item) => {
                                const palette = getCourseColor(item.courseCode)
                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => setSelectedClassDetail(item)}
                                    className={`p-2.5 rounded-xl border ${palette.border} ${palette.bg} shadow-xs cursor-pointer transition-all transform hover:-translate-y-0.5 hover:shadow-md`}
                                  >
                                    {/* Code & Credits */}
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="font-extrabold text-[11px] text-slate-900 tracking-tight">
                                        {item.courseCode}
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${palette.badge}`}>
                                        {item.credits || 3} TC
                                      </span>
                                    </div>

                                    {/* Name */}
                                    <p className="font-bold text-xs text-slate-800 line-clamp-2 leading-tight">
                                      {item.courseName}
                                    </p>

                                    {/* Room & Time */}
                                    <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                                      <div className="flex items-center gap-1 font-semibold text-slate-700">
                                        <MapPin size={12} className="text-rose-500 shrink-0" />
                                        <span className="truncate">{item.roomName}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                        <Clock size={11} className="text-slate-400 shrink-0" />
                                        <span>{item.startTime} - {item.endTime}</span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-slate-200 text-xs">
                              -
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Detailed List View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          <div className="p-4 bg-slate-50 rounded-t-2xl flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">Danh sách các lớp học phần trong kỳ ({timetable.length})</h3>
            <span className="text-xs text-slate-500 font-medium">Sắp xếp theo thứ trong tuần</span>
          </div>
          {timetable.map((item, index) => {
            const palette = getCourseColor(item.courseCode)
            const dayObj = DAY_MAP.find(d => d.key === item.dayOfWeek) || { label: item.dayOfWeek }
            return (
              <div
                key={item.id || index}
                onClick={() => setSelectedClassDetail(item)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold border ${palette.border} ${palette.bg}`}>
                    <span className="text-xs font-bold text-slate-900">{dayObj.short || item.dayOfWeek}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {item.courseCode}
                      </span>
                      {item.sectionCode && (
                        <span className="text-xs text-slate-500 font-mono">({item.sectionCode})</span>
                      )}
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {item.credits || 3} Tín chỉ
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-base mt-1">{item.courseName}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <User size={13} className="text-slate-400" />
                        {item.lecturerName || 'Chưa phân công'}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <MapPin size={13} className="text-rose-500" />
                        Phòng: {item.roomName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Clock size={14} className="text-red-600" />
                      {item.startTime} - {item.endTime}
                    </div>
                    <div className="text-xs text-slate-400">{dayObj.label} hàng tuần</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Class Section Detail Modal */}
      {selectedClassDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                Chi tiết lớp học phần
              </span>
              <button
                onClick={() => setSelectedClassDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-sm">
              <div>
                <span className="text-xs text-slate-400">Môn học:</span>
                <p className="font-bold text-base text-slate-900">{selectedClassDetail.courseName}</p>
                <p className="text-xs font-mono text-slate-500">Mã môn: {selectedClassDetail.courseCode}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400">Mã lớp HP:</span>
                  <p className="font-semibold text-slate-800">{selectedClassDetail.sectionCode || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Số tín chỉ:</span>
                  <p className="font-semibold text-slate-800">{selectedClassDetail.credits || 3} Tín chỉ</p>
                </div>
                <div>
                  <span className="text-slate-400">Thời gian học:</span>
                  <p className="font-semibold text-red-700">{selectedClassDetail.startTime} - {selectedClassDetail.endTime}</p>
                </div>
                <div>
                  <span className="text-slate-400">Phòng học:</span>
                  <p className="font-semibold text-rose-600">{selectedClassDetail.roomName}</p>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400">Giảng viên giảng dạy:</span>
                <p className="font-semibold text-slate-800 flex items-center gap-2 mt-0.5">
                  <User size={15} className="text-red-600" />
                  {selectedClassDetail.lecturerName || 'Chưa cập nhật'}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-400">Học kỳ:</span>
                <p className="font-semibold text-slate-800">{selectedClassDetail.semesterName || selectedSemester}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedClassDetail(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đồng Bộ Calendar */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
                  <Share2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Đồng Bộ Lịch Học & Lịch Thi</h3>
                  <p className="text-[11px] text-slate-500">Google Calendar, Apple Calendar, Outlook</p>
                </div>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Cách 1: Tải file .ics */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Download size={14} className="text-red-700" />
                    Cách 1: Tải file lịch (.ics)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tải file về máy để import vào máy tính hoặc điện thoại
                  </p>
                </div>
                <button
                  onClick={handleDownloadIcs}
                  className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 hover:border-red-300 rounded-xl text-xs font-bold transition shadow-2xs shrink-0 flex items-center gap-1.5"
                >
                  <Download size={13} />
                  <span>Tải về .ics</span>
                </button>
              </div>

              {/* Cách 2: Link Subscription tự động cập nhật */}
              <div className="p-4 rounded-xl bg-red-50/50 border border-red-100 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                    <Smartphone size={14} className="text-red-700" />
                    Cách 2: Đăng ký Link Tự Động Đồng Bộ (Khuyên Dùng)
                  </h4>
                  <p className="text-[11px] text-red-900/80 mt-0.5">
                    Lịch trên điện thoại sẽ tự động cập nhật khi giảng viên đổi phòng hoặc có lịch thi mới!
                  </p>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-red-200/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-700 truncate select-all">
                    {syncInfo?.subscriptionUrl || 'Đang tạo link...'}
                  </span>
                  <button
                    onClick={() => handleCopyLink(syncInfo?.subscriptionUrl)}
                    className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs shrink-0"
                  >
                    {copying ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copying ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>

                {/* Hướng dẫn ngắn */}
                <div className="text-[11px] text-slate-600 space-y-1.5 pt-1 border-t border-red-100/60 font-sans">
                  <p className="flex items-start gap-1.5">
                    <span className="font-bold text-red-800">• Google Calendar:</span>
                    <span>Cài đặt &gt; Thêm lịch &gt; Từ URL &gt; Dán link đã chép.</span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span className="font-bold text-red-800">• iPhone / Mac:</span>
                    <span>Mở ứng dụng Lịch &gt; Thêm lịch đăng ký &gt; Dán link.</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* QR Check-in Camera & Manual Modal */}
      <StudentQrScannerModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onSuccess={(result) => {
          toast.success(`Điểm danh thành công môn ${result.courseName}!`)
        }}
      />
    </div>
  )
}
