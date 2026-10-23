import React, { useState, useCallback } from 'react'
import { Save, Loader2, CheckCircle2, Lock } from 'lucide-react'
import { getRealAvatar } from '../../../utils/avatarUtils'

/**
 * Tính toán total_score preview trên client (khớp công thức BE):
 * total = 0.10 * att + 0.30 * mid + 0.60 * final  (làm tròn 2 chữ số)
 */
function previewTotal(att, mid, fin) {
  if (mid == null || fin == null || mid === '' || fin === '') return null
  const a = parseFloat(att) || 0
  const m = parseFloat(mid)
  const f = parseFloat(fin)
  if (isNaN(m) || isNaN(f)) return null
  return Math.round((0.1 * a + 0.3 * m + 0.6 * f) * 100) / 100
}

function letterColor(letter) {
  if (!letter) return 'text-slate-400'
  if (letter === 'A+' || letter === 'A') return 'text-emerald-600'
  if (letter === 'B+' || letter === 'B') return 'text-red-600'
  if (letter === 'C') return 'text-amber-600'
  if (letter === 'D') return 'text-orange-500'
  return 'text-rose-600'
}

const INPUT_CLS =
  'w-20 text-center py-1.5 text-sm border border-slate-200 rounded-lg ' +
  'focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-blue-400 ' +
  'transition-colors bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed'

/**
 * Một dòng SV trong bảng điểm — desktop view.
 *
 * Props:
 *   student        - StudentGradeResponse từ store
 *   isSaving       - boolean (row đang POST)
 *   onSave         - fn(enrollmentId, payload) → Promise<{ok, error}>
 *   onToast        - fn(message, type)
 */
export function GradeRow({ student, isSaving, onSave, onToast }) {
  const locked = student.isLocked

  const [att, setAtt]   = useState(student.attendanceRate ?? '')
  const [mid, setMid]   = useState(student.midtermScore ?? '')
  const [fin, setFin]   = useState(student.finalScore ?? '')
  const [dirty, setDirty] = useState(false)
  const [rowStatus, setRowStatus] = useState(null) // 'success' | null

  const handleChange = (setter) => (e) => {
    setter(e.target.value)
    setDirty(true)
    setRowStatus(null)
  }

  const preview = previewTotal(att, mid, fin)
  // Nếu đã có response từ server thì ưu tiên hiển thị; nếu đang dirty thì preview
  const displayTotal = dirty ? preview : (student.totalScore ?? preview)
  const displayLetter = dirty ? null : student.letterGrade

  // Validate
  const validate = useCallback(() => {
    const attV = parseFloat(att)
    const midV = parseFloat(mid)
    const finV = parseFloat(fin)
    if (att !== '' && (isNaN(attV) || attV < 0 || attV > 100)) {
      return 'Chuyên cần phải từ 0–100%'
    }
    if (mid !== '' && (isNaN(midV) || midV < 0 || midV > 10)) {
      return 'Điểm giữa kỳ phải từ 0–10'
    }
    if (fin !== '' && (isNaN(finV) || finV < 0 || finV > 10)) {
      return 'Điểm cuối kỳ phải từ 0–10'
    }
    return null
  }, [att, mid, fin])

  const handleSave = async () => {
    const err = validate()
    if (err) { onToast(err, 'warning'); return }

    const payload = {}
    if (att !== '' && parseFloat(att) !== student.attendanceRate) {
      payload.attendanceRate = parseFloat(att)
    }
    if (mid !== '' && parseFloat(mid) !== student.midtermScore) {
      payload.midtermScore = parseFloat(mid)
    }
    if (fin !== '' && parseFloat(fin) !== student.finalScore) {
      payload.finalScore = parseFloat(fin)
    }
    if (Object.keys(payload).length === 0) {
      onToast('Không có thay đổi để lưu.', 'warning')
      return
    }

    const result = await onSave(student.enrollmentId, payload)
    if (result.ok) {
      setDirty(false)
      setRowStatus('success')
      onToast(`Đã lưu điểm cho ${student.fullName}`, 'success')
      setTimeout(() => setRowStatus(null), 2000)
    } else {
      const msg = result.statusCode === 409
        ? 'Điểm đã bị khóa, không thể sửa.'
        : result.statusCode === 403
        ? 'Bạn không có quyền sửa lớp này.'
        : result.error
      onToast(msg, 'error')
    }
  }

  return (
    <tr
      className={`
        border-b border-slate-100 transition-colors
        ${locked ? 'bg-slate-50/60' : 'hover:bg-slate-50/70'}
        ${rowStatus === 'success' ? 'bg-emerald-50/60' : ''}
      `}
    >
      {/* Sinh viên */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <img
            src={getRealAvatar(student.studentCode || student.fullName)}
            alt={student.fullName}
            className="w-9 h-9 rounded-full object-cover border border-stone-200 shadow-2xs shrink-0"
            onError={(e) => {
              e.target.src = '/images/avatar-student.jpg'
            }}
          />
          <div>
            <div className="text-sm font-semibold text-slate-800 leading-tight">
              {student.fullName}
            </div>
            <div className="text-xs text-slate-400 font-mono">{student.studentCode}</div>
          </div>
        </div>
      </td>

      {/* Chuyên cần % */}
      <td className="px-3 py-3.5 text-center">
        <input
          id={`att-${student.enrollmentId}`}
          type="number" step="0.5" min="0" max="100"
          value={att} onChange={handleChange(setAtt)}
          disabled={locked || isSaving}
          className={INPUT_CLS}
          aria-label={`Chuyên cần ${student.fullName}`}
        />
      </td>

      {/* Giữa kỳ */}
      <td className="px-3 py-3.5 text-center">
        <input
          id={`mid-${student.enrollmentId}`}
          type="number" step="0.1" min="0" max="10"
          value={mid} onChange={handleChange(setMid)}
          disabled={locked || isSaving}
          className={INPUT_CLS}
          aria-label={`Giữa kỳ ${student.fullName}`}
        />
      </td>

      {/* Cuối kỳ */}
      <td className="px-3 py-3.5 text-center">
        <input
          id={`fin-${student.enrollmentId}`}
          type="number" step="0.1" min="0" max="10"
          value={fin} onChange={handleChange(setFin)}
          disabled={locked || isSaving}
          className={INPUT_CLS}
          aria-label={`Cuối kỳ ${student.fullName}`}
        />
      </td>

      {/* Preview tổng kết */}
      <td className="px-3 py-3.5 text-center">
        <span className={`text-sm font-bold tabular-nums ${dirty ? 'text-amber-600' : 'text-slate-700'}`}>
          {displayTotal != null ? displayTotal.toFixed(2) : (
            <span className="text-slate-300 font-normal">—</span>
          )}
        </span>
        {dirty && displayTotal != null && (
          <span className="block text-[10px] text-amber-500 leading-none mt-0.5">preview</span>
        )}
      </td>

      {/* Điểm chữ (từ server) */}
      <td className="px-3 py-3.5 text-center">
        {locked ? (
          <span className={`text-sm font-bold tabular-nums ${letterColor(student.letterGrade)}`}>
            {student.letterGrade ?? '—'}
          </span>
        ) : (
          <span className={`text-sm font-semibold ${dirty ? 'text-slate-300' : letterColor(displayLetter)}`}>
            {dirty ? '—' : (displayLetter ?? '—')}
          </span>
        )}
      </td>

      {/* Trạng thái / nút Lưu */}
      <td className="px-4 py-3.5 text-center">
        {locked ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            <Lock size={11} /> Đã khóa
          </span>
        ) : isSaving ? (
          <Loader2 size={16} className="text-blue-500 animate-spin mx-auto" />
        ) : rowStatus === 'success' ? (
          <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
        ) : (
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-red-600 text-white hover:bg-red-700 transition-colors
                       disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <Save size={12} /> Lưu
          </button>
        )}
      </td>
    </tr>
  )
}

