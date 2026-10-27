import React, { useState, useEffect } from 'react'
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
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import api from '../../../services/api'

export function EarlyWarningModal({ open, onClose, sectionId, sectionCode, courseName }) {
  if (!open) return null

  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [filter, setFilter] = useState('ALL') // 'ALL', 'CRITICAL', 'WARNING'
  const [dispatching, setDispatching] = useState(false)
  const [dispatchResult, setDispatchResult] = useState(null)
  const [expandedStudentId, setExpandedStudentId] = useState(null)

  useEffect(() => {
    if (sectionId) {
      fetchReport()
    }
  }, [sectionId])

  const fetchReport = async () => {
    setLoading(true)
    setDispatchResult(null)
    try {
      const res = await api.get(`/lecturer/early-warnings/section/${sectionId}`)
      setReport(res.data?.data)
    } catch (err) {
      console.error('Lỗi tải báo cáo cảnh báo sớm:', err)
      alert('Lỗi tải báo cáo cảnh báo sớm: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleDispatchAll = async () => {
    if (!report || report.criticalCount + report.warningCount === 0) {
      alert('Không có sinh viên nào trong diện nguy cơ để gửi cảnh báo.')
      return
    }

    const confirmSend = window.confirm(
      `Bạn có chắc chắn muốn gửi thông báo cảnh báo sớm và nhắc nhở học vụ tới ${report.criticalCount + report.warningCount} sinh viên đang gặp nguy cơ?`
    )
    if (!confirmSend) return

    setDispatching(true)
    setDispatchResult(null)
    try {
      const res = await api.post('/lecturer/early-warnings/dispatch', { sectionId })
      setDispatchResult({
        type: 'success',
        text: res.data?.data?.message || 'Đã gửi thông báo cảnh báo sớm thành công!'
      })
    } catch (err) {
      setDispatchResult({
        type: 'error',
        text: 'Lỗi khi gửi cảnh báo: ' + (err.response?.data?.message || err.message)
      })
    } finally {
      setDispatching(false)
    }
  }

  const students = report?.students || []
  const filteredStudents = students.filter(s => {
    if (filter === 'CRITICAL') return s.riskLevel === 'CRITICAL'
    if (filter === 'WARNING') return s.riskLevel === 'WARNING'
    return true
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-amber-600 via-rose-600 to-red-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <ShieldAlert className="w-5 h-5 text-amber-200 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
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
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Dispatch Feedback Alert */}
          {dispatchResult && (
            <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
              dispatchResult.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {dispatchResult.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={16} className="text-rose-600 shrink-0" />}
                <span>{dispatchResult.text}</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-rose-600 animate-spin mx-auto" />
              <p className="text-xs font-medium text-slate-500">Đang quét phân tích chuyên cần và điểm số sinh viên...</p>
            </div>
          ) : report ? (
            <>
              {/* Stat Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[11px] font-medium text-slate-500">Tổng sinh viên</div>
                  <div className="text-xl font-bold text-slate-800 mt-0.5">{report.totalStudents}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
                  <div className="text-[11px] font-bold text-rose-700 flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                    Nguy cấp (Cấm thi/F)
                  </div>
                  <div className="text-xl font-bold text-rose-700 mt-0.5">{report.criticalCount}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <div className="text-[11px] font-bold text-amber-800">Cần chú ý</div>
                  <div className="text-xl font-bold text-amber-800 mt-0.5">{report.warningCount}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <div className="text-[11px] font-bold text-emerald-800">An toàn / Đạt</div>
                  <div className="text-xl font-bold text-emerald-800 mt-0.5">{report.safeCount}</div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl">
                <div className="text-xs text-rose-950">
                  <span className="font-bold block text-rose-900 mb-0.5">{report.evaluationSummary}</span>
                  <span className="text-[11px] text-rose-700">Quy chế đào tạo: Vắng &gt; 20% tổng số buổi hoặc điểm giữa kỳ &lt; 4.0 có nguy cơ bị đình chỉ thi.</span>
                </div>
                {(report.criticalCount > 0 || report.warningCount > 0) && (
                  <button
                    onClick={handleDispatchAll}
                    disabled={dispatching}
                    className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 whitespace-nowrap"
                  >
                    {dispatching ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>Bắn Cảnh Báo Nhắc Nhở ({report.criticalCount + report.warningCount} SV)</span>
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800">Danh Sách Phân Loại Nguy Cơ:</span>
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  {[
                    { id: 'ALL', label: `Tất cả (${students.length})` },
                    { id: 'CRITICAL', label: `Nguy cấp (${report.criticalCount})` },
                    { id: 'WARNING', label: `Cần chú ý (${report.warningCount})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFilter(tab.id)}
                      className={`px-3 py-1 rounded-md font-bold transition text-xs ${
                        filter === tab.id
                          ? 'bg-white text-rose-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Risk List */}
              <div className="space-y-2.5">
                {filteredStudents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Không có sinh viên nào trong mục đã chọn.
                  </div>
                ) : (
                  filteredStudents.map(student => {
                    const isExpanded = expandedStudentId === student.studentId
                    const isCritical = student.riskLevel === 'CRITICAL'
                    const isWarning = student.riskLevel === 'WARNING'

                    return (
                      <div
                        key={student.studentId}
                        className={`border rounded-xl p-3.5 transition ${
                          isCritical
                            ? 'bg-rose-50/50 border-rose-200'
                            : isWarning
                            ? 'bg-amber-50/40 border-amber-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase font-mono ${
                              isCritical
                                ? 'bg-rose-600 text-white'
                                : isWarning
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}>
                              {student.riskLevel}
                            </span>
                            <div>
                              <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                                <span>{student.fullName}</span>
                                <span className="font-mono text-[11px] text-slate-500">({student.studentCode})</span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Vắng: <strong className={student.absentSessions > 0 ? 'text-rose-700' : 'text-slate-700'}>{student.absentSessions}/{student.totalSessionsHeld} buổi</strong> ({Math.round(student.absenceRate * 100)}%)
                                • GK: <strong className="text-slate-800">{student.midtermScore !== null ? student.midtermScore : '—'}</strong>
                                • CK: <strong className="text-slate-800">{student.finalScore !== null ? student.finalScore : '—'}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block">Chỉ số rủi ro</span>
                              <span className={`font-mono text-xs font-black ${
                                isCritical ? 'text-rose-700' : isWarning ? 'text-amber-700' : 'text-emerald-700'
                              }`}>
                                {student.riskScore}/100
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedStudentId(isExpanded ? null : student.studentId)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Reasons & Suggestions */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2 text-xs animate-in fade-in">
                            <div>
                              <span className="font-bold text-[11px] text-slate-700 block mb-1">Chi tiết nhận diện nguy cơ:</span>
                              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                                {student.riskReasons.map((r, idx) => (
                                  <li key={idx} className={isCritical ? 'text-rose-800 font-medium' : ''}>{r}</li>
                                ))}
                              </ul>
                            </div>

                            {student.suggestions && student.suggestions.length > 0 && (
                              <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/80">
                                <span className="font-bold text-[11px] text-slate-700 block mb-1">Khuyến nghị can thiệp sư phạm:</span>
                                <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
                                  {student.suggestions.map((s, idx) => (
                                    <li key={idx}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : null}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <HelpCircle size={13} />
            Hệ thống tự động đồng bộ sau mỗi buổi điểm danh hoặc khi giảng viên cập nhật điểm số.
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
export default EarlyWarningModal
