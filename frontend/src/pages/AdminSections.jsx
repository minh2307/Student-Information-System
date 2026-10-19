import React, { useState } from 'react'
import { Check, X, Plus, Calendar, Clock, MapPin, Users } from 'lucide-react'

export const AdminSections = () => {
  const [pendingList, setPendingList] = useState([
    {
      enrollmentId: 3,
      studentCode: 'SV2024001',
      studentName: 'Nguyễn Văn C',
      courseCode: 'CS401',
      courseName: 'Web Application Development',
      sectionCode: 'CS401-2025-01',
      dayOfWeek: 'WED',
      time: '13:30 - 15:00',
    },
  ])

  const handleApprove = (id) => {
    setPendingList((prev) => prev.filter((p) => p.enrollmentId !== id))
    alert('Đã phê duyệt đăng ký học phần!')
  }

  const handleReject = (id) => {
    setPendingList((prev) => prev.filter((p) => p.enrollmentId !== id))
    alert('Đã từ chối đăng ký!')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Lớp & Duyệt Đăng ký</h1>
          <p className="text-slate-500 text-sm mt-0.5">Xử lý các yêu cầu đăng ký chờ duyệt (PENDING) và mở lớp mới</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center justify-between">
          <span>Yêu cầu đăng ký chờ duyệt ({pendingList.length})</span>
        </h2>

        {pendingList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">Không có yêu cầu đăng ký nào đang chờ xử lý.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingList.map((p) => (
              <div key={p.enrollmentId} className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{p.studentName}</span>
                    <span className="text-xs font-mono text-slate-400">({p.studentCode})</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Đăng ký lớp: <strong className="text-blue-600">{p.courseName}</strong> ({p.sectionCode}) - Thứ {p.dayOfWeek} ({p.time})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(p.enrollmentId)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Check size={14} /> Duyệt
                  </button>
                  <button
                    onClick={() => handleReject(p.enrollmentId)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <X size={14} /> Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
