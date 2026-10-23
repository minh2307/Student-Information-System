import React, { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
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
  Loader2,
  ShieldCheck,
  Info,
  Unlock,
  Lock
} from 'lucide-react'

export const CourseRegistration = () => {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const [semester, setSemester] = useState('2024-25_SEM2')
  const [semestersList, setSemestersList] = useState([])
  const [keyword, setKeyword] = useState('')
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL', 'ENROLLED', 'AVAILABLE'
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [togglingPortal, setTogglingPortal] = useState(false)
  const [cancelModal, setCancelModal] = useState({
    open: false,
    enrollmentId: null,
    sectionCode: '',
    courseName: '',
  })

  const [availableSections, setAvailableSections] = useState([])

  useEffect(() => {
    fetchSemesters()
  }, [])

  useEffect(() => {
    fetchSections()
  }, [semester, keyword])

  const fetchSemesters = async () => {
    try {
      const res = await api.get('/semesters')
      if (res.data?.data && res.data.data.length > 0) {
        const mapped = res.data.data.map(s => {
          const isOpen = s.isRegistrationOpen !== undefined 
            ? s.isRegistrationOpen 
            : (s.registrationOpen !== undefined ? s.registrationOpen : true)
          return {
            ...s,
            registrationOpen: Boolean(isOpen),
            isRegistrationOpen: Boolean(isOpen)
          }
        })
        setSemestersList(mapped)
        const active = mapped.find(s => s.isActive)
        if (active) {
          setSemester(active.semesterCode)
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách học kỳ:', err)
    }
  }

  const fetchSections = async () => {
    setLoading(true)
    try {
      const res = await api.get('/student/class-sections', {
        params: {
          semester,
          keyword: keyword.trim() || undefined,
        },
      })
      if (res.data?.data) {
        setAvailableSections(res.data.data)
      }
    } catch (err) {
      console.warn('Lỗi kết nối /student/class-sections, thử dự phòng /student/registration/sections:', err.message)
      try {
        const res2 = await api.get('/student/registration/sections', {
          params: {
            semester,
            keyword: keyword.trim() || undefined,
          },
        })
        if (res2.data?.data) {
          setAvailableSections(res2.data.data)
        }
      } catch (err2) {
        console.error('Không thể tải danh sách học phần:', err2.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const currentSemesterObj = useMemo(() => {
    const found = semestersList.find(s => s.semesterCode === semester)
    if (!found) {
      return {
        semesterName: semester,
        registrationOpen: true,
        isRegistrationOpen: true
      }
    }
    const isOpen = found.isRegistrationOpen !== undefined 
      ? found.isRegistrationOpen 
      : (found.registrationOpen !== undefined ? found.registrationOpen : true)
    return {
      ...found,
      registrationOpen: Boolean(isOpen),
      isRegistrationOpen: Boolean(isOpen)
    }
  }, [semestersList, semester])

  const handleToggleRegistrationPortal = async () => {
    if (!currentSemesterObj?.id) return
    setTogglingPortal(true)
    try {
      const targetState = !currentSemesterObj.registrationOpen
      await api.put(`/admin/semesters/${currentSemesterObj.id}/registration?isOpen=${targetState}&open=${targetState}`)
      setMessage({
        type: 'success',
        text: `Đã ${targetState ? 'MỞ' : 'ĐÓNG'} cổng đăng ký học phần cho ${currentSemesterObj.semesterName} thành công!`
      })
      fetchSemesters()
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Lỗi khi cập nhật trạng thái cổng đăng ký: ' + (err.response?.data?.message || err.message)
      })
    } finally {
      setTogglingPortal(false)
    }
  }

  // Tính tổng tín chỉ đã đăng ký
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

    // Kiểm tra chặn ngay phía Client nếu vượt quá giới hạn 24 tín chỉ
    const targetSec = availableSections.find((s) => s.id === sectionId)
    const targetCredits = targetSec?.credits || 0
    if (enrolledSummary.credits + targetCredits > 24) {
      setMessage({
        type: 'error',
        text: `Không thể đăng ký: Tổng số tín chỉ sẽ vượt quá giới hạn tối đa 24 tín chỉ trong học kỳ! (Hiện tại: ${enrolledSummary.credits} TC + Lớp này: ${targetCredits} TC = ${enrolledSummary.credits + targetCredits} TC)`,
      })
      return
    }

    setActionLoadingId(sectionId)
    try {
      const res = await api.post('/student/enrollments', { classSectionId: sectionId })
      const newEnrollment = res.data?.data
      const conflictMsg = newEnrollment?.hasConflict
        ? ' (Lưu ý: Ca học của lớp này bị trùng với một học phần khác đã đăng ký!)'
        : ''
      setMessage({ type: 'success', text: 'Đăng ký học phần thành công!' + conflictMsg })

      // Cập nhật ngay lập tức trên UI (Optimistic Reactive Update)
      setAvailableSections((prev) =>
        prev.map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                isEnrolled: true,
                enrollmentId: newEnrollment?.enrollmentId || newEnrollment?.id || sec.enrollmentId,
                enrollmentStatus: 'REGISTERED',
                currentEnrolled: (sec.currentEnrolled || 0) + 1,
                hasConflict: Boolean(newEnrollment?.hasConflict),
              }
            : sec
        )
      )

      // Đồng bộ ngầm với backend
      fetchSections()
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        'Không thể đăng ký học phần (Kiểm tra điều kiện tiên quyết, sĩ số hoặc giới hạn 24 tín chỉ)'
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
      setMessage({ type: 'success', text: 'Đã hủy đăng ký học phần thành công.' })
      setCancelModal({ open: false, enrollmentId: null, sectionCode: '', courseName: '' })

      // Cập nhật ngay lập tức trên UI (Optimistic Reactive Update)
      setAvailableSections((prev) =>
        prev.map((sec) =>
          sec.enrollmentId === enrollmentId
            ? {
                ...sec,
                isEnrolled: false,
                enrollmentId: null,
                enrollmentStatus: null,
                currentEnrolled: Math.max(0, (sec.currentEnrolled || 1) - 1),
                hasConflict: false,
              }
            : sec
        )
      )

      // Đồng bộ ngầm với backend
      fetchSections()
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Lỗi khi hủy đăng ký'
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Official Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700">
            Học Viện Công Nghệ Rikkei • Cổng Đăng Ký Học Phần Trực Tuyến
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
            Đăng Ký Học Phần Tín Chỉ Học Kỳ
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Lựa chọn lớp học phần theo chương trình đào tạo chuyên ngành Kỹ nghệ Phần mềm
          </p>
        </div>

        {/* Controls: Semester dropdown & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
            <Filter size={14} className="text-stone-500" />
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="bg-transparent text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer font-mono"
            >
              {semestersList.map((s) => (
                <option key={s.id || s.semesterCode} value={s.semesterCode}>
                  {s.semesterName} ({s.semesterCode}){s.registrationOpen ? '' : ' - [ĐÃ ĐÓNG]'}
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

          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo mã môn, tên môn..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-red-600 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      {/* 2. Registration Portal Status Banner */}
      {!currentSemesterObj.registrationOpen ? (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-700 shrink-0" />
            <span>
              Thời hạn đăng ký tín chỉ cho kỳ <strong>{currentSemesterObj.semesterName || semester}</strong> hiện đang tạm đóng. Bạn có thể xem danh sách lớp học và tra cứu lịch học.
            </span>
          </div>
          {isAdmin && (
            <button
              onClick={handleToggleRegistrationPortal}
              disabled={togglingPortal}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs whitespace-nowrap self-end sm:self-auto"
            >
              <Unlock size={13} />
              <span>{togglingPortal ? 'Đang mở...' : 'Mở cổng đăng ký ngay'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-900 text-xs flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              Cổng đăng ký học phần học kỳ <strong>{currentSemesterObj.semesterName || semester}</strong> đang <strong className="text-emerald-800 uppercase font-mono">MỞ</strong> cho sinh viên toàn học viện.
            </span>
          </div>
          {isAdmin && (
            <button
              onClick={handleToggleRegistrationPortal}
              disabled={togglingPortal}
              className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
            >
              <Lock size={12} />
              <span>{togglingPortal ? 'Đang đóng...' : 'Khóa cổng ĐK'}</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Credit Limit & Enrollment Summary Banner (Anti-Slop, Clean Stone) */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          <div>
            <span className="text-[10px] font-mono uppercase text-stone-600 block">Tín chỉ đăng ký trong kỳ</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`font-mono text-2xl font-bold ${enrolledSummary.credits >= 24 ? 'text-red-700' : 'text-stone-900'}`}>
                {enrolledSummary.credits}
              </span>
              <span className="font-mono text-xs text-stone-600">/ 24 Tín chỉ tối đa</span>
              {enrolledSummary.credits >= 24 && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  enrolledSummary.credits > 24 
                    ? 'bg-red-50 text-red-700 border-red-300 animate-pulse' 
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}>
                  {enrolledSummary.credits > 24 ? 'VƯỢT GIỚI HẠN' : 'ĐÃ ĐẠT GIỚI HẠN'}
                </span>
              )}
            </div>
            <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  enrolledSummary.credits > 24
                    ? 'bg-red-600'
                    : enrolledSummary.credits === 24
                    ? 'bg-amber-500'
                    : 'bg-red-700'
                }`}
                style={{ width: `${Math.min(100, (enrolledSummary.credits / 24) * 100)}%` }}
              />
            </div>
          </div>

          <div className="sm:border-l sm:border-stone-200 sm:pl-6">
            <span className="text-[10px] font-mono uppercase text-stone-600 block">Số lớp học phần đã vào</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-mono text-2xl font-bold text-stone-900">{enrolledSummary.count}</span>
              <span className="text-xs text-stone-600">lớp học phần</span>
            </div>
            <span className="text-[11px] text-stone-600 mt-1 block">
              Gồm {enrolledSummary.activeCount} lớp đang mở, {enrolledSummary.completedCount} lớp đã xong
            </span>
          </div>

          <div className="sm:border-l sm:border-stone-200 sm:pl-6">
            <span className="text-[10px] font-mono uppercase text-stone-600 block">Kiểm tra trùng ca học</span>
            <div className="mt-1">
              {enrolledSummary.conflicts > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-800 bg-red-50 px-2.5 py-1 rounded border border-red-200">
                  <AlertTriangle size={13} /> Có {enrolledSummary.conflicts} môn trùng thời khóa biểu!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  <ShieldCheck size={14} className="text-emerald-700" /> Thời khóa biểu không xung đột
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {message.text && (
        <div
          className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle size={16} className="text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-red-700 shrink-0" />
          )}
          <span className="flex-1">{message.text}</span>
        </div>
      )}

      {/* 4. Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'ALL'
              ? 'bg-stone-900 text-white font-semibold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Tất cả các lớp ({availableSections.length})
        </button>
        <button
          onClick={() => setActiveTab('ENROLLED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'ENROLLED'
              ? 'bg-stone-900 text-white font-semibold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Đã đăng ký ({enrolledSummary.count})
        </button>
        <button
          onClick={() => setActiveTab('AVAILABLE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'AVAILABLE'
              ? 'bg-stone-900 text-white font-semibold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Còn chỗ trống ({availableSections.filter(s => !s.isEnrolled && s.currentEnrolled < s.maxCapacity).length})
        </button>
      </div>

      {/* 5. Sections Table / List */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-200/80 bg-stone-50/50 flex items-center justify-between">
          <h2 className="font-bold text-stone-900 text-xs uppercase font-mono tracking-wider flex items-center gap-2">
            Danh Mục Lớp Học Phần Khả Dụng
          </h2>
          <span className="text-[11px] font-mono text-stone-600">
            {filteredSections.length} lớp học phần
          </span>
        </div>

        <div className="divide-y divide-stone-100">
          {loading && availableSections.length === 0 ? (
            <div className="p-12 text-center text-stone-500 text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 size={24} className="animate-spin text-red-700" />
              <span>Đang tải danh sách học phần...</span>
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="p-12 text-center text-stone-500 text-xs">
              Không tìm thấy lớp học phần nào phù hợp với bộ lọc tìm kiếm.
            </div>
          ) : (
            filteredSections.map((sec) => {
              const isFull = sec.currentEnrolled >= sec.maxCapacity
              const isBusy = actionLoadingId === (sec.isEnrolled ? sec.enrollmentId : sec.id)
              const wouldExceedCredits =
                !sec.isEnrolled && !sec.isCompleted && enrolledSummary.credits + (sec.credits || 0) > 24

              return (
                <div 
                  key={sec.id} 
                  className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    sec.isEnrolled 
                      ? sec.hasConflict 
                        ? 'bg-red-50/40 border-l-3 border-red-600' 
                        : 'bg-stone-50/60 border-l-3 border-red-800'
                      : 'hover:bg-stone-50/60'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-stone-200 text-stone-900">
                        {sec.courseCode}
                      </span>
                      <span className="text-xs text-stone-600 font-mono">
                        Lớp: {sec.sectionCode}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-100 text-stone-800 border border-stone-200">
                        {sec.credits} TC
                      </span>
                      {sec.isCompleted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Đã hoàn thành
                        </span>
                      ) : sec.isEnrolled ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-100 text-red-900 border border-red-200 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Đang theo học
                        </span>
                      ) : null}
                      {sec.hasConflict && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-100 text-red-900 border border-red-300 flex items-center gap-1">
                          <AlertTriangle size={11} /> Trùng ca học
                        </span>
                      )}
                      {isFull && !sec.isEnrolled && !sec.isCompleted && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-stone-500 bg-stone-100">
                          Hết chỗ
                        </span>
                      )}
                      {wouldExceedCredits && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <AlertCircle size={11} className="text-amber-600" /> Vượt hạn mức 24 TC
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-stone-900">{sec.courseName}</h3>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-600 pt-0.5 font-sans">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar size={13} className="text-stone-400" />
                        Thứ: <strong className="text-stone-800">{sec.dayOfWeek}</strong>
                      </span>
                      <span className="flex items-center gap-1 font-mono text-stone-700">
                        <Clock size={13} className="text-stone-400" />
                        {sec.startTime} - {sec.endTime}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-red-800">
                        <MapPin size={13} />
                        {sec.roomName}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Users size={13} className="text-stone-400" />
                        Sĩ số: <strong className={isFull ? 'text-red-700' : 'text-stone-800'}>{sec.currentEnrolled}/{sec.maxCapacity}</strong>
                      </span>
                      <span>GV: <strong className="text-stone-800">{sec.lecturerName}</strong></span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {sec.isCompleted ? (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-emerald-800 bg-emerald-50 border border-emerald-200">
                        Đã chốt điểm
                      </span>
                    ) : sec.isEnrolled ? (
                      <button
                        onClick={() => setCancelModal({
                          open: true,
                          enrollmentId: sec.enrollmentId,
                          sectionCode: sec.sectionCode,
                          courseName: sec.courseName,
                        })}
                        disabled={isBusy}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-red-700 hover:text-red-900 hover:bg-red-50 border border-stone-200 hover:border-red-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        <span>Hủy lớp</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnroll(sec.id)}
                        disabled={isBusy || isFull || !currentSemesterObj.registrationOpen || wouldExceedCredits}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:bg-stone-200 disabled:text-stone-400 disabled:border-stone-200 disabled:cursor-not-allowed flex items-center gap-1.5 transition shadow-2xs"
                        title={
                          !currentSemesterObj.registrationOpen
                            ? 'Cổng đăng ký đang đóng'
                            : isFull
                            ? 'Lớp đã đủ sĩ số'
                            : wouldExceedCredits
                            ? `Vượt quá giới hạn 24 tín chỉ (${enrolledSummary.credits} + ${sec.credits} = ${enrolledSummary.credits + sec.credits} TC)`
                            : ''
                        }
                      >
                        {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        <span>
                          {!currentSemesterObj.registrationOpen
                            ? 'Đã đóng ĐK'
                            : isFull
                            ? 'Hết chỗ'
                            : wouldExceedCredits
                            ? 'Vượt quá 24 TC'
                            : 'Đăng ký'}
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

      {/* Confirmation Modal */}
      {cancelModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-stone-900">
                  Xác nhận hủy lớp học phần
                </h3>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                  Bạn có chắc chắn muốn hủy đăng ký lớp học phần{' '}
                  <strong className="text-stone-900">{cancelModal.courseName}</strong> ({cancelModal.sectionCode}) không? Chỗ trống sẽ được giải phóng cho các sinh viên khác đăng ký.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCancelModal({ open: false, enrollmentId: null, sectionCode: '', courseName: '' })}
                disabled={actionLoadingId === cancelModal.enrollmentId}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-100 transition"
              >
                Giữ lại
              </button>
              <button
                type="button"
                onClick={() => handleCancelEnrollment(cancelModal.enrollmentId)}
                disabled={actionLoadingId === cancelModal.enrollmentId}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 transition shadow-2xs flex items-center gap-1.5"
              >
                {actionLoadingId === cancelModal.enrollmentId ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                <span>Xác nhận hủy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CourseRegistration
