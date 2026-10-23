import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  BookOpen,
  Filter,
  Printer,
  ChevronLeft,
  ChevronRight,
  Grid,
  ListFilter,
  ExternalLink,
  Sparkles
} from 'lucide-react'

const DAY_MAP = [
  { key: 'MON', label: 'Thứ 2', short: 'T2', order: 1 },
  { key: 'TUE', label: 'Thứ 3', short: 'T3', order: 2 },
  { key: 'WED', label: 'Thứ 4', short: 'T4', order: 3 },
  { key: 'THU', label: 'Thứ 5', short: 'T5', order: 4 },
  { key: 'FRI', label: 'Thứ 6', short: 'T6', order: 5 },
  { key: 'SAT', label: 'Thứ 7', short: 'T7', order: 6 },
  { key: 'SUN', label: 'Chủ Nhật', short: 'CN', order: 7 },
]

const TIME_SLOTS = [
  { id: 1, name: 'Ca 1 (Sáng sớm)', period: 'Tiết 1 - 3', time: '07:00 - 09:15', startHour: 7, endHour: 9.25 },
  { id: 2, name: 'Ca 2 (Sáng chính)', period: 'Tiết 4 - 6', time: '09:30 - 11:45', startHour: 9.5, endHour: 11.75 },
  { id: 3, name: 'Ca 3 (Chiều sớm)', period: 'Tiết 7 - 9', time: '13:00 - 15:15', startHour: 13, endHour: 15.25 },
  { id: 4, name: 'Ca 4 (Chiều muộn)', period: 'Tiết 10 - 12', time: '15:30 - 17:45', startHour: 15.5, endHour: 17.75 },
  { id: 5, name: 'Ca 5 (Tối)', period: 'Tiết 13 - 15', time: '18:00 - 20:15', startHour: 18, endHour: 20.25 },
]

