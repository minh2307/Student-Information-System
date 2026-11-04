import React, { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle,
  ShieldAlert,
  Bell,
  CheckCircle2,
  X,
  Users,
  AlertCircle,
  HelpCircle,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  UserCheck,
  TrendingDown,
  ClipboardList,
} from 'lucide-react'
import api from '../../../services/api'

// ─── Inline Confirm Dialog (thay window.confirm) ─────────────────────────────
function ConfirmDialog({ open, title, description, onConfirm, onCancel, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-rose-100 rounded-xl shrink-0">
            <Bell className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Xác nhận gửi
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Risk Badge ───────────────────────────────────────────────────────────────
function RiskBadge({ level }) {
  const styles = {
    CRITICAL: 'bg-rose-600 text-white',
    WARNING:  'bg-amber-500 text-white',
    SAFE:     'bg-emerald-600 text-white',
  }
  const labels = {
    CRITICAL: 'Nguy cấp',
    WARNING:  'Cần chú ý',
    SAFE:     'An toàn',
  }
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase font-mono ${styles[level] ?? 'bg-slate-400 text-white'}`}>
      {labels[level] ?? level}
    </span>
  )
}

// ─── Metric Pill: vắng / điểm GK ─────────────────────────────────────────────
function MetricPill({ label, value, danger }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
      danger
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-slate-100 text-slate-600 border-slate-200'
    }`}>
      {label}: <strong>{value}</strong>
      {danger && <AlertCircle size={11} className="text-rose-500" />}
    </span>
  )
}

