import React, { useState, useMemo, useEffect } from 'react'
import {
  Sparkles,
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  ShieldCheck,
  Bookmark,
  Users,
  Loader2,
  Check,
  HelpCircle,
  ThumbsUp,
  Grid,
  List,
  MapPin,
  Award,
  Lock
} from 'lucide-react'
import api from '../services/api'
import { toast } from '../store/toastStore'

// Danh sách các ngày trong tuần
const DAY_COLUMNS = [
  { key: 'MON', label: 'Thứ 2', short: 'T2' },
  { key: 'TUE', label: 'Thứ 3', short: 'T3' },
  { key: 'WED', label: 'Thứ 4', short: 'T4' },
  { key: 'THU', label: 'Thứ 5', short: 'T5' },
  { key: 'FRI', label: 'Thứ 6', short: 'T6' },
  { key: 'SAT', label: 'Thứ 7', short: 'T7' },
  { key: 'SUN', label: 'Chủ Nhật', short: 'CN' }
]

// Ca học chuẩn đại học
const TIME_PERIODS = [
  { id: 'CA_1', name: 'Ca 1 (Sáng sớm)', time: '07:00 - 09:15', startHour: 7.0, endHour: 9.25 },
  { id: 'CA_2', name: 'Ca 2 (Sáng chính)', time: '09:30 - 11:45', startHour: 9.5, endHour: 11.75 },
  { id: 'CA_3', name: 'Ca 3 (Chiều sớm)', time: '13:00 - 15:15', startHour: 13.0, endHour: 15.25 },
  { id: 'CA_4', name: 'Ca 4 (Chiều muộn)', time: '15:30 - 17:45', startHour: 15.5, endHour: 17.75 },
  { id: 'CA_5', name: 'Ca 5 (Tối)', time: '18:00 - 20:15', startHour: 18.0, endHour: 20.25 }
]

