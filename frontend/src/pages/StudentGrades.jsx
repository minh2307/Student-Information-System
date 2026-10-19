import React, { useState } from 'react'
import { GraduationCap, Award, CheckCircle2 } from 'lucide-react'

export const StudentGrades = () => {
  const [grades] = useState([
    {
      courseCode: 'CS201',
      courseName: 'Data Structures and Algorithms',
      credits: 3,
      attendanceScore: 9.5,
      midtermScore: 8.5,
      finalScore: 8.8,
      totalScore: 8.78,
      letterGrade: 'A',
    },
    {
      courseCode: 'CS301',
      courseName: 'Database Management Systems',
      credits: 3,
      attendanceScore: 10.0,
      midtermScore: 9.0,
      finalScore: 8.5,
      totalScore: 8.80,
      letterGrade: 'A',
    },
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kết quả Học tập</h1>
          <p className="text-slate-500 text-sm mt-0.5">Bảng điểm chi tiết theo môn học (Trọng số 10% - 30% - 60%)</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Môn học</th>
              <th className="px-4 py-4 text-center">Tín chỉ</th>
              <th className="px-4 py-4 text-center">Chuyên cần (10%)</th>
              <th className="px-4 py-4 text-center">Giữa kỳ (30%)</th>
              <th className="px-4 py-4 text-center">Cuối kỳ (60%)</th>
              <th className="px-4 py-4 text-center">Tổng kết (Hệ 10)</th>
              <th className="px-4 py-4 text-center">Điểm chữ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grades.map((g, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{g.courseName}</div>
                  <div className="text-xs text-slate-400 font-mono">{g.courseCode}</div>
                </td>
                <td className="px-4 py-4 text-center font-medium">{g.credits}</td>
                <td className="px-4 py-4 text-center text-slate-700">{g.attendanceScore}</td>
                <td className="px-4 py-4 text-center text-slate-700">{g.midtermScore}</td>
                <td className="px-4 py-4 text-center text-slate-700">{g.finalScore}</td>
                <td className="px-4 py-4 text-center font-bold text-blue-600">{g.totalScore}</td>
                <td className="px-4 py-4 text-center">
                  <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-md">
                    {g.letterGrade}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
