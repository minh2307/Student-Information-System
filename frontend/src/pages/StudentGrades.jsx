import React, { useState, useEffect, useMemo } from 'react'
import api from '../services/api'
import { GraduationCap, Award, CheckCircle2, Clock, BookOpen, AlertCircle, Loader2 } from 'lucide-react'

export const StudentGrades = () => {
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSemester, setSelectedSemester] = useState('ALL')

  useEffect(() => {
    fetchGrades()
  }, [])

  const fetchGrades = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/student/grades')
      if (res.data?.data) {
        setGrades(res.data.data)
      }
    } catch (err) {
      console.error('Lỗi khi tải bảng điểm:', err)
      setError(err.response?.data?.message || 'Không thể tải bảng điểm từ hệ thống')
    } finally {
      setLoading(false)
    }
  }

  // Danh sách các học kỳ có trong bảng điểm
  const semesters = useMemo(() => {
    const list = Array.from(new Set(grades.map(g => g.semesterName).filter(Boolean)))
    return list.sort().reverse()
  }, [grades])

  // Lọc bảng điểm theo học kỳ được chọn
  const filteredGrades = useMemo(() => {
    if (selectedSemester === 'ALL') return grades
    return grades.filter(g => g.semesterName === selectedSemester)
  }, [grades, selectedSemester])

  // Thống kê tín chỉ và điểm trung bình
  const stats = useMemo(() => {
    const graded = filteredGrades.filter(g => g.totalScore != null)
    const passed = graded.filter(g => g.letterGrade && g.letterGrade !== 'F')
    const totalCredits = passed.reduce((sum, g) => sum + (g.credits || 0), 0)

    let totalPoints = 0
    let totalCredsForGpa = 0
    graded.forEach(g => {
      const cred = g.credits || 0
      if (g.totalScore != null && cred > 0) {
        totalPoints += Number(g.totalScore) * cred
        totalCredsForGpa += cred
      }
    })
    const gpa = totalCredsForGpa > 0 ? (totalPoints / totalCredsForGpa).toFixed(2) : '0.00'

    return { totalCredits, gpa, gradedCount: graded.length, totalCount: filteredGrades.length }
  }, [filteredGrades])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="text-blue-600" size={28} />
            <span>Kết quả Học tập</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Bảng điểm chi tiết theo môn học (Trọng số: Chuyên cần 10% - Giữa kỳ 30% - Cuối kỳ 60%)
          </p>
        </div>

        {/* Semester Filter */}
        {semesters.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Học kỳ:</span>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            >
              <option value="ALL">Tất cả các kỳ ({grades.length} môn)</option>
              {semesters.map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <BookOpen size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tín chỉ đã hoàn thành</div>
            <div className="text-2xl font-bold text-slate-800 mt-0.5">
              {stats.totalCredits} <span className="text-xs font-normal text-slate-400">tín chỉ</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Award size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Điểm TB Học tập (GPA)</div>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">
              {stats.gpa} <span className="text-xs font-normal text-slate-400">/ 10</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tiến độ chấm điểm</div>
            <div className="text-2xl font-bold text-purple-600 mt-0.5">
              {stats.gradedCount}/{stats.totalCount} <span className="text-xs font-normal text-slate-400">môn đã có điểm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-sm font-medium">Đang tải bảng điểm từ máy chủ...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-700 flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      ) : filteredGrades.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <GraduationCap size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">Chưa có dữ liệu điểm học phần</h3>
          <p className="text-xs text-slate-500 mt-1">Các môn học của bạn sẽ hiển thị tại đây khi giảng viên nhập điểm và chốt điểm.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-slate-600 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">Môn học</th>
                  <th className="px-4 py-4 text-center">Học kỳ</th>
                  <th className="px-3 py-4 text-center">Tín chỉ</th>
                  <th className="px-4 py-4 text-center">Chuyên cần (10%)</th>
                  <th className="px-4 py-4 text-center">Giữa kỳ (30%)</th>
                  <th className="px-4 py-4 text-center">Cuối kỳ (60%)</th>
                  <th className="px-4 py-4 text-center">Tổng kết (Hệ 10)</th>
                  <th className="px-4 py-4 text-center">Điểm chữ</th>
                  <th className="px-4 py-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGrades.map((g, idx) => {
                  const hasTotal = g.totalScore != null
                  const isPassed = hasTotal && g.letterGrade !== 'F'

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800 text-sm">{g.courseName}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>{g.courseCode}</span>
                          <span>•</span>
                          <span>Mã ĐK: #{g.enrollmentId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-medium text-xs text-slate-600">
                        {g.semesterName || '2024-25_SEM2'}
                      </td>
                      <td className="px-3 py-4 text-center font-semibold text-slate-800">{g.credits}</td>
                      <td className="px-4 py-4 text-center font-medium text-slate-700">
                        {g.attendanceScore != null ? Number(g.attendanceScore).toFixed(1) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-4 text-center font-medium text-slate-700">
                        {g.midtermScore != null ? Number(g.midtermScore).toFixed(1) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-4 text-center font-medium text-slate-700">
                        {g.finalScore != null ? Number(g.finalScore).toFixed(1) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-base text-blue-700">
                        {hasTotal ? Number(g.totalScore).toFixed(2) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {g.letterGrade ? (
                          <span className={`inline-block px-2.5 py-1 font-bold text-xs rounded-lg shadow-2xs ${
                            isPassed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {g.letterGrade}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">Chưa có</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {g.isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100/70 text-emerald-800">
                            <CheckCircle2 size={12} /> Đã chốt điểm
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={12} /> Đang chấm điểm
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
