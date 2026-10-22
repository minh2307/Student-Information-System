import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Users, ChevronRight, BookOpen,
  Clock, MapPin, Filter, RefreshCw,
} from 'lucide-react'
import { useLecturerStore } from '../store/lecturerStore'
import { ClassCardSkeleton, EmptyState } from '../components/Skeletons'
import { ToastContainer, useToast } from '../components/Toast'

const DAY_LABEL = {
  MON: 'Thứ Hai', TUE: 'Thứ Ba', WED: 'Thứ Tư',
  THU: 'Thứ Năm', FRI: 'Thứ Sáu', SAT: 'Thứ Bảy', SUN: 'Chủ Nhật',
}

const STATUS_STYLE = {
  OPEN:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED:    'bg-slate-100 text-slate-500 border-slate-200',
  CANCELLED: 'bg-rose-50 text-rose-600 border-rose-200',
}

function capacityColor(enrolled, max) {
  const pct = max > 0 ? enrolled / max : 0
  if (pct >= 0.9) return 'text-rose-600'
  if (pct >= 0.7) return 'text-amber-600'
  return 'text-emerald-600'
}

// Lấy danh sách học kỳ unique từ classes
function getSemesters(classes) {
  return [...new Set(classes.map((c) => c.semesterName))].sort().reverse()
}

export function LecturerClassesPage() {
  const navigate = useNavigate()
  const { classes, loadingClasses, errorClasses, fetchClasses } = useLecturerStore()
  const { toasts, add: addToast, remove: removeToast } = useToast()

  const [semester, setSemester] = useState('')

  // Initial load
  useEffect(() => {
    fetchClasses(semester || undefined)
  }, []) // eslint-disable-line

  const handleFilter = () => {
    fetchClasses(semester || undefined)
  }

  const handleRefresh = () => {
    fetchClasses(semester || undefined)
  }

  const semesters = useMemo(() => getSemesters(classes), [classes])

  const displayed = useMemo(() => {
    if (!semester) return classes
    return classes.filter((c) => c.semesterName === semester)
  }, [classes, semester])

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Lớp học phần được phân công
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {!loadingClasses && `${displayed.length} lớp`}
          </p>
        </div>

        {/* Filter + refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              id="semester-select"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="pl-8 pr-10 py-2 text-sm border border-slate-200 rounded-lg bg-white
                         text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/40
                         appearance-none cursor-pointer"
            >
              <option value="">Tất cả học kỳ</option>
              {semesters.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleFilter}
            className="px-3.5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg
                       hover:bg-blue-700 transition-colors"
          >
            Lọc
          </button>

          <button
            onClick={handleRefresh}
            disabled={loadingClasses}
            className="p-2 border border-slate-200 rounded-lg text-slate-500
                       hover:bg-slate-50 transition-colors disabled:opacity-50"
            aria-label="Làm mới"
          >
            <RefreshCw size={15} className={loadingClasses ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────── */}
      {errorClasses && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3">
          {errorClasses === 'Network Error'
            ? 'Không kết nối được với server. Vui lòng kiểm tra backend.'
            : errorClasses}
        </div>
      )}

      {/* ── Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loadingClasses ? (
          [...Array(4)].map((_, i) => <ClassCardSkeleton key={i} />)
        ) : displayed.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<BookOpen size={24} />}
              title="Chưa có lớp học phần nào"
              description="Khi được phân công, lớp sẽ hiện ở đây."
            />
          </div>
        ) : (
          displayed.map((cls) => (
            <ClassCard
              key={cls.sectionId}
              cls={cls}
              onClick={() => navigate(`/lecturer/classes/${cls.sectionId}`)}
            />
          ))
        )}
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

function ClassCard({ cls, onClick }) {
  const pct = cls.maxCapacity > 0
    ? Math.round((cls.currentEnrolled / cls.maxCapacity) * 100)
    : 0

  return (
    <button
      onClick={onClick}
      className="group text-left bg-white rounded-xl border border-slate-100 p-5 space-y-4
                 hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5
                 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="inline-block text-[11px] font-semibold tracking-wide text-blue-700
                           bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md mb-2">
            {cls.sectionCode}
          </span>
          <h3 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
            {cls.courseName}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{cls.courseCode} · {cls.credits} TC</p>
        </div>
        <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 shrink-0 ${STATUS_STYLE[cls.status] ?? STATUS_STYLE.OPEN}`}>
          {cls.status}
        </span>
      </div>

      {/* Info rows */}
      <div className="space-y-1.5 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Calendar size={12} className="text-slate-400 shrink-0" />
          <span>{DAY_LABEL[cls.dayOfWeek] ?? cls.dayOfWeek}</span>
          <Clock size={12} className="text-slate-400 shrink-0 ml-1" />
          <span>
            {cls.startTime?.slice(0, 5)} – {cls.endTime?.slice(0, 5)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={12} className="text-slate-400 shrink-0" />
          <span>{cls.roomName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={12} className="text-slate-400 shrink-0" />
          <span>
            Sĩ số:{' '}
            <strong className={capacityColor(cls.currentEnrolled, cls.maxCapacity)}>
              {cls.currentEnrolled}
            </strong>
            /{cls.maxCapacity}
          </span>
        </div>
      </div>

      {/* Capacity bar */}
      <div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 90 ? 'bg-rose-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <span className="text-xs font-medium text-slate-400">{cls.semesterName}</span>
        <span className="flex items-center gap-1 text-xs font-semibold text-blue-600
                         group-hover:gap-2 transition-all">
          Xem bảng điểm <ChevronRight size={13} />
        </span>
      </div>
    </button>
  )
}
