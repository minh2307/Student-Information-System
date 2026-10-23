import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Lock, Search, Users,
  AlertTriangle, BookOpen,
} from 'lucide-react'
import { useLecturerStore } from '../store/lecturerStore'
import { GradeRow, GradeCard } from '../components/GradeRow'
import { TableRowSkeleton, EmptyState } from '../components/Skeletons'
import { LockConfirmModal, MissingGradesModal } from '../components/LockModals'
import { ToastContainer, useToast } from '../components/Toast'

export function ClassStudentsPage() {
  const { sectionId } = useParams()
  const navigate      = useNavigate()
  const sid           = Number(sectionId)

  const {
    classes, students, loadingStudents, errorStudents,
    fetchStudents, fetchClasses,
    updateGrade, updateAttendance,
    lockGrades, locking, savingRow,
  } = useLecturerStore()

  const { toasts, add: addToast, remove: removeToast } = useToast()

  // Tìm thông tin lớp từ store (đã fetch ở trang trước)
  const section = useMemo(
    () => classes.find((c) => c.sectionId === sid),
    [classes, sid]
  )

  const studentList = students[sid] ?? []

  // Search
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return studentList
    return studentList.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.studentCode?.toLowerCase().includes(q)
    )
  }, [studentList, query])

  // Khoá điểm state
  const [showLockConfirm,  setShowLockConfirm]  = useState(false)
  const [showMissingModal, setShowMissingModal] = useState(false)
  const [missingStudents,  setMissingStudents]  = useState([])

  const isAllLocked = studentList.length > 0 && studentList.every((s) => s.isLocked)

  // Load data
  useEffect(() => {
    // Nếu classes chưa có (navigation trực tiếp vào URL), fetch luôn
    if (classes.length === 0) fetchClasses()
    fetchStudents(sid)
  }, [sid]) // eslint-disable-line

  // Unified save handler (gộp attendance + grade)
  const handleSave = useCallback(async (enrollmentId, payload) => {
    // Nếu payload có attendanceRate → gọi attendance endpoint
    // Các field khác → gọi grade endpoint
    const { attendanceRate, ...gradePart } = payload

    let result = { ok: true }

    if (attendanceRate !== undefined) {
      result = await updateAttendance(sid, enrollmentId, attendanceRate)
      if (!result.ok) return result
    }

    if (Object.keys(gradePart).length > 0) {
      result = await updateGrade(sid, enrollmentId, gradePart)
    }

    return result
  }, [sid, updateAttendance, updateGrade])

  // Lock grades handler
  const handleLockConfirm = async () => {
    setShowLockConfirm(false)
    const result = await lockGrades(sid)
    if (result.ok) {
      addToast(`Đã chốt bảng điểm — ${result.data?.lockedCount ?? studentList.length} sinh viên.`, 'success')
    } else if (result.statusCode === 400 && result.missing?.length > 0) {
      setMissingStudents(result.missing)
      setShowMissingModal(true)
    } else if (result.statusCode === 403) {
      addToast('Bạn không có quyền chốt điểm lớp này.', 'error')
    } else if (result.statusCode === 404) {
      addToast('Không tìm thấy lớp học phần.', 'error')
    } else {
      addToast(result.error ?? 'Có lỗi khi chốt điểm.', 'error')
    }
  }

  // Registered students (chỉ có REGISTERED mới hiển thị theo spec)
  const registeredCount = studentList.length

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 flex-wrap">
        <button
          onClick={() => navigate('/lecturer/classes')}
          className="mt-0.5 p-2 rounded-lg border border-slate-200 text-slate-500
                     hover:bg-slate-50 hover:text-slate-800 transition-colors shrink-0"
          aria-label="Quay lại danh sách lớp"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              {section ? section.courseName : `Lớp #${sid}`}
            </h1>
            {isAllLocked && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold
                               bg-slate-100 text-slate-500 border border-slate-200
                               px-2.5 py-0.5 rounded-full">
                <Lock size={10} /> Đã khóa bảng điểm
              </span>
            )}
          </div>

          {section && (
            <p className="text-sm text-slate-500 mt-0.5">
              <span className="font-mono text-xs font-semibold text-red-600 mr-2">
                {section.sectionCode}
              </span>
              {section.semesterName} ·{' '}
              {section.dayOfWeek} {section.startTime?.slice(0,5)}–{section.endTime?.slice(0,5)} ·{' '}
              {section.roomName}
            </p>
          )}
        </div>

        {/* Lock button */}
        {!isAllLocked && (
          <button
            id="btn-lock-grades"
            onClick={() => setShowLockConfirm(true)}
            disabled={locking || loadingStudents || registeredCount === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
                       bg-rose-600 text-white hover:bg-rose-700 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Lock size={14} />
            {locking ? 'Đang chốt…' : 'Chốt bảng điểm'}
          </button>
        )}
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────── */}
      {!loadingStudents && studentList.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Sinh viên',
              value: registeredCount,
              icon: <Users size={14} />,
              color: 'text-red-600',
            },
            {
              label: 'Đã có điểm',
              value: studentList.filter((s) => s.totalScore != null).length,
              icon: <BookOpen size={14} />,
              color: 'text-emerald-600',
            },
            {
              label: 'Chưa đủ điểm',
              value: studentList.filter((s) => s.totalScore == null).length,
              icon: <AlertTriangle size={14} />,
              color: 'text-amber-600',
            },
          ].map(({ label, value, icon, color }) => (
            <div
              key={label}
              className="bg-white border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <span className={`${color} shrink-0`}>{icon}</span>
              <div>
                <p className="text-[11px] text-slate-400 font-medium leading-none mb-1">{label}</p>
                <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Search ──────────────────────────────────────────────────── */}
      {studentList.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="student-search"
            type="search"
            placeholder="Tìm theo tên hoặc mã SV…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white
                       focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-blue-400"
          />
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────── */}
      {errorStudents && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" />
          {errorStudents === 'Request failed with status code 403'
            ? 'Bạn không có quyền xem lớp này.'
            : errorStudents === 'Request failed with status code 404'
            ? 'Không tìm thấy lớp học phần.'
            : errorStudents}
        </div>
      )}

      {/* ── Desktop Table (md+) ──────────────────────────────────────── */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {[
                { label: 'Sinh viên', cls: 'px-5 py-3.5 text-left' },
                { label: 'Chuyên cần %', cls: 'px-3 py-3.5 text-center w-28' },
                { label: 'Giữa kỳ (30%)', cls: 'px-3 py-3.5 text-center w-28' },
                { label: 'Cuối kỳ (60%)', cls: 'px-3 py-3.5 text-center w-28' },
                { label: 'Tổng kết', cls: 'px-3 py-3.5 text-center w-24' },
                { label: 'Xếp loại', cls: 'px-3 py-3.5 text-center w-20' },
                { label: '', cls: 'px-4 py-3.5 w-24' },
              ].map(({ label, cls }) => (
                <th key={label} className={`${cls} text-[11px] font-semibold text-slate-400 uppercase tracking-wide`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loadingStudents ? (
              <TableRowSkeleton cols={7} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={<Users size={22} />}
                    title={query ? 'Không tìm thấy sinh viên' : 'Chưa có sinh viên đăng ký'}
                    description={query ? 'Thử tìm bằng từ khóa khác.' : 'Sinh viên đăng ký REGISTERED sẽ xuất hiện ở đây.'}
                  />
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <GradeRow
                  key={s.enrollmentId}
                  student={s}
                  isSaving={savingRow === s.enrollmentId}
                  onSave={handleSave}
                  onToast={addToast}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Cards (< md) ─────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {loadingStudents ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse space-y-3">
              <div className="flex gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[0,1,2].map(j => <div key={j} className="h-8 bg-slate-100 rounded-lg" />)}
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title={query ? 'Không tìm thấy sinh viên' : 'Chưa có sinh viên đăng ký'}
          />
        ) : (
          filtered.map((s) => (
            <GradeCard
              key={s.enrollmentId}
              student={s}
              isSaving={savingRow === s.enrollmentId}
              onSave={handleSave}
              onToast={addToast}
            />
          ))
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      <LockConfirmModal
        isOpen={showLockConfirm}
        onClose={() => setShowLockConfirm(false)}
        onConfirm={handleLockConfirm}
        loading={locking}
        sectionCode={section?.sectionCode ?? `#${sid}`}
        totalStudents={registeredCount}
      />

      <MissingGradesModal
        isOpen={showMissingModal}
        onClose={() => setShowMissingModal(false)}
        missingStudents={missingStudents}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
