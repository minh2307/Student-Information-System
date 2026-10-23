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
  const [semester, setSemester] = useState('2024-25_SEM2')
  const [semestersList, setSemestersList] = useState([])
  const [keyword, setKeyword] = useState('')
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL', 'ENROLLED', 'AVAILABLE'
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [cancelModal, setCancelModal] = useState({
    open: false,
    enrollmentId: null,
    sectionCode: '',
    courseName: '',
  })

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
    fetchSemesters()
  }, [])

  useEffect(() => {
    fetchSections()
  }, [keyword, semester])

  const fetchSemesters = async () => {
    try {
      const res = await api.get('/semesters')
      if (res.data?.data && res.data.data.length > 0) {
        setSemestersList(res.data.data)
        // Find default: first active or first registrationOpen or first in list
        const activeOrOpen = res.data.data.find(s => s.registrationOpen) || res.data.data.find(s => s.isActive) || res.data.data[0]
        if (activeOrOpen && !semester) {
          setSemester(activeOrOpen.semesterCode)
        }
      }
    } catch (e) {
      console.warn('Failed to load semesters:', e)
      setSemestersList([
        { id: 1, semesterCode: '2024-25_SEM2', semesterName: 'Học kỳ 2 (2024-2025)', isActive: true, registrationOpen: true },
        { id: 2, semesterCode: '2025-26_SEM1', semesterName: 'Học kỳ 1 (2025-2026)', isActive: false, registrationOpen: true },
      ])
    }
  }

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

  // Current selected semester object
  const currentSemesterObj = useMemo(() => {
    return semestersList.find(s => s.semesterCode === semester) || { registrationOpen: true }
  }, [semestersList, semester])

  // Calculate enrolled credits per selected semester (all registered courses in this semester)
  const enrolledSummary = useMemo(() => {
    const allSemesterEnrolled = availableSections.filter(s => s.isEnrolled || s.isCompleted)
    const activeEnrolled = availableSections.filter(s => s.isEnrolled && !s.isCompleted)
    const completedEnrolled = availableSections.filter(s => s.isCompleted)
    const totalCredits = allSemesterEnrolled.reduce((sum, s) => sum + (s.credits || 0), 0)
    const activeCredits = activeEnrolled.reduce((sum, s) => sum + (s.credits || 0), 0)
    const completedCredits = completedEnrolled.reduce((sum, s) => sum + (s.credits || 0), 0)
    const conflicts = activeEnrolled.filter(s => s.hasConflict).length
    return {
      count: allSemesterEnrolled.length,
      activeCount: activeEnrolled.length,
      completedCount: completedEnrolled.length,
      credits: totalCredits,
      activeCredits,
      completedCredits,
      conflicts,
    }
  }, [availableSections])

  const filteredSections = useMemo(() => {
    return availableSections.filter(sec => {
      if (activeTab === 'ENROLLED') return sec.isEnrolled || sec.isCompleted
      if (activeTab === 'AVAILABLE') return !sec.isEnrolled && !sec.isCompleted && sec.currentEnrolled < sec.maxCapacity
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
    setActionLoadingId(enrollmentId)
    setMessage({ type: '', text: '' })
    try {
      await api.delete(`/student/enrollments/${enrollmentId}`)
      setMessage({ type: 'success', text: 'Đã hủy đăng ký học phần thành công!' })
      setCancelModal({ open: false, enrollmentId: null, sectionCode: '', courseName: '' })
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

        {/* Controls: Semester dropdown & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Học kỳ:</span>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="text-xs font-bold text-blue-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {semestersList.map((s) => (
                <option key={s.id || s.semesterCode} value={s.semesterCode}>
                  {s.semesterName} ({s.semesterCode}){s.registrationOpen ? '' : ' - [Đã đóng ĐK]'}
                </option>
              ))}
              {semestersList.length === 0 && (
                <>
                  <option value="2024-25_SEM2">Học kỳ 2 (2024-25_SEM2)</option>
                  <option value="2025-26_SEM1">Học kỳ 1 (2025-26_SEM1)</option>
                </>
              )}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo mã môn, tên môn, mã lớp..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Notice if semester registration is closed */}
      {!currentSemesterObj.registrationOpen && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2.5 font-medium">
          <AlertCircle size={20} className="text-amber-600 shrink-0" />
          <span>
            Cổng đăng ký tín chỉ cho <strong>{currentSemesterObj.semesterName || semester}</strong> hiện đang tạm đóng. Bạn có thể xem danh sách lớp học và các môn đã đăng ký/hoàn thành nhưng không thể thêm/hủy môn mới.
          </span>
        </div>
      )}

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
                      {sec.isCompleted ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 size={12} /> Đã hoàn thành (Chốt điểm)
                        </span>
                      ) : sec.isEnrolled ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-600 text-white flex items-center gap-1">
                          <CheckCircle2 size={12} /> Đang học (Đã đăng ký)
                        </span>
                      ) : null}
                      {sec.hasConflict && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <AlertTriangle size={12} /> Trùng lịch ca học
                        </span>
                      )}
                      {isFull && !sec.isEnrolled && !sec.isCompleted && (
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
                    {sec.isCompleted ? (
                      <button
                        disabled
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 cursor-default flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} />
                        <span>Đã hoàn thành</span>
                      </button>
                    ) : sec.isEnrolled ? (
                      <button
                        onClick={() => setCancelModal({
                          open: true,
                          enrollmentId: sec.enrollmentId,
                          sectionCode: sec.sectionCode,
                          courseName: sec.courseName,
                        })}
                        disabled={isBusy}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        <span>Hủy môn</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnroll(sec.id)}
                        disabled={isBusy || isFull || !currentSemesterObj.registrationOpen}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow-sm"
                        title={!currentSemesterObj.registrationOpen ? 'Cổng đăng ký học kỳ này đang đóng' : ''}
                      >
                        {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        <span>
                          {!currentSemesterObj.registrationOpen
                            ? 'Đã đóng ĐK'
                            : isFull
                            ? 'Hết chỗ'
                            : 'Đăng ký ngay'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal Hủy học phần */}
      {cancelModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800">
                  Xác nhận hủy đăng ký học phần
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Bạn có chắc chắn muốn hủy đăng ký lớp học phần{' '}
                  <strong className="text-slate-900">{cancelModal.courseName}</strong> ({cancelModal.sectionCode}) không? Thao tác này sẽ giải phóng chỗ trong lớp và cập nhật lại số tín chỉ của bạn.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModal({ open: false, enrollmentId: null, sectionCode: '', courseName: '' })}
                disabled={actionLoadingId === cancelModal.enrollmentId}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Không, giữ lại
              </button>
              <button
                type="button"
                onClick={() => handleCancelEnrollment(cancelModal.enrollmentId)}
                disabled={actionLoadingId === cancelModal.enrollmentId}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
              >
                {actionLoadingId === cancelModal.enrollmentId ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>Xác nhận hủy môn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