// ─── Student Risk Card ────────────────────────────────────────────────────────
function StudentRiskCard({ student, expanded, onToggle, onDispatchOne, dispatchingOne }) {
  const isCritical  = student.riskLevel === 'CRITICAL'
  const isWarning   = student.riskLevel === 'WARNING'
  const absencePct  = Math.round((student.absenceRate ?? 0) * 100)
  const absenceDanger = absencePct >= 20
  const midDanger     = student.midtermScore !== null && student.midtermScore !== undefined
                        ? Number(student.midtermScore) < 4.0
                        : false

  return (
    <div className={`border rounded-xl transition ${
      isCritical ? 'bg-rose-50/50 border-rose-200'
      : isWarning ? 'bg-amber-50/40 border-amber-200'
      : 'bg-white border-slate-200'
    }`}>
      {/* Main row */}
      <div className="flex items-center justify-between p-3.5 gap-3">
        {/* Left: badge + info */}
        <div className="flex items-start gap-3 min-w-0">
          <RiskBadge level={student.riskLevel} />
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 flex-wrap">
              <span className="truncate">{student.fullName}</span>
              <span className="font-mono text-[11px] text-slate-500 shrink-0">({student.studentCode})</span>
            </div>
            {/* Metric pills */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              <MetricPill
                label="Vắng"
                value={`${student.absentSessions}/${student.totalSessionsHeld} (${absencePct}%)`}
                danger={absenceDanger}
              />
              <MetricPill
                label="GK"
                value={student.midtermScore !== null && student.midtermScore !== undefined ? student.midtermScore : '—'}
                danger={midDanger}
              />
              {student.finalScore !== null && student.finalScore !== undefined && (
                <MetricPill label="CK" value={student.finalScore} danger={false} />
              )}
            </div>
          </div>
        </div>

        {/* Right: risk score + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 block">Rủi ro</span>
            <span className={`font-mono text-xs font-black ${
              isCritical ? 'text-rose-700' : isWarning ? 'text-amber-700' : 'text-emerald-700'
            }`}>
              {student.riskScore}/100
            </span>
          </div>

          {/* Dispatch single */}
          {(isCritical || isWarning) && (
            <button
              type="button"
              onClick={() => onDispatchOne(student)}
              disabled={dispatchingOne}
              title="Gửi cảnh báo cho sinh viên này"
              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 hover:text-rose-800 transition disabled:opacity-40"
            >
              {dispatchingOne ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expandable detail */}
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-0 border-t border-slate-200/60 space-y-2 text-xs animate-in fade-in">
          <div className="mt-3">
            <span className="font-bold text-[11px] text-slate-700 block mb-1 flex items-center gap-1">
              <AlertTriangle size={11} className={isCritical ? 'text-rose-600' : 'text-amber-600'} />
              Lý do nhận diện nguy cơ:
            </span>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              {(student.riskReasons ?? []).map((r, idx) => (
                <li key={idx} className={isCritical ? 'text-rose-800 font-medium' : ''}>
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {student.suggestions?.length > 0 && (
            <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/80">
              <span className="font-bold text-[11px] text-slate-700 block mb-1 flex items-center gap-1">
                <UserCheck size={11} className="text-emerald-600" />
                Khuyến nghị can thiệp sư phạm:
              </span>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
                {student.suggestions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {student.email && (
            <p className="text-[11px] text-slate-400">
              Email: <span className="text-slate-600">{student.email}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function EarlyWarningModal({ open, onClose, sectionId, sectionCode, courseName }) {
  // ✅ Hooks luôn được gọi — guard render ở cuối
  const [loading, setLoading]                   = useState(false)
  const [report, setReport]                     = useState(null)
  const [error, setError]                       = useState(null)
  const [filter, setFilter]                     = useState('AT_RISK') // 'AT_RISK' | 'CRITICAL' | 'WARNING' | 'SAFE' | 'ALL'
  const [dispatching, setDispatching]           = useState(false)
  const [dispatchingOneId, setDispatchingOneId] = useState(null)
  const [dispatchResult, setDispatchResult]     = useState(null)
  const [expandedId, setExpandedId]             = useState(null)
  const [confirmOpen, setConfirmOpen]           = useState(false)
  const [confirmTarget, setConfirmTarget]       = useState(null) // null = all at-risk | StudentRiskDto = single

  // Fetch khi mở hoặc sectionId thay đổi
  useEffect(() => {
    if (open && sectionId) {
      fetchReport()
    }
    // Reset khi đóng
    if (!open) {
      setReport(null)
      setError(null)
      setDispatchResult(null)
      setFilter('AT_RISK')
      setExpandedId(null)
    }
  }, [open, sectionId]) // eslint-disable-line

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDispatchResult(null)
    try {
      const res = await api.get(`/lecturer/early-warnings/section/${sectionId}`)
      // DTO: EarlyWarningSummaryResponse
      setReport(res.data?.data ?? null)
    } catch (err) {
      console.error('[EarlyWarning] fetch error:', err)
      setError(err.response?.data?.message || err.message || 'Lỗi không xác định')
    } finally {
      setLoading(false)
    }
  }, [sectionId])

  // ── Dispatch helpers ────────────────────────────────────────────────────────
  const openConfirmAll = () => {
    if (!report || (report.criticalCount + report.warningCount) === 0) return
    setConfirmTarget(null)
    setConfirmOpen(true)
  }

  const openConfirmOne = (student) => {
    setConfirmTarget(student)
    setConfirmOpen(true)
  }

  const handleConfirmDispatch = async () => {
    setConfirmOpen(false)

    const isSingle = confirmTarget !== null
    const payload  = { sectionId }
    if (isSingle) payload.studentIds = [confirmTarget.studentId]

    if (isSingle) {
      setDispatchingOneId(confirmTarget.studentId)
    } else {
      setDispatching(true)
    }
    setDispatchResult(null)

    try {
      const res = await api.post('/lecturer/early-warnings/dispatch', payload)
      // DTO: DispatchWarningResponse → { sentCount, status, dispatchedAt, recipientNames, message }
      const data = res.data?.data
      setDispatchResult({
        type: 'success',
        text: data?.message
          ?? `Đã gửi cảnh báo tới ${data?.sentCount ?? (isSingle ? 1 : report.criticalCount + report.warningCount)} sinh viên!`,
        sentCount: data?.sentCount,
      })
    } catch (err) {
      setDispatchResult({
        type: 'error',
        text: 'Lỗi khi gửi cảnh báo: ' + (err.response?.data?.message || err.message),
      })
    } finally {
      setDispatching(false)
      setDispatchingOneId(null)
      setConfirmTarget(null)
    }
  }

  // ── Filter logic ────────────────────────────────────────────────────────────
  const allStudents = report?.students ?? []

  // Sinh viên "cần cảnh báo" = vắng >= 20% HOẶC GK < 4.0
  const atRiskStudents = allStudents.filter(s => {
    const absencePct = (s.absenceRate ?? 0) * 100
    const midterm    = s.midtermScore !== null && s.midtermScore !== undefined
                       ? Number(s.midtermScore)
                       : null
    return absencePct >= 20 || (midterm !== null && midterm < 4.0)
  })

  const filteredStudents = allStudents.filter(s => {
    switch (filter) {
      case 'AT_RISK':  return atRiskStudents.includes(s)
      case 'CRITICAL': return s.riskLevel === 'CRITICAL'
      case 'WARNING':  return s.riskLevel === 'WARNING'
      case 'SAFE':     return s.riskLevel === 'SAFE'
      default:         return true
    }
  })

  const atRiskCount = report ? (report.criticalCount + report.warningCount) : 0

  const TABS = [
    { id: 'AT_RISK',  label: `Cần cảnh báo (${atRiskStudents.length})` },
    { id: 'CRITICAL', label: `Nguy cấp (${report?.criticalCount ?? 0})` },
    { id: 'WARNING',  label: `Cần chú ý (${report?.warningCount ?? 0})` },
    { id: 'SAFE',     label: `An toàn (${report?.safeCount ?? 0})` },
    { id: 'ALL',      label: `Tất cả (${allStudents.length})` },
  ]

  // ── Guard: không render nếu không mở ───────────────────────────────────────
  if (!open) return null

  return (
    <>
      {/* Inline Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        loading={dispatching || !!dispatchingOneId}
        title={
          confirmTarget
            ? `Gửi cảnh báo cho ${confirmTarget.fullName}?`
            : `Bắn cảnh báo tới ${atRiskCount} sinh viên?`
        }
        description={
          confirmTarget
            ? `Sinh viên ${confirmTarget.studentCode} sẽ nhận thông báo nhắc nhở học vụ qua hệ thống.`
            : `Toàn bộ ${atRiskCount} sinh viên đang trong diện nguy cơ (vắng ≥ 20% hoặc GK < 4.0) sẽ nhận thông báo cảnh báo sớm.`
        }
        onConfirm={handleConfirmDispatch}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Backdrop + Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="px-6 py-4 bg-gradient-to-r from-amber-600 via-rose-600 to-red-700 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-amber-200 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold flex items-center gap-2 flex-wrap">
                  Hệ Thống Cảnh Báo Sớm Nguy Cơ Học Vụ
                  <span className="text-[10px] bg-white text-rose-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Early Warning
                  </span>
                </h2>
                <p className="text-xs text-rose-100">
                  Lớp {sectionCode || report?.sectionCode} • {courseName || report?.courseName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchReport}
                disabled={loading}
                title="Làm mới dữ liệu"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition disabled:opacity-40"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── Body ───────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Dispatch feedback */}
            {dispatchResult && (
              <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 ${
                dispatchResult.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}>
                <div className="flex items-center gap-2">
                  {dispatchResult.type === 'success'
                    ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    : <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                  }
                  <span>{dispatchResult.text}</span>
                </div>
                <button onClick={() => setDispatchResult(null)} className="text-current opacity-60 hover:opacity-100">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{error}</span>
                <button onClick={fetchReport} className="ml-auto px-3 py-1 bg-rose-100 hover:bg-rose-200 rounded-lg font-semibold transition">
                  Thử lại
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-rose-600 animate-spin mx-auto" />
                <p className="text-xs font-medium text-slate-500">
                  Đang quét & phân tích chuyên cần, điểm số sinh viên...
                </p>
              </div>
            )}

            {/* Report content */}
            {!loading && report && (
              <>
                {/* ── Stat overview ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
                      <Users size={11} /> Tổng SV
                    </div>
                    <div className="text-xl font-bold text-slate-800 mt-0.5">{report.totalStudents}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
                    <div className="text-[11px] font-bold text-rose-700 flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
                      Nguy cấp
                    </div>
                    <div className="text-xl font-bold text-rose-700 mt-0.5">{report.criticalCount}</div>
                    <div className="text-[10px] text-rose-500 mt-0.5">Cấm thi / F</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                    <div className="text-[11px] font-bold text-amber-800 flex items-center justify-center gap-1">
                      <TrendingDown size={11} /> Cần chú ý
                    </div>
                    <div className="text-xl font-bold text-amber-800 mt-0.5">{report.warningCount}</div>
                    <div className="text-[10px] text-amber-600 mt-0.5">Nguy cơ cao</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <div className="text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1">
                      <CheckCircle2 size={11} /> An toàn
                    </div>
                    <div className="text-xl font-bold text-emerald-800 mt-0.5">{report.safeCount}</div>
                  </div>
                </div>

                {/* ── Action banner ──────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl">
                  <div className="text-xs text-rose-950 space-y-0.5">
                    <span className="font-bold block text-rose-900">{report.evaluationSummary}</span>
                    <span className="text-[11px] text-rose-700 flex items-center gap-1">
                      <ClipboardList size={11} />
                      Quy chế: Vắng &gt; 20% tổng buổi <strong>hoặc</strong> điểm giữa kỳ &lt; 4.0 → nguy cơ đình chỉ thi.
                    </span>
                    {report.attendanceRiskCount > 0 && (
                      <span className="text-[11px] text-rose-600">
                        • Vắng nguy cơ: <strong>{report.attendanceRiskCount}</strong> SV
                        &nbsp;• Điểm GK nguy cơ: <strong>{report.gradeRiskCount}</strong> SV
                      </span>
                    )}
                  </div>

                  {atRiskCount > 0 && (
                    <button
                      onClick={openConfirmAll}
                      disabled={dispatching}
                      className="px-4 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 whitespace-nowrap"
                    >
                      {dispatching ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                      Bắn Cảnh Báo 1-Chạm ({atRiskCount} SV)
                    </button>
                  )}
                </div>

                {/* ── Tab filters ────────────────────────────────────────── */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">Danh Sách Phân Loại Nguy Cơ:</span>
                  <div className="flex flex-wrap gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                    {TABS.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`px-3 py-1 rounded-md font-bold transition text-xs whitespace-nowrap ${
                          filter === tab.id
                            ? 'bg-white text-rose-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Student list ───────────────────────────────────────── */}
                <div className="space-y-2.5">
                  {filteredStudents.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="text-xs text-slate-500 font-medium">
                        {filter === 'AT_RISK'
                          ? 'Không có sinh viên nào trong diện cảnh báo. Tuyệt vời!'
                          : 'Không có sinh viên nào trong nhóm này.'}
                      </p>
                    </div>
                  ) : (
                    filteredStudents.map(student => (
                      <StudentRiskCard
                        key={student.studentId}
                        student={student}
                        expanded={expandedId === student.studentId}
                        onToggle={() => setExpandedId(expandedId === student.studentId ? null : student.studentId)}
                        onDispatchOne={openConfirmOne}
                        dispatchingOne={dispatchingOneId === student.studentId}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {/* Empty — no error, no loading, no report */}
            {!loading && !report && !error && (
              <div className="py-16 text-center text-xs text-slate-400">
                Chưa có dữ liệu. Nhấn làm mới để tải báo cáo.
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 gap-3">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <HelpCircle size={13} />
              Dữ liệu đồng bộ sau mỗi buổi điểm danh hoặc khi cập nhật điểm số.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition shrink-0"
            >
              Đóng
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

export default EarlyWarningModal
