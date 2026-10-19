import React, { useState } from 'react'
import { Lock, Save, Award } from 'lucide-react'

export const LecturerGrades = () => {
  const [students, setStudents] = useState([
    {
      enrollmentId: 1,
      studentCode: 'SV2024001',
      fullName: 'Nguyễn Văn C',
      attendanceScore: 9.5,
      midtermScore: 8.5,
      finalScore: 8.8,
      totalScore: 8.78,
      letterGrade: 'A',
      isLocked: false,
    },
    {
      enrollmentId: 4,
      studentCode: 'SV2024002',
      fullName: 'Lê Thị D',
      attendanceScore: 9.0,
      midtermScore: 7.5,
      finalScore: 8.0,
      totalScore: 7.95,
      letterGrade: 'B+',
      isLocked: false,
    },
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nhập & Quản lý Điểm</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Lớp học phần: <span className="font-semibold text-blue-600">CS201-2025-01 (Data Structures)</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2">
            <Save size={16} /> Lưu bảng điểm
          </button>
          <button className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2">
            <Lock size={16} /> Chốt & Khóa điểm
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Sinh viên</th>
              <th className="px-4 py-4 text-center">Chuyên cần (10%)</th>
              <th className="px-4 py-4 text-center">Giữa kỳ (30%)</th>
              <th className="px-4 py-4 text-center">Cuối kỳ (60%)</th>
              <th className="px-4 py-4 text-center">Tổng kết</th>
              <th className="px-4 py-4 text-center">Xếp loại</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={s.enrollmentId} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{s.fullName}</div>
                  <div className="text-xs text-slate-400 font-mono">{s.studentCode}</div>
                </td>
                <td className="px-4 py-4 text-center">
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={s.attendanceScore}
                    className="w-16 text-center py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-4 text-center">
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={s.midtermScore}
                    className="w-16 text-center py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-4 text-center">
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={s.finalScore}
                    className="w-16 text-center py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-4 text-center font-bold text-blue-600">
                  {s.totalScore}
                </td>
                <td className="px-4 py-4 text-center font-bold text-emerald-600">
                  {s.letterGrade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
