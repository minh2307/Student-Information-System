import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import ScheduleOptimizerModal from '../components/ScheduleOptimizerModal'
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
  Lock,
  Timer,
  Bookmark,
  Radio,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
  RotateCcw,
  Check
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
  const [activeReservations, setActiveReservations] = useState([])
  const [optimizerModalOpen, setOptimizerModalOpen] = useState(false)
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState({})
  const [cancelModal, setCancelModal] = useState({
    open: false,
    enrollmentId: null,
    sectionCode: '',
    courseName: '',
  })

  const [availableSections, setAvailableSections] = useState([])

  // State đồng hồ đếm lùi thời gian thực mỗi 1 giây (Precision Client-side Ticking)
  const [nowTimestamp, setNowTimestamp] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Live SSE listener for real-time seat counts (EDUP-204, F-05)
  useEffect(() => {
    let eventSource = null
    try {
      eventSource = new EventSource('/api/v1/student/class-sections/live-seats')

      eventSource.addEventListener('SEAT_UPDATE', (event) => {
        try {
          const update = JSON.parse(event.data)
          
          // Hiệu ứng nhấp nháy vàng nhẹ khi có biến động sĩ số thời gian thực (EDUP-204-2)
          if (update.sectionId) {
            setRecentlyUpdatedIds(prev => ({ ...prev, [update.sectionId]: true }))
            setTimeout(() => {
              setRecentlyUpdatedIds(prev => {
                const next = { ...prev }
                delete next[update.sectionId]
                return next
              })
            }, 2500)
          }

          setAvailableSections(prev => prev.map(s => {
            if (s.id === update.sectionId) {
              return {
                ...s,
                currentEnrolled: update.currentEnrolled,
                maxCapacity: update.maxCapacity,
                availableSeats: update.availableSeats,
                reservedCount: update.reservedCount,
                _liveUpdated: true
              }
            }
            return s
          }))
        } catch (e) {
          console.error('Lỗi parse SEAT_UPDATE:', e)
        }
      })

      eventSource.addEventListener('CONNECTED', (e) => {
        console.info('SSE Live Seats connected:', e.data)
      })

      eventSource.addEventListener('HEARTBEAT', () => {
        // Heartbeat keep-alive từ server (EDUP-204-1)
      })
    } catch (e) {
      console.warn('EventSource không khả dụng:', e)
    }

    return () => {
      if (eventSource) eventSource.close()
    }
  }, [])

  // Poll / refresh active reservations
  const fetchActiveReservations = async () => {
    try {
      const res = await api.get('/student/class-sections/my-reservations')
      if (res.data?.data) {
        const enriched = res.data.data.map(item => ({
          ...item,
          targetExpiry: Date.now() + (item.remainingSeconds || 300) * 1000
        }))
        setActiveReservations(enriched)
      }
    } catch (err) {
      console.debug('Không tải được danh sách giữ chỗ:', err)
    }
  }

  useEffect(() => {
    fetchActiveReservations()
    const interval = setInterval(fetchActiveReservations, 10000)
    return () => clearInterval(interval)
  }, [])

  // Quét kiểm tra các phiên giữ chỗ hết hạn trên client-side
  const notifiedExpiredRef = useRef(new Set())
  useEffect(() => {
    if (activeReservations.length === 0) return

    const remainingItems = []
    let hasExpiredAny = false

    for (const res of activeReservations) {
      const remainingSec = Math.max(0, Math.ceil((res.targetExpiry - nowTimestamp) / 1000))
      if (remainingSec <= 0) {
        if (!notifiedExpiredRef.current.has(res.reservationId)) {
          notifiedExpiredRef.current.add(res.reservationId)
          hasExpiredAny = true
          setMessage({
            type: 'warning',
            text: `Phiên giữ chỗ lớp ${res.sectionCode} (${res.courseName}) đã hết hạn 5 phút. Vị trí đã được giải phóng lại vào hệ thống.`
          })
        }
      } else {
        remainingItems.push(res)
      }
    }

    if (hasExpiredAny) {
      setActiveReservations(remainingItems)
      fetchSections()
    }
  }, [nowTimestamp, activeReservations])

  // Định dạng thời gian đếm lùi mm:ss
  const formatCountdown = (targetExpiry) => {
    if (!targetExpiry) return '05:00'
    const totalSeconds = Math.max(0, Math.ceil((targetExpiry - nowTimestamp) / 1000))
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getRemainingSeconds = (targetExpiry) => {
    if (!targetExpiry) return 300
    return Math.max(0, Math.ceil((targetExpiry - nowTimestamp) / 1000))
  }

  // Giữ chỗ 1 lớp học phần trong 5 phút (EDUP-203, F-06)
  const handleReserveSlot = async (sectionId) => {
    setActionLoadingId(sectionId)
    setMessage({ type: '', text: '' })
    try {
      const res = await api.post(`/student/class-sections/${sectionId}/reserve`)
      if (res.data?.data) {
        const item = res.data.data
        const targetExpiry = Date.now() + (item.remainingSeconds || 300) * 1000
        setActiveReservations(prev => [
          ...prev.filter(r => r.classSectionId !== sectionId),
          { ...item, targetExpiry }
        ])
        setMessage({
          type: 'success',
          text: `Đã giữ chỗ lớp ${res.data.data.sectionCode} thành công trong 5 phút! Vui lòng bấm "Xác nhận Đăng ký" để hoàn tất.`
        })
        fetchSections()
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Không thể giữ chỗ cho lớp học phần này.'
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Hủy giữ chỗ 1 lớp
  const handleCancelReservation = async (sectionId) => {
    setActionLoadingId(sectionId)
    try {
      await api.delete(`/student/class-sections/${sectionId}/reserve`)
      setMessage({ type: 'success', text: 'Đã hủy giữ chỗ.' })
      setActiveReservations(prev => prev.filter(r => r.classSectionId !== sectionId))
      fetchSections()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Không thể hủy giữ chỗ.'
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // 1-Chạm xác nhận tất cả các lớp đang giữ chỗ
  const handleBatchEnrollHeld = async () => {
    if (activeReservations.length === 0) return
    setActionLoadingId('batch-enroll')
    setMessage({ type: '', text: '' })
    try {
      const res = await api.post('/student/class-sections/batch-enroll-reservations')
      const count = res.data?.data?.length || activeReservations.length
      setMessage({
        type: 'success',
        text: `Đã xác nhận đăng ký chính thức thành công ${count} lớp học phần!`
      })
      setActiveReservations([])
      fetchSections()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi khi xác nhận các lớp giữ chỗ.'
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // 1-Chạm hủy toàn bộ các lớp đang giữ chỗ
  const handleBatchCancelHeld = async () => {
    if (activeReservations.length === 0) return
    if (!window.confirm('Bạn có chắc chắn muốn hủy toàn bộ các lớp đang trong phiên giữ chỗ 5 phút?')) return
    setActionLoadingId('batch-cancel')
    try {
      await api.delete('/student/class-sections/my-reservations')
      setMessage({ type: 'success', text: 'Đã hủy toàn bộ các phiên giữ chỗ thành công.' })
      setActiveReservations([])
      fetchSections()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi khi hủy giữ chỗ.'
      })
    } finally {
      setActionLoadingId(null)
    }
  }

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
      if (activeTab === 'AVAILABLE') {
        const isHeldByMe = activeReservations.some(r => r.classSectionId === sec.id) || sec.isReservedByMe
        const effectiveAvailable = sec.availableSeats !== undefined 
          ? sec.availableSeats 
          : Math.max(0, (sec.maxCapacity || 0) - (sec.currentEnrolled || 0) - (sec.reservedCount || 0))
        return !sec.isEnrolled && !sec.isCompleted && (effectiveAvailable > 0 || isHeldByMe)
      }
      return true
    })
  }, [availableSections, activeTab, activeReservations])

  // Phân trang danh mục học phần: 5 học phần / trang
  const ITEMS_PER_PAGE = 5
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, keyword, semester])

  const totalPages = Math.max(1, Math.ceil(filteredSections.length / ITEMS_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const paginatedSections = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredSections.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredSections, currentPage])

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

      // Xóa phiên giữ chỗ tương ứng nếu có
      setActiveReservations(prev => prev.filter(r => r.classSectionId !== sectionId))

      // Cập nhật ngay lập tức trên UI (Optimistic Reactive Update)
      setAvailableSections((prev) =>
        prev.map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                isEnrolled: true,
                isReservedByMe: false,
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
      fetchActiveReservations()
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

  // Tìm phiên giữ chỗ sắp hết hạn nhất để hiển thị trên Floating Mini-bar
  const nearestExpiringReservation = useMemo(() => {
    if (activeReservations.length === 0) return null
    return [...activeReservations].sort((a, b) => (a.targetExpiry || 0) - (b.targetExpiry || 0))[0]
  }, [activeReservations, nowTimestamp])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
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
            Cơ chế giữ chỗ 5 phút nguyên tử & cập nhật biến động sĩ số trực tiếp qua Server-Sent Events (SSE)
          </p>
        </div>

        {/* Controls: Semester dropdown & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-800 font-mono focus:outline-none focus:border-red-600 transition"
          >
            {semestersList.map((s) => (
              <option key={s.semesterCode} value={s.semesterCode}>
                {s.semesterName} {s.isActive ? '(Hiện tại)' : ''}
              </option>
            ))}
          </select>

          <div className="relative min-w-[180px] sm:min-w-[220px]">
            <Search className="absolute left-2.5 top-2 text-stone-400" size={14} />
            <input
              type="text"
              placeholder="Mã môn, tên môn, giảng viên..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-red-600 focus:bg-white transition"
            />
          </div>

          <button
            onClick={() => setOptimizerModalOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-red-700 via-rose-700 to-amber-700 hover:from-red-800 hover:to-amber-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition shrink-0 cursor-pointer"
            title="AI Xếp Thời Khóa Biểu Tự Động (CSP Optimizer)"
          >
            <Sparkles size={14} className="text-amber-200 animate-pulse" />
            <span>AI Xếp Lịch</span>
          </button>
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
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs whitespace-nowrap self-end sm:self-auto cursor-pointer"
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
              className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <Lock size={12} />
              <span>{togglingPortal ? 'Đang đóng...' : 'Khóa cổng ĐK'}</span>
            </button>
          )}
        </div>
      )}

      {/* 3. TRUNG TÂM GIỮ CHỖ 5 PHÚT (5-Minute Slot Reservation Command Center) */}
      {activeReservations.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-50/40 to-stone-50 border-2 border-amber-300 shadow-md text-xs text-amber-950 space-y-4 animate-in fade-in slide-in-from-top-2">
          {/* Header trung tâm giữ chỗ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
                <Timer size={20} className="animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-amber-950 uppercase tracking-tight">
                    Trung Tâm Giữ Chỗ Tạm Thời 5 Phút (Slot Hold)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-200 text-amber-900 border border-amber-300">
                    {activeReservations.length} Lớp Đang Giữ
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Các vị trí học này được khóa độc quyền trong 300 giây. Vui lòng bấm Xác nhận trước khi đồng hồ về 00:00!
                </p>
              </div>
            </div>

            {/* Quick Actions hàng loạt */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                onClick={handleBatchEnrollHeld}
                disabled={actionLoadingId === 'batch-enroll'}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {actionLoadingId === 'batch-enroll' ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                <span>Xác nhận tất cả ({activeReservations.length} lớp)</span>
              </button>

              <button
                onClick={handleBatchCancelHeld}
                disabled={actionLoadingId === 'batch-cancel'}
                className="px-3 py-2 bg-white/90 hover:bg-rose-50 text-stone-600 hover:text-rose-700 border border-stone-200/90 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Hủy tất cả
              </button>
            </div>
          </div>

          {/* Grid danh sách các lớp đang giữ chỗ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeReservations.map((res) => {
              const remSec = getRemainingSeconds(res.targetExpiry)
              const countdownStr = formatCountdown(res.targetExpiry)
              const isUrgent = remSec <= 60
              const isWarning = remSec > 60 && remSec <= 120
              const progressPct = Math.min(100, Math.max(0, (remSec / 300) * 100))
              const isBusy = actionLoadingId === res.classSectionId

              return (
                <div
                  key={res.reservationId || res.classSectionId}
                  className={`bg-white rounded-xl p-3.5 border transition-all flex flex-col justify-between shadow-2xs ${
                    isUrgent
                      ? 'border-rose-400 ring-2 ring-rose-300/80 bg-rose-50/30'
                      : isWarning
                      ? 'border-amber-400 bg-amber-50/20'
                      : 'border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <div>
                    {/* Top row: Section Code & Timer Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        {res.sectionCode}
                      </span>

                      {/* Timer Display */}
                      <div
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 ${
                          isUrgent
                            ? 'bg-rose-600 text-white animate-pulse shadow-2xs'
                            : isWarning
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                        title="Thời gian giữ chỗ còn lại"
                      >
                        <Clock size={12} />
                        <span>{countdownStr}</span>
                        {isUrgent && <span className="text-[10px] font-sans">GẤP!</span>}
                      </div>
                    </div>

                    <h3 className="font-bold text-stone-900 text-xs mt-2 line-clamp-1">
                      {res.courseName}
                    </h3>

                    {/* Progress Bar đếm lùi 300s */}
                    <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          isUrgent
                            ? 'bg-rose-600'
                            : isWarning
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions for this held card */}
                  <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-stone-100">
                    <span className="text-[10px] text-stone-500 font-mono">
                      {remSec > 0 ? `Còn ~${remSec}s` : 'Đã hết hạn'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEnroll(res.classSectionId)}
                        disabled={isBusy}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs flex items-center gap-1 transition cursor-pointer"
                      >
                        {isBusy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        <span>Xác nhận</span>
                      </button>

                      <button
                        onClick={() => handleCancelReservation(res.classSectionId)}
                        disabled={isBusy}
                        className="px-2 py-1 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-[11px] font-medium transition cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Floating Sticky Mini-Timer Pill khi có giữ chỗ */}
      {activeReservations.length > 0 && nearestExpiringReservation && (
        <div className="fixed bottom-6 left-6 z-40 bg-stone-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-xl border border-stone-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 select-none">
          <div className="w-7 h-7 rounded-lg bg-amber-500 text-stone-900 flex items-center justify-center font-bold">
            <Timer size={16} className="animate-spin" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <span>Đang giữ {activeReservations.length} lớp học phần</span>
              <span className="font-mono text-white text-xs bg-stone-800 px-1.5 py-0.5 rounded border border-stone-700">
                {formatCountdown(nearestExpiringReservation.targetExpiry)}
              </span>
            </div>
            <p className="text-[10px] text-stone-400">
              Lớp {nearestExpiringReservation.sectionCode} sắp đến hạn
            </p>
          </div>

          <button
            onClick={handleBatchEnrollHeld}
            disabled={actionLoadingId === 'batch-enroll'}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition ml-2 cursor-pointer flex items-center gap-1"
          >
            <Zap size={12} />
            <span>Xác nhận ngay</span>
          </button>
        </div>
      )}

      {/* 4. Credit Limit & Enrollment Summary Banner */}
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
                  <ShieldCheck size={13} /> Lịch học hoàn toàn hợp lệ
                </span>
              )}
            </div>
            <span className="text-[11px] text-stone-500 mt-1 block">
              Hệ thống tự động rà soát va chạm lịch học trong tuần
            </span>
          </div>
        </div>
      </div>

      {/* Notifications Message Banner */}
      {message.text && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 border shadow-2xs ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : message.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle size={16} className="text-emerald-700 shrink-0" />
            ) : message.type === 'warning' ? (
              <AlertCircle size={16} className="text-amber-700 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-red-700 shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 5. Navigation Tabs & Section List */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 border-b border-stone-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`pb-3 text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'ALL'
                  ? 'border-b-2 border-red-700 text-red-700'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Tất cả lớp học phần ({availableSections.length})
            </button>
            <button
              onClick={() => setActiveTab('AVAILABLE')}
              className={`pb-3 text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'AVAILABLE'
                  ? 'border-b-2 border-red-700 text-red-700'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Chỉ lớp còn chỗ trống
            </button>
            <button
              onClick={() => setActiveTab('ENROLLED')}
              className={`pb-3 text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'ENROLLED'
                  ? 'border-b-2 border-red-700 text-red-700'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Lớp đã đăng ký ({enrolledSummary.count})
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 pb-3 text-[11px] text-stone-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Cập nhật số chỗ Live SSE</span>
          </div>
        </div>

        <div className="p-4 bg-stone-50/50 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-800 uppercase tracking-tight">
            Danh Mục Lớp Học Phần Khả Dụng
          </h2>
          <span className="text-[11px] font-mono text-stone-600">
            {filteredSections.length} lớp học phần {filteredSections.length > ITEMS_PER_PAGE && `(Trang ${currentPage}/${totalPages})`}
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
            paginatedSections.map((sec) => {
              const myReservation = activeReservations.find(r => r.classSectionId === sec.id)
              const isHeldByMe = Boolean(myReservation || sec.isReservedByMe)
              
              const reservedCount = sec.reservedCount || 0
              const effectiveAvailable = sec.availableSeats !== undefined
                ? sec.availableSeats
                : Math.max(0, (sec.maxCapacity || 0) - (sec.currentEnrolled || 0) - reservedCount)

              const isTotallyFull = sec.currentEnrolled >= sec.maxCapacity
              const isSlotLocked = effectiveAvailable <= 0 && !isHeldByMe
              const isBusy = actionLoadingId === (sec.isEnrolled ? sec.enrollmentId : sec.id)
              const wouldExceedCredits =
                !sec.isEnrolled && !sec.isCompleted && enrolledSummary.credits + (sec.credits || 0) > 24

              const isRecentlyUpdated = Boolean(recentlyUpdatedIds[sec.id])

              return (
                <div 
                  key={sec.id} 
                  className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${
                    isRecentlyUpdated
                      ? 'bg-amber-100/60 ring-2 ring-amber-400/80'
                      : isHeldByMe
                      ? 'bg-amber-50/40 border-l-4 border-amber-500 shadow-2xs'
                      : sec.isEnrolled 
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

                      {/* Trạng thái sinh viên hiện tại */}
                      {sec.isCompleted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Đã hoàn thành
                        </span>
                      ) : sec.isEnrolled ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-100 text-red-900 border border-red-200 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Đang theo học
                        </span>
                      ) : isHeldByMe ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-white shadow-2xs flex items-center gap-1 animate-pulse">
                          <Timer size={11} /> BẠN ĐANG GIỮ CHỖ ({myReservation ? formatCountdown(myReservation.targetExpiry) : '5p'})
                        </span>
                      ) : null}

                      {sec.hasConflict && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-100 text-red-900 border border-red-300 flex items-center gap-1">
                          <AlertTriangle size={11} /> Trùng ca học
                        </span>
                      )}

                      {/* Thông báo sĩ số đầy hoặc tạm khóa */}
                      {!sec.isEnrolled && !sec.isCompleted && !isHeldByMe && (
                        isTotallyFull ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-stone-500 bg-stone-100">
                            Đã kín sĩ số
                          </span>
                        ) : isSlotLocked ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-amber-800 bg-amber-100 border border-amber-300 flex items-center gap-1">
                            <Lock size={10} /> Tạm hết ({reservedCount} người đang giữ 5p)
                          </span>
                        ) : null
                      )}

                      {wouldExceedCredits && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <AlertCircle size={11} className="text-amber-600" /> Vượt hạn mức 24 TC
                        </span>
                      )}

                      {isRecentlyUpdated && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-300 text-amber-950 animate-bounce">
                          Vừa đổi sĩ số
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
                        Sĩ số: <strong className={isTotallyFull ? 'text-red-700' : 'text-stone-800'}>
                          {sec.currentEnrolled}/{sec.maxCapacity}
                        </strong>
                        <span className="text-stone-400 font-sans mx-1">•</span>
                        <span className={effectiveAvailable > 0 ? 'text-emerald-700 font-bold' : 'text-stone-500'}>
                          Còn: {effectiveAvailable} chỗ
                        </span>
                        {reservedCount > 0 && (
                          <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-semibold ml-1 inline-flex items-center gap-0.5">
                            <Timer size={10} /> {reservedCount} giữ chỗ
                          </span>
                        )}
                        {sec._liveUpdated && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-1" title="Vừa cập nhật thời gian thực" />
                        )}
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
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-red-700 hover:text-red-900 hover:bg-red-50 border border-stone-200 hover:border-red-200 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        <span>Hủy lớp</span>
                      </button>
                    ) : isHeldByMe ? (
                      <div className="flex items-center gap-1.5 bg-amber-100/80 p-1.5 rounded-xl border border-amber-300">
                        <span className="px-2 py-1 bg-amber-500 text-white rounded-lg text-[11px] font-bold font-mono flex items-center gap-1 shadow-2xs">
                          <Timer size={12} className="animate-spin" />
                          {myReservation ? formatCountdown(myReservation.targetExpiry) : 'Đang giữ'}
                        </span>
                        <button
                          onClick={() => handleEnroll(sec.id)}
                          disabled={isBusy}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          <span>Xác nhận ngay</span>
                        </button>
                        <button
                          onClick={() => handleCancelReservation(sec.id)}
                          disabled={isBusy}
                          className="px-2 py-1 text-stone-600 hover:text-rose-700 hover:bg-white rounded-lg text-xs font-medium transition cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleReserveSlot(sec.id)}
                          disabled={isBusy || isSlotLocked || isTotallyFull || !currentSemesterObj.registrationOpen || wouldExceedCredits}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition cursor-pointer"
                          title="Tạm giữ slot này trong 5 phút"
                        >
                          <Bookmark size={12} />
                          <span>Giữ chỗ 5p</span>
                        </button>

                        <button
                          onClick={() => handleEnroll(sec.id)}
                          disabled={isBusy || isSlotLocked || isTotallyFull || !currentSemesterObj.registrationOpen || wouldExceedCredits}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:bg-stone-200 disabled:text-stone-400 disabled:border-stone-200 disabled:cursor-not-allowed flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                          title={
                            !currentSemesterObj.registrationOpen
                              ? 'Cổng đăng ký đang đóng'
                              : isTotallyFull
                              ? 'Lớp đã đủ sĩ số chốt'
                              : isSlotLocked
                              ? `Tạm hết chỗ (${reservedCount} sinh viên đang trong phiên giữ chỗ)`
                              : wouldExceedCredits
                              ? `Vượt quá giới hạn 24 tín chỉ (${enrolledSummary.credits} + ${sec.credits} = ${enrolledSummary.credits + sec.credits} TC)`
                              : ''
                          }
                        >
                          {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                          <span>
                            {!currentSemesterObj.registrationOpen
                              ? 'Đã đóng ĐK'
                              : isTotallyFull
                              ? 'Hết chỗ'
                              : isSlotLocked
                              ? 'Đang giữ 5p'
                              : wouldExceedCredits
                              ? 'Vượt 24 TC'
                              : 'Đăng ký'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 6. Phân trang (Pagination) - Mỗi trang 5 học phần */}
        {filteredSections.length > ITEMS_PER_PAGE && (
          <div className="px-5 py-3.5 border-t border-stone-200/80 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-stone-600 font-sans">
              Hiển thị <strong className="text-stone-900 font-mono">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> - <strong className="text-stone-900 font-mono">{Math.min(currentPage * ITEMS_PER_PAGE, filteredSections.length)}</strong> trên tổng số <strong className="text-stone-900 font-mono">{filteredSections.length}</strong> lớp học phần
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Trước</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    totalPages > 7 &&
                    page !== 1 &&
                    page !== totalPages &&
                    Math.abs(page - currentPage) > 1
                  ) {
                    if (page === 2 || page === totalPages - 1) {
                      return <span key={page} className="px-1 text-stone-400 text-xs font-mono">...</span>
                    }
                    return null
                  }
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                        currentPage === page
                          ? 'bg-red-700 text-white font-bold shadow-2xs'
                          : 'text-stone-700 hover:bg-stone-100 border border-stone-200/60'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition cursor-pointer"
              >
                <span>Sau</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {cancelModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-700 flex items-center justify-center mb-1">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Xác nhận hủy lớp học phần</h3>
              <p className="text-xs text-stone-600 mt-1">
                Bạn có chắc chắn muốn hủy đăng ký lớp <strong className="text-stone-800">{cancelModal.sectionCode}</strong> - {cancelModal.courseName}? Hành động này sẽ trả lại chỗ cho các sinh viên khác.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCancelModal({ open: false, enrollmentId: null, sectionCode: '', courseName: '' })}
                disabled={actionLoadingId === cancelModal.enrollmentId}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                Giữ lại
              </button>
              <button
                type="button"
                onClick={() => handleCancelEnrollment(cancelModal.enrollmentId)}
                disabled={actionLoadingId === cancelModal.enrollmentId}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-700 hover:bg-red-800 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoadingId === cancelModal.enrollmentId && <Loader2 size={13} className="animate-spin" />}
                <span>Xác nhận hủy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Smart Schedule Optimizer Modal */}
      {optimizerModalOpen && (
        <ScheduleOptimizerModal
          open={optimizerModalOpen}
          onClose={() => setOptimizerModalOpen(false)}
          semester={semester}
          availableSections={availableSections}
          enrolledCredits={enrolledSummary.activeCredits || enrolledSummary.credits || 0}
          onReservationSuccess={(reservations) => {
            fetchActiveReservations()
            fetchSections()
          }}
        />
      )}
    </div>
  )
}
export default CourseRegistration