// Bảng màu trực quan theo môn học
const COURSE_PALETTES = [
  { bg: 'bg-emerald-50 border-emerald-300 text-emerald-950', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { bg: 'bg-blue-50 border-blue-300 text-blue-950', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
  { bg: 'bg-amber-50 border-amber-300 text-amber-950', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  { bg: 'bg-purple-50 border-purple-300 text-purple-950', badge: 'bg-purple-100 text-purple-800 border-purple-300' },
  { bg: 'bg-rose-50 border-rose-300 text-rose-950', badge: 'bg-rose-100 text-rose-800 border-rose-300' },
  { bg: 'bg-cyan-50 border-cyan-300 text-cyan-950', badge: 'bg-cyan-100 text-cyan-800 border-cyan-300' }
]

const parseHour = (timeStr) => {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  return parseInt(parts[0], 10) + (parseInt(parts[1] || '0', 10) / 60)
}

export const ScheduleOptimizerModal = ({
  open,
  onClose,
  semester,
  availableSections = [],
  enrolledCredits = 0,
  onReservationSuccess
}) => {
  // Fallback tải danh sách lớp nếu props rỗng
  const [internalSections, setInternalSections] = useState([])
  const [coursesCatalog, setCoursesCatalog] = useState([])
  const [loadingCourses, setLoadingCourses] = useState(false)

  useEffect(() => {
    if (open) {
      setLoadingCourses(true)
      api.get('/courses')
        .then(res => {
          if (res.data?.data) {
            setCoursesCatalog(res.data.data)
          }
        })
        .catch(err => console.debug('Could not auto-fetch courses catalog', err))
        .finally(() => setLoadingCourses(false))
    }
  }, [open])

  useEffect(() => {
    if ((!availableSections || availableSections.length === 0) && open) {
      api.get('/student/class-sections', { params: { semester } })
        .then(res => {
          if (res.data?.data) {
            setInternalSections(res.data.data)
          }
        })
        .catch(err => console.debug('Could not auto-fetch sections in modal', err))
    }
  }, [open, availableSections, semester])

  const effectiveSections = (availableSections && availableSections.length > 0)
    ? availableSections
    : internalSections

  // Trích xuất danh sách môn học duy nhất có lớp mở trong kỳ
  const uniqueCourses = useMemo(() => {
    const codeToCourseMap = new Map()
    coursesCatalog.forEach(c => {
      if (c.courseCode && c.id) {
        codeToCourseMap.set(c.courseCode, c)
      }
    })

    const map = new Map()
    effectiveSections.forEach(s => {
      const cCode = s.courseCode || s.course?.courseCode
      const cName = s.courseName || s.course?.name || (cCode && codeToCourseMap.get(cCode)?.name)
      let cId = s.courseId || s.course?.id
      if (!cId && cCode && codeToCourseMap.has(cCode)) {
        cId = codeToCourseMap.get(cCode).id
      }
      const creds = s.credits || s.course?.credits || (cCode && codeToCourseMap.get(cCode)?.credits) || 3
      const isAlreadyEnrolled = Boolean(s.isEnrolled || s.isCompleted)

      if (cId && !map.has(cId)) {
        map.set(cId, {
          id: cId,
          code: cCode,
          name: cName,
          credits: creds,
          sectionCount: 1,
          isEnrolled: isAlreadyEnrolled
        })
      } else if (cId && map.has(cId)) {
        const item = map.get(cId)
        item.sectionCount += 1
        if (isAlreadyEnrolled) {
          item.isEnrolled = true
        }
      }
    })
    return Array.from(map.values())
  }, [effectiveSections, coursesCatalog])

  // Phân chia môn khả dụng để xếp lịch và môn đã đăng ký
  const availableCourses = useMemo(() => {
    return uniqueCourses.filter(c => !c.isEnrolled)
  }, [uniqueCourses])

  const enrolledCourses = useMemo(() => {
    return uniqueCourses.filter(c => c.isEnrolled)
  }, [uniqueCourses])

  const [selectedCourseIds, setSelectedCourseIds] = useState([])

  // Tính tổng số tín chỉ của các môn đang được chọn
  const selectedCredits = useMemo(() => {
    return availableCourses
      .filter(c => selectedCourseIds.includes(c.id))
      .reduce((sum, c) => sum + (c.credits || 3), 0)
  }, [availableCourses, selectedCourseIds])

  // Tự động chọn 3-4 môn học khả dụng (~12-16 TC) khi availableCourses lần đầu xuất hiện
  useEffect(() => {
    if (selectedCourseIds.length === 0 && availableCourses.length > 0) {
      let sum = 0
      const initial = []
      for (const c of availableCourses) {
        const cCredits = c.credits || 3
        if (sum + cCredits <= 16) {
          initial.push(c.id)
          sum += cCredits
        }
      }
      setSelectedCourseIds(initial.length > 0 ? initial : [availableCourses[0].id])
    }
  }, [availableCourses])

  const [preferredShift, setPreferredShift] = useState('MORNING') // 'MORNING', 'AFTERNOON', 'ANY'
  const [avoidDays, setAvoidDays] = useState(['SAT', 'SUN'])
  const [optimizationGoal, setOptimizationGoal] = useState('COMPACT') // 'COMPACT', 'BALANCED'
  const [onlyAvailableSeats, setOnlyAvailableSeats] = useState(true)

  const [solving, setSolving] = useState(false)
  const [result, setResult] = useState(null)
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0)
  const [previewMode, setPreviewMode] = useState('grid') // 'grid' | 'list'
  const [batchReserving, setBatchReserving] = useState(false)
  const [reservingMessage, setReservingMessage] = useState(null)
  const [limitWarning, setLimitWarning] = useState(null)

  const toggleCourse = (id) => {
    const targetCourse = uniqueCourses.find(c => c.id === id)
    if (!targetCourse) return

    // Chặn triệt để môn đã đăng ký
    if (targetCourse.isEnrolled) {
      toast.info(`Môn "${targetCourse.code} - ${targetCourse.name}" bạn đã đăng ký trong kỳ rồi (đã có lịch học chính thức), không cần xếp lại.`, 'Học phần đã đăng ký')
      return
    }

    setSelectedCourseIds(prev => {
      if (prev.includes(id)) {
        setLimitWarning(null)
        return prev.filter(x => x !== id)
      }
      const targetCredits = targetCourse.credits || 3
      if (selectedCredits + targetCredits > 24) {
        const msg = `Quy định BR-01: Bạn chỉ có thể chọn tối đa 24 tín chỉ để AI xếp lịch! Hiện tại đã chọn ${selectedCredits} TC, thêm môn "${targetCourse.code}" (${targetCredits} TC) sẽ là ${selectedCredits + targetCredits} TC.`
        toast.warning(msg, 'Hạn mức 24 tín chỉ (BR-01)')
        setLimitWarning(msg)
        setTimeout(() => setLimitWarning(null), 5000)
        return prev
      }
      setLimitWarning(null)
      return [...prev, id]
    })
  }

  // Chọn nhanh gói tiêu chuẩn 15 - 18 tín chỉ cho các môn chưa đăng ký
  const handleSelectStandardPackage = () => {
    setLimitWarning(null)
    let sum = 0
    const picked = []
    for (const c of availableCourses) {
      const cCredits = c.credits || 3
      if (sum + cCredits <= 18) {
        picked.push(c.id)
        sum += cCredits
      }
    }
    setSelectedCourseIds(picked)
    if (picked.length > 0) {
      toast.info(`Đã chọn gợi ý ${sum} tín chỉ (${picked.length} môn) cho AI xếp lịch.`, 'Gói chuẩn 15-18 TC')
    }
  }

  const toggleAvoidDay = (day) => {
    setAvoidDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleSolve = async () => {
    if (selectedCourseIds.length === 0) {
      toast.warning('Vui lòng tích chọn ít nhất 1 môn học để AI bắt đầu xếp lịch.', 'Chưa chọn môn học')
      return
    }

    if (selectedCredits > 24) {
      const msg = `Tổng số tín chỉ đang chọn (${selectedCredits} TC) vượt quá hạn mức tối đa 24 tín chỉ/học kỳ. Vui lòng bỏ bớt môn trước khi xếp lịch.`
      toast.warning(msg, 'Vượt hạn mức 24 TC')
      setLimitWarning(msg)
      return
    }

    setSolving(true)
    setReservingMessage(null)
    setLimitWarning(null)
    try {
      const payload = {
        courseIds: selectedCourseIds,
        semesterName: semester,
        avoidDays,
        preferredShift,
        optimizationGoal,
        onlyAvailableSeats
      }
      console.log('Sending AI Schedule Optimizer payload:', payload)
      const res = await api.post('/student/schedule-optimizer/solve', payload)
      setResult(res.data?.data)
      setSelectedPlanIndex(0)
      if (res.data?.data?.plans && res.data.data.plans.length > 0) {
        toast.success(res.data.data.statusMessage || 'AI đã phân tích và xếp lịch thành công!', 'Tối ưu TKB hoàn tất')
      } else {
        toast.warning(res.data?.data?.statusMessage || 'Không tìm thấy tổ hợp nào không bị trùng lịch.', 'Không có phương án phù hợp')
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Lỗi khi gọi API tối ưu hóa thời khóa biểu.'
      console.error('Error calling schedule-optimizer/solve:', err)
      toast.error(errMsg, 'Lỗi AI Xếp lịch')
    } finally {
      setSolving(false)
    }
  }

  const handleBatchReserve = async (plan) => {
    if (!plan || !plan.sections || plan.sections.length === 0) return

    setBatchReserving(true)
    setReservingMessage(null)
    try {
      const sectionIds = plan.sections.map(s => s.id)
      const res = await api.post('/student/schedule-optimizer/batch-reserve', { sectionIds })
      const data = res.data?.data

      if (data && data.successCount > 0) {
        setReservingMessage({
          type: 'success',
          text: `Đã giữ chỗ thành công ${data.successCount}/${sectionIds.length} lớp học phần trong 5 phút! Toàn bộ vị trí đã được khóa an toàn.`
        })
        if (onReservationSuccess) {
          onReservationSuccess(data.reservations || [])
        }
      } else {
        setReservingMessage({
          type: 'error',
          text: `Không thể giữ chỗ: ${data?.details?.join(', ') || 'Đã hết chỗ hoặc lỗi hệ thống.'}`
        })
      }
    } catch (err) {
      setReservingMessage({
        type: 'error',
        text: 'Lỗi giữ chỗ gói: ' + (err.response?.data?.message || err.message)
      })
    } finally {
      setBatchReserving(false)
    }
  }

  const activePlan = result?.plans?.[selectedPlanIndex]

  // Bảng ánh xạ màu sắc cho các môn trong phương án đang chọn
  const courseColorMap = useMemo(() => {
    if (!activePlan?.sections) return new Map()
    const map = new Map()
    let idx = 0
    activePlan.sections.forEach(sec => {
      const code = sec.courseCode || 'GEN'
      if (!map.has(code)) {
        map.set(code, COURSE_PALETTES[idx % COURSE_PALETTES.length])
        idx++
      }
    })
    return map
  }, [activePlan])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-red-700 via-rose-700 to-amber-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  AI Xếp Thời Khóa Biểu Tự Động (CSP Smart Scheduler)
                </h2>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  DFS Backtracking + Collision Matrix
                </span>
              </div>
              <p className="text-xs text-rose-100">
                Thuật toán CSP loại trừ 100% trùng lịch, tối ưu Ca Sáng, tránh Thứ 7 & dồn ngày gọn nhất
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

          {/* Alert Message */}
          {reservingMessage && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
              reservingMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}>
              <div className="flex items-center gap-2.5">
                {reservingMessage.type === 'success' ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                )}
                <span>{reservingMessage.text}</span>
              </div>
              {reservingMessage.type === 'success' && (
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
                >
                  Đến màn hình Đăng ký
                </button>
              )}
            </div>
          )}

          {/* Limit Warning Inline Alert */}
          {limitWarning && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <span className="font-semibold">{limitWarning}</span>
              </div>
              <button
                type="button"
                onClick={() => setLimitWarning(null)}
                className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition cursor-pointer shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Configuration Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Chọn Môn Học */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Bookmark size={14} className="text-red-700" />
                  1. Môn học cần xếp lịch ({selectedCourseIds.length} môn - {selectedCredits} TC):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectStandardPackage}
                    className="text-[11px] text-red-700 hover:underline font-semibold cursor-pointer"
                    title="Chọn nhanh gói chuẩn 15-20 tín chỉ theo quy chế BR-01"
                  >
                    Gói chuẩn (15-20 TC)
                  </button>
                  <span className="text-slate-300 text-xs">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCourseIds([])}
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Thước đo hạn mức Tín chỉ BR-01: 12 - 24 TC */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <span>Tín chỉ chọn xếp lịch:</span>
                    <strong className={`text-xs ${selectedCredits > 24 ? 'text-red-600' : 'text-slate-900'}`}>
                      {selectedCredits} / 24 TC
                    </strong>
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    selectedCredits === 0
                      ? 'bg-slate-100 text-slate-500'
                      : selectedCredits < 12
                      ? 'bg-amber-100 text-amber-800'
                      : selectedCredits <= 24
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedCredits === 0 
                      ? 'Chưa chọn môn' 
                      : selectedCredits < 12 
                      ? 'Cần ≥ 12 TC' 
                      : selectedCredits <= 24 
                      ? 'Hợp lệ BR-01' 
                      : 'Vượt 24 TC'}
                  </span>
                </div>

                {/* Phân bổ tín chỉ */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  {enrolledCredits > 0 ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                      Đã có trong kỳ: <strong className="text-blue-800">{enrolledCredits} TC</strong>
                    </span>
                  ) : (
                    <span className="text-slate-400">Chưa đăng ký môn nào</span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Đang chọn AI: <strong className="text-emerald-800">{selectedCredits} TC</strong>
                  </span>
                  <span className="text-slate-500">
                    Hạn mức còn: <strong>{Math.max(0, 24 - selectedCredits)} TC</strong>
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-300 ${
                      selectedCredits > 24 ? 'bg-red-600' : selectedCredits >= 12 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    title={`Đang chọn AI: ${selectedCredits} TC`}
                    style={{ width: `${Math.min(100, (selectedCredits / 24) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {uniqueCourses.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 space-y-2">
                    {loadingCourses ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <Loader2 size={16} className="animate-spin text-red-600" />
                        <span>Đang tải danh mục môn học...</span>
                      </div>
                    ) : (
                      <>
                        <p>Không có môn học khả dụng trong kỳ học này.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setLoadingCourses(true)
                            api.get('/student/class-sections', { params: { semester } })
                              .then(res => { if (res.data?.data) setInternalSections(res.data.data) })
                              .catch(() => {})
                            api.get('/courses')
                              .then(res => { if (res.data?.data) setCoursesCatalog(res.data.data) })
                              .catch(() => {})
                              .finally(() => setLoadingCourses(false))
                          }}
                          className="text-[11px] text-red-700 underline font-semibold cursor-pointer"
                        >
                          Tải lại danh sách
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Danh sách môn khả dụng để chọn */}
                    <div className="space-y-1.5">
                      {availableCourses.map(course => {
                        const isChecked = selectedCourseIds.includes(course.id)
                        const willExceed = !isChecked && (selectedCredits + (course.credits || 3) > 24)
                        return (
                          <div
                            key={course.id}
                            onClick={() => toggleCourse(course.id)}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                              isChecked
                                ? 'bg-red-50 border-red-300 text-red-950 font-semibold shadow-2xs'
                                : willExceed
                                ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-65 cursor-not-allowed'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 ${
                                isChecked ? 'bg-red-700 border-red-700 text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {isChecked && <Check size={11} strokeWidth={3} />}
                              </div>
                              <span className="font-mono text-[11px] font-bold">{course.code}</span>
                              <span className="truncate">{course.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {willExceed && (
                                <span className="text-[9px] text-amber-600 font-medium">Vượt 24TC</span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                {course.credits} TC
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Danh sách môn đã đăng ký trong kỳ (Khóa hoàn toàn) */}
                    {enrolledCourses.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-0.5">
                          <span className="flex items-center gap-1 text-blue-800">
                            <ShieldCheck size={13} className="text-blue-600" />
                            Môn đã có trong TKB học kỳ ({enrolledCourses.length}):
                          </span>
                          <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
                            Đã đăng ký (Khóa)
                          </span>
                        </div>
                        {enrolledCourses.map(course => (
                          <div
                            key={course.id}
                            onClick={() => {
                              toast.info(`Môn "${course.code} - ${course.name}" bạn đã đăng ký trong kỳ rồi (đã có lịch học), không cần xếp lại.`, 'Đã đăng ký')
                            }}
                            className="flex items-center justify-between p-2 rounded-lg border border-blue-200/70 bg-blue-50/40 text-slate-500 text-xs cursor-not-allowed opacity-85 select-none hover:bg-blue-50 transition"
                            title="Học phần này đã được đăng ký chính thức, không thể chọn lại"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-4 h-4 rounded-xs border border-blue-300 bg-blue-100 flex items-center justify-center shrink-0 text-blue-700">
                                <Lock size={10} />
                              </div>
                              <span className="font-mono text-[11px] font-bold text-slate-700">{course.code}</span>
                              <span className="truncate text-slate-600">{course.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold flex items-center gap-1">
                                <Lock size={9} />
                                Đã đăng ký
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100/60 text-blue-900 font-medium">
                                {course.credits} TC
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 2. Ràng buộc & Ưu tiên */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock size={14} className="text-red-700" />
                2. Ràng buộc & Tiêu chí Fitness:
              </label>

              {/* Ca học ưu tiên */}
              <div>
                <span className="text-[11px] text-slate-600 font-medium block mb-1">Ca học mong muốn:</span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'MORNING', label: 'Ca Sáng (07:00-11:45)' },
                    { id: 'AFTERNOON', label: 'Ca Chiều (13:00-17:45)' },
                    { id: 'ANY', label: 'Linh hoạt (Bất kỳ)' }
                  ].map(shift => (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => setPreferredShift(shift.id)}
                      className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer text-[11px] ${
                        preferredShift === shift.id
                          ? 'bg-red-700 border-red-700 text-white shadow-2xs font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      {shift.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tránh ngày học */}
              <div>
                <span className="text-[11px] text-slate-600 font-medium block mb-1">Tránh học vào các ngày:</span>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_COLUMNS.map(day => {
                    const isAvoided = avoidDays.includes(day.key)
                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => toggleAvoidDay(day.key)}
                        className={`px-2.5 py-1 rounded-md text-[11px] border transition cursor-pointer ${
                          isAvoided
                            ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        {isAvoided ? `✕ ${day.label}` : day.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mục tiêu dồn lịch */}
              <div className="flex items-center justify-between pt-0.5">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-600 font-medium block">Dồn ngày:</span>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="optGoal"
                        value="COMPACT"
                        checked={optimizationGoal === 'COMPACT'}
                        onChange={() => setOptimizationGoal('COMPACT')}
                        className="text-red-700"
                      />
                      Gọn ngày nhất
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="optGoal"
                        value="BALANCED"
                        checked={optimizationGoal === 'BALANCED'}
                        onChange={() => setOptimizationGoal('BALANCED')}
                        className="text-red-700"
                      />
                      Cân bằng
                    </label>
                  </div>
                </div>

                <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyAvailableSeats}
                    onChange={(e) => setOnlyAvailableSeats(e.target.checked)}
                    className="text-red-700 rounded-xs"
                  />
                  Chỉ lớp còn chỗ
                </label>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleSolve}
                disabled={solving}
                className="w-full py-2.5 bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-800 hover:to-rose-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                {solving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Đang chạy thuật toán AI CSP Backtracking...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} className="text-amber-300" />
                    <span>AI Phân Tích & Đề Xuất Thời Khóa Biểu ({selectedCourseIds.length} môn - {selectedCredits} TC)</span>
                  </>
                )}
              </button>

              {selectedCourseIds.length === 0 ? (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 font-medium text-center flex items-center justify-center gap-1.5">
                  <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                  <span>Hãy chọn môn ở danh sách bên trái hoặc bấm &quot;Gói chuẩn (15-20 TC)&quot;.</span>
                </p>
              ) : selectedCredits < 12 ? (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-1.5 text-center flex items-center justify-center gap-1.5 font-medium">
                  <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                  <span>Đã chọn {selectedCredits} TC. Quy chế BR-01 khuyến nghị tối thiểu 12 TC trong học kỳ.</span>
                </p>
              ) : selectedCredits > 24 ? (
                <p className="text-[11px] text-red-800 bg-red-50 border border-red-200 rounded-lg p-1.5 text-center flex items-center justify-center gap-1.5 font-bold">
                  <AlertTriangle size={13} className="shrink-0 text-red-600" />
                  <span>Đã chọn {selectedCredits} TC, vượt quá hạn mức tối đa 24 TC theo quy chế BR-01.</span>
                </p>
              ) : null}
            </div>
          </div>

          {/* Results Section */}
          {result && (
            <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ThumbsUp size={16} className="text-emerald-600" />
                    Kết quả Tối ưu hóa ({result.validOptionsCount} phương án hợp lệ)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{result.statusMessage}</p>
                </div>

                {/* Plan Selection Tabs */}
                {result.plans && result.plans.length > 0 && (
                  <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                    {result.plans.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPlanIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          selectedPlanIndex === idx
                            ? 'bg-white text-red-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>Phương án {p.planIndex}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                          p.matchPercentage >= 95
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.matchPercentage >= 88
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.matchPercentage}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Plan Details */}
              {activePlan ? (
                <div className="space-y-4 animate-in fade-in">
                  
                  {/* Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-slate-50 via-emerald-50/40 to-slate-50 rounded-xl border border-slate-200">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">{activePlan.title}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-2xs">
                          {activePlan.matchPercentage}% Tương thích
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <span>Tổng số tín chỉ: <strong className="text-slate-900 font-semibold">{activePlan.totalCredits} TC</strong></span>
                        <span>•</span>
                        <span>Số ngày học: <strong className="text-slate-900 font-semibold">{activePlan.studyDaysCount} ngày/tuần</strong> ({activePlan.studyDays.join(', ')})</span>
                        <span>•</span>
                        <span>Nghỉ: <strong className="text-emerald-700 font-semibold">{7 - activePlan.studyDaysCount} ngày/tuần</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* View Mode Toggle */}
                      <div className="flex items-center border border-slate-200 bg-white rounded-lg p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setPreviewMode('grid')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer font-semibold ${
                            previewMode === 'grid' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Ma trận Lịch tuần Trực quan"
                        >
                          <Grid size={13} />
                          <span>Lịch tuần</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode('list')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer font-semibold ${
                            previewMode === 'list' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Bảng danh sách chi tiết"
                        >
                          <List size={13} />
                          <span>Chi tiết</span>
                        </button>
                      </div>

                      {/* 1-Click Batch Reserve Button */}
                      <button
                        type="button"
                        onClick={() => handleBatchReserve(activePlan)}
                        disabled={batchReserving}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        {batchReserving ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Đang khóa giữ chỗ...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={15} />
                            <span>1-Chạm Giữ Chỗ Cả Phương Án (5 Phút)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Highlights Badges */}
                  {activePlan.highlights && activePlan.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {activePlan.highlights.map((h, i) => (
                        <span key={i} className="text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* PREVIEW VIEW: 1. GRID MATRIX OR 2. LIST */}
                  {previewMode === 'grid' ? (
                    /* Visual Timetable Grid */
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[760px] text-xs">
                          <thead>
                            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                              <th className="py-2.5 px-2 w-28 text-center border-r border-slate-200 text-slate-500">
                                Ca Học
                              </th>
                              {DAY_COLUMNS.map(day => {
                                const isAvoided = avoidDays.includes(day.key)
                                return (
                                  <th
                                    key={day.key}
                                    className={`py-2.5 px-2 text-center border-r border-slate-200 last:border-r-0 ${
                                      isAvoided ? 'bg-amber-50/50 text-amber-900' : ''
                                    }`}
                                  >
                                    <div>{day.label}</div>
                                    {isAvoided && (
                                      <span className="text-[9px] font-normal text-amber-700 block">
                                        (Ngày tránh)
                                      </span>
                                    )}
                                  </th>
                                )
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {TIME_PERIODS.map(period => (
                              <tr key={period.id} className="hover:bg-slate-50/50 transition">
                                <td className="py-3 px-2 border-r border-slate-200 bg-slate-50 text-center align-middle">
                                  <div className="font-bold text-slate-800 text-[11px]">{period.name}</div>
                                  <div className="text-[10px] font-mono text-red-700 mt-0.5">{period.time}</div>
                                </td>
                                {DAY_COLUMNS.map(day => {
                                  const matched = (activePlan.sections || []).filter(sec => {
                                    if (!sec.dayOfWeek || sec.dayOfWeek.toUpperCase() !== day.key.toUpperCase()) return false
                                    const startH = parseHour(sec.startTime)
                                    const endH = parseHour(sec.endTime)
                                    return !(endH <= period.startHour || startH >= period.endHour)
                                  })

                                  const isAvoided = avoidDays.includes(day.key)

                                  return (
                                    <td
                                      key={day.key}
                                      className={`p-1.5 border-r border-slate-200 last:border-r-0 align-top h-20 transition ${
                                        isAvoided && matched.length === 0 ? 'bg-amber-50/20' : ''
                                      }`}
                                    >
                                      {matched.length > 0 ? (
                                        <div className="space-y-1.5">
                                          {matched.map(sec => {
                                            const palette = courseColorMap.get(sec.courseCode) || COURSE_PALETTES[0]
                                            return (
                                              <div
                                                key={sec.id}
                                                className={`p-2 rounded-lg border ${palette.border} ${palette.bg} shadow-2xs space-y-1`}
                                              >
                                                <div className="flex items-center justify-between gap-1">
                                                  <span className="font-mono font-black text-[11px]">
                                                    {sec.sectionCode}
                                                  </span>
                                                  <span className={`text-[9px] px-1 py-0.2 rounded border font-bold ${palette.badge}`}>
                                                    {sec.credits || 3} TC
                                                  </span>
                                                </div>
                                                <div className="font-bold text-[11px] line-clamp-1 leading-tight">
                                                  {sec.courseName}
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
                                                  <span className="flex items-center gap-0.5">
                                                    <MapPin size={10} className="text-red-600" />
                                                    {sec.roomName}
                                                  </span>
                                                  <span className="font-mono text-slate-500">
                                                    {sec.startTime?.substring(0, 5)} - {sec.endTime?.substring(0, 5)}
                                                  </span>
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ) : (
                                        <div className="h-full flex items-center justify-center text-slate-300 text-[10px]">
                                          —
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
                    /* Detailed Table View */
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Mã lớp</th>
                            <th className="py-2.5 px-3">Môn học</th>
                            <th className="py-2.5 px-3">Thứ & Giờ</th>
                            <th className="py-2.5 px-3">Phòng học</th>
                            <th className="py-2.5 px-3">Giảng viên</th>
                            <th className="py-2.5 px-3">Sĩ số khả dụng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activePlan.sections.map((sec) => (
                            <tr key={sec.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3 font-mono font-bold text-red-700">{sec.sectionCode}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">{sec.courseName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{sec.courseCode} • {sec.credits} TC</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-800">{sec.dayOfWeek}</div>
                                <div className="text-[11px] text-slate-500 font-mono">{sec.startTime} - {sec.endTime}</div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{sec.roomName}</td>
                              <td className="py-2.5 px-3 text-slate-700 font-medium">{sec.lecturerName || '—'}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-mono text-emerald-700 font-bold">
                                  {sec.maxCapacity - sec.currentEnrolled}/{sec.maxCapacity} chỗ
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  Không có phương án nào phù hợp với các ràng buộc đã chọn. Hãy thử nới lỏng các ngày tránh hoặc ca học.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <HelpCircle size={14} className="text-red-700" />
            Mẹo: Sử dụng tính năng Giữ chỗ 5 phút để khóa vị trí trước khi hoàn tất thủ tục đăng ký học phần.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  )
}

export default ScheduleOptimizerModal