/**
 * Card dạng mobile cho mỗi sinh viên
 */
export function GradeCard({ student, isSaving, onSave, onToast }) {
  const locked = student.isLocked
  const [att, setAtt] = useState(student.attendanceRate ?? '')
  const [mid, setMid] = useState(student.midtermScore ?? '')
  const [fin, setFin] = useState(student.finalScore ?? '')
  const [dirty, setDirty] = useState(false)

  const handleChange = (setter) => (e) => { setter(e.target.value); setDirty(true) }
  const preview = previewTotal(att, mid, fin)

  const handleSave = async () => {
    const payload = {}
    if (att !== '') payload.attendanceRate = parseFloat(att)
    if (mid !== '') payload.midtermScore = parseFloat(mid)
    if (fin !== '') payload.finalScore = parseFloat(fin)

    const result = await onSave(student.enrollmentId, payload)
    if (result.ok) {
      setDirty(false)
      onToast(`Đã lưu điểm cho ${student.fullName}`, 'success')
    } else {
      onToast(result.error, 'error')
    }
  }

  return (
    <div className={`bg-white rounded-xl border p-4 space-y-3 ${locked ? 'border-slate-100 opacity-80' : 'border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src={getRealAvatar(student.studentCode || student.fullName)}
            alt={student.fullName}
            className="w-9 h-9 rounded-full object-cover border border-stone-200 shadow-2xs shrink-0"
            onError={(e) => {
              e.target.src = '/images/avatar-student.jpg'
            }}
          />
          <div>
            <p className="text-sm font-semibold text-slate-800">{student.fullName}</p>
            <p className="text-xs text-slate-400 font-mono">{student.studentCode}</p>
          </div>
        </div>
        {locked && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            <Lock size={10} /> Khóa
          </span>
        )}
        {!locked && student.letterGrade && (
          <span className={`text-lg font-bold tabular-nums ${letterColor(student.letterGrade)}`}>
            {student.letterGrade}
          </span>
        )}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          { label: 'Chuyên cần %', val: att, set: setAtt, max: 100, step: 0.5 },
          { label: 'Giữa kỳ',      val: mid, set: setMid, max: 10,  step: 0.1 },
          { label: 'Cuối kỳ',      val: fin, set: setFin, max: 10,  step: 0.1 },
        ].map(({ label, val, set, max, step }) => (
          <div key={label} className="space-y-1">
            <p className="text-slate-500 font-medium">{label}</p>
            <input
              type="number" step={step} min="0" max={max}
              value={val} onChange={handleChange(set)}
              disabled={locked || isSaving}
              className="w-full text-center py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400/40 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
        ))}
      </div>

      {/* Total preview + action */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div>
          <span className="text-xs text-slate-400">Tổng kết </span>
          <span className={`text-sm font-bold ${dirty ? 'text-amber-600' : 'text-slate-700'}`}>
            {(dirty ? preview : student.totalScore) != null
              ? (dirty ? preview : student.totalScore).toFixed(2)
              : '—'}
          </span>
          {dirty && <span className="text-[10px] text-amber-500 ml-1">preview</span>}
        </div>
        {!locked && (
          <button
            onClick={handleSave}
            disabled={!dirty || isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-red-600 text-white hover:bg-red-700 transition-colors
                       disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Lưu
          </button>
        )}
      </div>
    </div>
  )
}
