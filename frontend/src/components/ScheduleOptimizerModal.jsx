import React, { useState, useMemo } from 'react'
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
  ThumbsUp
} from 'lucide-react'
import api from '../services/api'

export const ScheduleOptimizerModal = ({
  open,
  onClose,
  semester,
  availableSections = [],
  onReservationSuccess
}) => {
  if (!open) return null

  // Trích xuất danh sách môn học duy nhất có lớp mở trong kỳ
  const uniqueCourses = useMemo(() => {
    const map = new Map()
    availableSections.forEach(s => {
      const cCode = s.courseCode || s.course?.courseCode
      const cName = s.courseName || s.course?.name
      const cId = s.courseId || s.course?.id
      const creds = s.credits || s.course?.credits || 3
      if (cId && !map.has(cId)) {
        map.set(cId, {
          id: cId,
          code: cCode,
          name: cName,
          credits: creds,
          sectionCount: 1
        })
      } else if (cId && map.has(cId)) {
        map.get(cId).sectionCount += 1
      }
    })
    return Array.from(map.values())
  }, [availableSections])

  const [selectedCourseIds, setSelectedCourseIds] = useState(() => {
    // Mặc định chọn 3 môn đầu tiên làm mẫu
    return uniqueCourses.slice(0, 3).map(c => c.id)
  })

  const [preferredShift, setPreferredShift] = useState('MORNING') // 'MORNING', 'AFTERNOON', 'ANY'
  const [avoidDays, setAvoidDays] = useState(['SAT', 'SUN'])
  const [optimizationGoal, setOptimizationGoal] = useState('COMPACT') // 'COMPACT', 'BALANCED'
  const [onlyAvailableSeats, setOnlyAvailableSeats] = useState(true)

  const [solving, setSolving] = useState(false)
  const [result, setResult] = useState(null)
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0)
  const [batchReserving, setBatchReserving] = useState(false)
  const [reservingMessage, setReservingMessage] = useState(null)

  const toggleCourse = (id) => {
    setSelectedCourseIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAvoidDay = (day) => {
    setAvoidDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleSolve = async () => {
    if (selectedCourseIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 môn học để AI bắt đầu xếp lịch.')
      return
    }

    setSolving(true)
    setReservingMessage(null)
    try {
      const payload = {
        courseIds: selectedCourseIds,
        semesterName: semester,
        avoidDays,
        preferredShift,
        optimizationGoal,
        onlyAvailableSeats
      }
      const res = await api.post('/student/schedule-optimizer/solve', payload)
      setResult(res.data?.data)
      setSelectedPlanIndex(0)
    } catch (err) {
      alert('Lỗi khi chạy bộ tối ưu hóa thời khóa biểu: ' + (err.response?.data?.message || err.message))
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
          text: `Đã giữ chỗ thành công ${data.successCount}/${sectionIds.length} lớp học phần trong 5 phút! Vui lòng vào xác nhận đăng ký chính thức.`
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-red-700 via-rose-700 to-amber-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                AI Xếp Thời Khóa Biểu Tự Động
                <span className="text-[10px] bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  CSP Optimizer
                </span>
              </h2>
              <p className="text-xs text-rose-100">
                Tự động ghép lịch không trùng ca, tránh ngày nghỉ và tối ưu theo sở thích của bạn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Alert Message */}
          {reservingMessage && (
            <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
              reservingMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {reservingMessage.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={16} className="text-rose-600 shrink-0" />}
                <span>{reservingMessage.text}</span>
              </div>
              {reservingMessage.type === 'success' && (
                <button
                  onClick={onClose}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold"
                >
                  Đến màn hình Đăng ký
                </button>
              )}
            </div>
          )}

          {/* Configuration Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Chọn Môn Học */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Bookmark size={14} className="text-red-700" />
                  1. Chọn các môn cần học ({selectedCourseIds.length} đã chọn):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCourseIds.length === uniqueCourses.length) {
                      setSelectedCourseIds([])
                    } else {
                      setSelectedCourseIds(uniqueCourses.map(c => c.id))
                    }
                  }}
                  className="text-[11px] text-red-700 hover:underline font-medium"
                >
                  {selectedCourseIds.length === uniqueCourses.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {uniqueCourses.map(course => {
                  const isChecked = selectedCourseIds.includes(course.id)
                  return (
                    <div
                      key={course.id}
                      onClick={() => toggleCourse(course.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-red-50 border-red-300 text-red-950 font-semibold'
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
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 font-medium">
                        {course.credits} TC
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 2. Ràng buộc & Ưu tiên */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock size={14} className="text-red-700" />
                2. Thiết lập Ràng buộc & Ưu tiên:
              </label>

              {/* Ca học ưu tiên */}
              <div>
                <span className="text-[11px] text-slate-600 font-medium block mb-1.5">Ca học mong muốn:</span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'MORNING', label: 'Ca Sáng (<= 12h30)' },
                    { id: 'AFTERNOON', label: 'Ca Chiều (>= 12h30)' },
                    { id: 'ANY', label: 'Bất kỳ (Linh hoạt)' }
                  ].map(shift => (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => setPreferredShift(shift.id)}
                      className={`py-1.5 px-2 rounded-lg border text-center font-medium transition ${
                        preferredShift === shift.id
                          ? 'bg-red-700 border-red-700 text-white shadow-2xs font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {shift.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tránh ngày học */}
              <div>
                <span className="text-[11px] text-slate-600 font-medium block mb-1.5">Tránh học vào các ngày:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'MON', label: 'Thứ 2' },
                    { id: 'TUE', label: 'Thứ 3' },
                    { id: 'WED', label: 'Thứ 4' },
                    { id: 'THU', label: 'Thứ 5' },
                    { id: 'FRI', label: 'Thứ 6' },
                    { id: 'SAT', label: 'Thứ 7' },
                    { id: 'SUN', label: 'Chủ Nhật' },
                  ].map(day => {
                    const isAvoided = avoidDays.includes(day.id)
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleAvoidDay(day.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] border font-medium transition ${
                          isAvoided
                            ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {isAvoided ? `✕ ${day.label}` : day.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mục tiêu tối ưu */}
              <div className="flex items-center justify-between pt-1">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-600 font-medium block">Mục tiêu dồn lịch:</span>
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
                      Gọn ngày (Ít ngày nhất)
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
                      Cân bằng (Dàn đều)
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
                  Chỉ lớp còn chỗ trống
                </label>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleSolve}
                disabled={solving || selectedCourseIds.length === 0}
                className="w-full py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
              >
                {solving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Đang giải bài toán xếp lịch (CSP Engine)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>AI Phân Tích & Đề Xuất Thời Khóa Biểu</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Section */}
          {result && (
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <ThumbsUp size={14} className="text-emerald-600" />
                    Kết quả Tối ưu hóa ({result.validOptionsCount} phương án hợp lệ)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{result.statusMessage}</p>
                </div>

                {/* Plan Selection Tabs */}
                {result.plans && result.plans.length > 0 && (
                  <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
                    {result.plans.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPlanIndex(idx)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                          selectedPlanIndex === idx
                            ? 'bg-white text-red-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>Phương án {p.planIndex}</span>
                        <span className="text-[10px] px-1 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
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
                  {/* Plan Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-linear-to-r from-slate-50 to-emerald-50/30 rounded-xl border border-slate-200">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{activePlan.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                          Độ tương thích: {activePlan.matchPercentage}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-600">
                        <span>Tổng số tín chỉ: <strong className="text-slate-900">{activePlan.totalCredits} TC</strong></span>
                        <span>•</span>
                        <span>Số ngày học: <strong className="text-slate-900">{activePlan.studyDaysCount} ngày/tuần</strong> ({activePlan.studyDays.join(', ')})</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBatchReserve(activePlan)}
                      disabled={batchReserving}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      {batchReserving ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Đang giữ chỗ gói...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={14} />
                          <span>1-Chạm Giữ Chỗ Gói Này (5 Phút)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Highlights */}
                  {activePlan.highlights && activePlan.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {activePlan.highlights.map((h, i) => (
                        <span key={i} className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Sections Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Mã lớp</th>
                          <th className="py-2 px-3">Môn học</th>
                          <th className="py-2 px-3">Thứ & Giờ</th>
                          <th className="py-2 px-3">Phòng</th>
                          <th className="py-2 px-3">Giảng viên</th>
                          <th className="py-2 px-3">Sĩ số</th>
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
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <HelpCircle size={13} />
            Mẹo: Sử dụng tính năng Giữ chỗ 5 phút để khóa vị trí trước khi hoàn tất thủ tục đăng ký.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  )
}
export default ScheduleOptimizerModal