const COLOR_PALETTES = [
  { bg: 'bg-emerald-50/90 hover:bg-emerald-100/90', border: 'border-emerald-300', badge: 'bg-emerald-100 text-emerald-800' },
  { bg: 'bg-blue-50/90 hover:bg-blue-100/90', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-800' },
  { bg: 'bg-indigo-50/90 hover:bg-indigo-100/90', border: 'border-indigo-300', badge: 'bg-indigo-100 text-indigo-800' },
  { bg: 'bg-purple-50/90 hover:bg-purple-100/90', border: 'border-purple-300', badge: 'bg-purple-100 text-purple-800' },
  { bg: 'bg-amber-50/90 hover:bg-amber-100/90', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-800' },
  { bg: 'bg-rose-50/90 hover:bg-rose-100/90', border: 'border-rose-300', badge: 'bg-rose-100 text-rose-800' },
]

const getCourseColor = (code = '') => {
  let hash = 0
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash)
  return COLOR_PALETTES[Math.abs(hash) % COLOR_PALETTES.length]
}

const timeStringToFloat = (tStr) => {
  if (!tStr) return 0
  const parts = String(tStr).split(':')
  return parseFloat(parts[0]) + parseFloat(parts[1] || 0) / 60
}

export const LecturerTimetable = () => {
  const [semesters, setSemesters] = useState([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [weekOffset, setWeekOffset] = useState(0)

  const todayKey = useMemo(() => {
    const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    return map[new Date().getDay()]
  }, [])

  const currentWeekRange = useMemo(() => {
    const now = new Date()
    now.setDate(now.getDate() + weekOffset * 7)
    const day = now.getDay()
    const diffToMon = day === 0 ? -6 : 1 - day
    const mon = new Date(now)
    mon.setDate(now.getDate() + diffToMon)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    return `${fmt(mon)} - ${fmt(sun)}`
  }, [weekOffset])

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
        console.error('Lỗi tải danh sách học kỳ:', err)
        setSelectedSemester('2024-25_SEM2')
      }
    }
    loadSemesters()
  }, [])

  useEffect(() => {
    if (!selectedSemester) return
    const fetchClasses = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/lecturer/classes?semester=${selectedSemester}`)
        if (res.data?.data) {
          setClasses(res.data.data)
        }
      } catch (err) {
        console.error('Lỗi tải lịch dạy giảng viên:', err)
        setClasses([])
      } finally {
        setLoading(false)
      }
    }
    fetchClasses()
  }, [selectedSemester])

  const stats = useMemo(() => {
    const totalClasses = classes.length
    const totalStudents = classes.reduce((sum, c) => sum + (c.currentEnrolled || 0), 0)
    const totalCredits = classes.reduce((sum, c) => sum + (c.credits || 3), 0)
    return { totalClasses, totalStudents, totalCredits }
  }, [classes])

  const getClassesForSlot = (dayKey, slot) => {
    return classes.filter(item => {
      if (item.dayOfWeek !== dayKey) return false
      const startF = timeStringToFloat(item.startTime)
      return (startF >= slot.startHour - 0.5 && startF < slot.endHour)
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CalendarDays size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Lịch Giảng Dạy Tuần</h1>
            <p className="text-xs text-slate-500">Thời khóa biểu các lớp học phần được phân công giảng dạy</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid size={14} />
              <span>Dạng lưới</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter size={14} />
              <span>Danh sách</span>
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Printer size={15} />
            <span>In lịch dạy</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Lớp đang giảng dạy</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalClasses} lớp</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng sinh viên theo học</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalStudents} sinh viên</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng số tín chỉ phụ trách</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalCredits} TC</p>
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
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
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Clock size={15} className="text-emerald-600" />
          <span>Khoảng thời gian: <strong className="text-emerald-700">{currentWeekRange}</strong></span>
        </div>
      </div>

      {/* Timetable Body */}
      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500">Đang tải lịch giảng dạy...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-300 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-3">
            <CalendarDays size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-700">Chưa có lịch dạy trong học kỳ này</h3>
          <p className="text-xs text-slate-500 mt-1">Bạn chưa được phân công lớp học phần nào trong học kỳ {selectedSemester}.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
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
                          isToday ? 'bg-emerald-50/80 text-emerald-800' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs">{day.label}</span>
                          {isToday && (
                            <span className="inline-block px-2 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-semibold">
                              Hôm nay
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {TIME_SLOTS.map((slot) => (
                  <tr key={slot.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-3 border-r border-slate-200 bg-slate-50/50 text-center align-middle">
                      <div className="font-bold text-slate-800">{slot.name}</div>
                      <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">{slot.time}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{slot.period}</div>
                    </td>

                    {DAY_MAP.map((day) => {
                      const isToday = day.key === todayKey && weekOffset === 0
                      const matchedClasses = getClassesForSlot(day.key, slot)

                      return (
                        <td
                          key={day.key}
                          className={`p-2 border-r border-slate-200 last:border-r-0 align-top h-28 ${
                            isToday ? 'bg-emerald-50/20' : ''
                          }`}
                        >
                          {matchedClasses.length > 0 ? (
                            <div className="space-y-2">
                              {matchedClasses.map((item) => {
                                const palette = getCourseColor(item.courseCode)
                                return (
                                  <Link
                                    to={`/lecturer/classes/${item.sectionId}`}
                                    key={item.sectionId}
                                    className={`block p-2.5 rounded-xl border ${palette.border} ${palette.bg} shadow-xs transition-all transform hover:-translate-y-0.5 hover:shadow-md group`}
                                  >
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="font-extrabold text-[11px] text-slate-900 font-mono">
                                        {item.sectionCode}
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${palette.badge}`}>
                                        {item.currentEnrolled}/{item.maxCapacity} SV
                                      </span>
                                    </div>

                                    <p className="font-bold text-xs text-slate-800 line-clamp-2 leading-tight group-hover:text-emerald-700">
                                      {item.courseName}
                                    </p>

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
                                  </Link>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {classes.map((item) => (
            <div key={item.sectionId} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center font-bold text-emerald-800">
                  <span className="text-xs">{item.dayOfWeek}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {item.sectionCode}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">{item.courseCode}</span>
                    <span className="text-xs text-blue-700 font-medium">({item.credits || 3} TC)</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base mt-1">{item.courseName}</h4>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <MapPin size={13} className="text-rose-500" />
                      Phòng: {item.roomName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={13} className="text-slate-400" />
                      {item.currentEnrolled}/{item.maxCapacity} Sinh viên
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">{item.startTime} - {item.endTime}</div>
                  <div className="text-xs text-slate-400">Học kỳ {item.semesterName}</div>
                </div>
                <Link
                  to={`/lecturer/classes/${item.sectionId}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
                >
                  <span>Vào lớp</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
