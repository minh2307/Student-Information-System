import React, { useState, useEffect, useMemo } from 'react'
import api from '../services/api'
import { 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  AlertTriangle,
  BookOpen,
  Filter,
  CheckCircle2,
  Loader2
} from 'lucide-react'

export const CourseRegistration = () => {
  const [semester] = useState('2024-25_SEM2')
  const [keyword, setKeyword] = useState('')
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL', 'ENROLLED', 'AVAILABLE'
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  const [availableSections, setAvailableSections] = useState([
    {
      id: 1,
      sectionCode: 'CS201-2025-01',
      courseCode: 'CS201',
      courseName: 'Data Structures and Algorithms',
      credits: 3,
      dayOfWeek: 'MON',
      startTime: '09:00',
      endTime: '10:30',
      roomName: 'Room A-204',
      maxCapacity: 40,
      currentEnrolled: 2,
      lecturerName: 'TS. Nguyễn Văn A',
      status: 'OPEN',
      isEnrolled: true,
      enrollmentId: 1,
      hasConflict: false,
    },
    {
      id: 2,
      sectionCode: 'CS301-2025-01',
      courseCode: 'CS301',
      courseName: 'Database Management Systems',
      credits: 3,
      dayOfWeek: 'TUE',
      startTime: '07:30',
      endTime: '09:00',
      roomName: 'Room B-101',
      maxCapacity: 40,
      currentEnrolled: 1,
      lecturerName: 'ThS. Trần Thị B',
      status: 'OPEN',
      isEnrolled: true,
      enrollmentId: 2,
      hasConflict: false,
    },
    {
      id: 3,
      sectionCode: 'CS401-2025-01',
      courseCode: 'CS401',
      courseName: 'Web Application Development',
      credits: 3,
      dayOfWeek: 'WED',
      startTime: '13:30',
      endTime: '15:00',
      roomName: 'Lab 3',
      maxCapacity: 35,
      currentEnrolled: 1,
      lecturerName: 'TS. Nguyễn Văn A',
      status: 'OPEN',
      isEnrolled: true,
      enrollmentId: 3,
      hasConflict: false,
    },
    {
      id: 4,
      sectionCode: 'CS402-2025-01',
      courseCode: 'CS402',
      courseName: 'Software Engineering & Agile',
      credits: 3,
      dayOfWeek: 'THU',
      startTime: '09:00',
      endTime: '10:30',
      roomName: 'Room A-301',
      maxCapacity: 40,
      currentEnrolled: 0,
      lecturerName: 'ThS. Trần Thị B',
      status: 'OPEN',
      isEnrolled: false,
      hasConflict: false,
    },
    {
      id: 5,
      sectionCode: 'AI101-2025-01',
      courseCode: 'AI101',
      courseName: 'Artificial Intelligence Basics',
      credits: 3,
      dayOfWeek: 'FRI',
      startTime: '15:15',
      endTime: '16:45',
      roomName: 'Lab 1',
      maxCapacity: 30,
      currentEnrolled: 0,
      lecturerName: 'TS. Nguyễn Văn A',
      status: 'OPEN',
      isEnrolled: false,
      hasConflict: false,
    },
  ])

  useEffect(() => {
    fetchSections()
  }, [keyword])

  const fetchSections = async () => {
    try {
      const res = await api.get(`/student/class-sections?semester=${semester}&keyword=${keyword}`)
      if (res.data?.data) {
        setAvailableSections(res.data.data)
      }
    } catch (err) {
      console.info('Using seed/mock sections:', err.message)
    }
  }

  // Calculate enrolled credits
  const enrolledSummary = useMemo(() => {
    const enrolled = availableSections.filter(s => s.isEnrolled)
    const credits = enrolled.reduce((sum, s) => sum + (s.credits || 0), 0)
    const conflicts = enrolled.filter(s => s.hasConflict).length
    return { count: enrolled.length, credits, conflicts }
  }, [availableSections])

  const filteredSections = useMemo(() => {
    return availableSections.filter(sec => {
      if (activeTab === 'ENROLLED') return sec.isEnrolled
      if (activeTab === 'AVAILABLE') return !sec.isEnrolled && sec.currentEnrolled < sec.maxCapacity
      return true
    })
  }, [availableSections, activeTab])

  const handleEnroll = async (sectionId) => {
    setMessage({ type: '', text: '' })
    setActionLoadingId(sectionId)
    try {
      const res = await api.post('/student/enrollments', { classSectionId: sectionId })
      const conflictMsg = res.data?.data?.hasConflict
        ? ' (Lưu ý: Môn học này có cảnh báo trùng lịch với ca học khác!)'
        : ''
      setMessage({ type: 'success', text: 'Đăng ký học phần thành công!' + conflictMsg })
      fetchSections()
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Không thể đăng ký học phần (Kiểm tra sĩ số, giới hạn 24 tín chỉ hoặc trùng lịch)'
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleCancelEnrollment = async (enrollmentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đăng ký lớp học phần này?')) return
    setActionLoadingId(enrollmentId)
    setMessage({ type: '', text: '' })
    try {
      await api.delete(`/student/enrollments/${enrollmentId}`)
      setMessage({ type: 'success', text: 'Đã hủy đăng ký học phần thành công!' })
      fetchSections()
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Lỗi khi hủy đăng ký'
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Đăng ký Học phần</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Cổng đăng ký tín chỉ trực tuyến — Học kỳ <span className="font-semibold text-blue-600">{semester}</span>
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mã môn, tên môn, mã lớp..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Credit limit & stats progress banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm border border-slate-700">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tín chỉ đăng ký trong kỳ</span>
            <div className="text-2xl font-bold flex items-baseline gap-2 mt-1">
              <span>{enrolledSummary.credits}</span>
              <span className="text-sm font-normal text-slate-400">/ 24 Tín chỉ tối đa</span>
            </div>
            <div className="w-full bg-slate-700/80 rounded-full h-2.5 mt-2 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  enrolledSummary.credits >= 24 ? 'bg-amber-400' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, (enrolledSummary.credits / 24) * 100)}%` }}
              />
            </div>
          </div>

          <div className="sm:border-l sm:border-slate-700 sm:pl-4">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Số môn đã đăng ký</span>
            <div className="text-2xl font-bold text-slate-100 mt-1 flex items-center gap-2">
              <BookOpen size={20} className="text-blue-400" />
              <span>{enrolledSummary.count}</span>
              <span className="text-xs font-normal text-slate-400">lớp học phần</span>
            </div>
          </div>

          <div className="sm:border-l sm:border-slate-700 sm:pl-4">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Trạng thái xung đột lịch</span>
            <div className="text-base font-semibold mt-1 flex items-center gap-2">
              {enrolledSummary.conflicts > 0 ? (
                <span className="text-rose-400 flex items-center gap-1.5 text-sm font-bold bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                  <AlertTriangle size={16} /> Có {enrolledSummary.conflicts} môn trùng lịch!
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1.5 text-sm font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 size={16} /> Lịch học hoàn toàn hợp lệ
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {message.text && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle size={20} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{message.text}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Tất cả ({availableSections.length})
        </button>
        <button
          onClick={() => setActiveTab('ENROLLED')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'ENROLLED'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Đã đăng ký ({enrolledSummary.count})
        </button>
        <button
          onClick={() => setActiveTab('AVAILABLE')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'AVAILABLE'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Còn chỗ ({availableSections.filter(s => !s.isEnrolled && s.currentEnrolled < s.maxCapacity).length})
        </button>
      </div>

      {/* Sections Table / Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
            <Filter size={16} className="text-blue-600" />
            Danh sách Lớp Học phần Khả dụng
          </h2>
          <span className="text-xs text-slate-400">
            Hiển thị {filteredSections.length} lớp học phần
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredSections.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              Không tìm thấy lớp học phần nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            filteredSections.map((sec) => {
              const isFull = sec.currentEnrolled >= sec.maxCapacity
              const isBusy = actionLoadingId === (sec.isEnrolled ? sec.enrollmentId : sec.id)

              return (
                <div 
                  key={sec.id} 
                  className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    sec.isEnrolled 
                      ? sec.hasConflict 
                        ? 'bg-rose-50/40 border-l-4 border-rose-500' 
                        : 'bg-blue-50/30 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                        {sec.courseCode}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Lớp: {sec.sectionCode}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {sec.credits} Tín chỉ
                      </span>
                      {sec.isEnrolled && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-600 text-white flex items-center gap-1">
                          <CheckCircle2 size={12} /> Đã đăng ký
                        </span>
                      )}
                      {sec.hasConflict && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <AlertTriangle size={12} /> Trùng lịch ca học
                        </span>
                      )}
                      {isFull && !sec.isEnrolled && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-500">
                          Hết chỗ
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-800">{sec.courseName}</h3>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar size={14} className="text-slate-400" />
                        Thứ: <strong className="text-slate-800">{sec.dayOfWeek}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock size={14} className="text-slate-400" />
                        {sec.startTime} - {sec.endTime}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <MapPin size={14} className="text-slate-400" />
                        Phòng: <strong className="text-slate-800">{sec.roomName}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users size={14} className="text-slate-400" />
                        Sĩ số: <strong className={isFull ? 'text-rose-600' : 'text-slate-800'}>{sec.currentEnrolled}/{sec.maxCapacity}</strong>
                      </span>
                      <span>GV: <strong className="text-slate-800">{sec.lecturerName}</strong></span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    {sec.isEnrolled ? (
                      <button
                        onClick={() => handleCancelEnrollment(sec.enrollmentId)}
                        disabled={isBusy}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        <span>Hủy môn</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnroll(sec.id)}
                        disabled={isBusy || isFull}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        <span>{isFull ? 'Hết chỗ' : 'Đăng ký ngay'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
