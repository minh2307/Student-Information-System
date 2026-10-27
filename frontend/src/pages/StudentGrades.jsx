import React, { useState, useEffect, useMemo } from 'react'
import api from '../services/api'
import VerifiableTranscriptModal from '../components/VerifiableTranscriptModal'
import { 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  AlertCircle, 
  Loader2, 
  Printer, 
  ShieldCheck, 
  Info,
  Filter 
} from 'lucide-react'

export const StudentGrades = () => {
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSemester, setSelectedSemester] = useState('ALL')
  const [showCredentialModal, setShowCredentialModal] = useState(false)

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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Official Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700">
            Học Viện Công Nghệ Rikkei • Phòng Đào Tạo & Khảo Thí
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
            Bảng Ghi Điểm Học Tập & Đánh Giá Học Phần
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Cơ cấu điểm kiểm tra: Chuyên cần (10%) • Đánh giá giữa kỳ (30%) • Thi kết thúc học phần (60%)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {semesters.length > 0 && (
            <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
              <Filter size={14} className="text-stone-500" />
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-transparent text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả các học kỳ ({grades.length} môn)</option>
                {semesters.map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setShowCredentialModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-red-800 to-rose-700 hover:from-red-900 hover:to-rose-800 text-white transition shadow-2xs cursor-pointer"
          >
            <ShieldCheck size={14} className="text-emerald-300" />
            <span>Bảng Điểm Số Xác Thực (QR)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 transition border border-stone-200"
          >
            <Printer size={14} />
            <span>In bảng điểm</span>
          </button>
        </div>
      </div>

      {/* 2. Key Academic Indicators (Tabular, Anti-Slop) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-stone-600 block">Tín chỉ tích lũy (Đạt)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-2xl font-bold text-stone-900">{stats.totalCredits}</span>
            <span className="text-xs font-mono text-stone-600">tín chỉ</span>
          </div>
          <span className="text-[11px] text-stone-600 mt-1 block">
            Các môn học có điểm chữ &ge; D
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-stone-600 block">Điểm trung bình (GPA)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-2xl font-bold text-red-800">{stats.gpa}</span>
            <span className="text-xs font-mono text-stone-600">/ 10.0</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            Xếp loại học lực: Giỏi
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-stone-600 block">Tiến độ cập nhật điểm</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-2xl font-bold text-stone-900">{stats.gradedCount} / {stats.totalCount}</span>
            <span className="text-xs font-mono text-stone-600">học phần</span>
          </div>
          <span className="text-[11px] text-stone-600 mt-1 block">
            {stats.gradedCount === stats.totalCount ? 'Đã hoàn tất toàn bộ điểm' : 'Giảng viên đang chấm thi'}
          </span>
        </div>
      </div>

      {/* 3. Official Transcript Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-stone-200/90 p-16 text-center text-stone-500 flex flex-col items-center justify-center gap-3">
          <Loader2 size={28} className="animate-spin text-red-700" />
          <p className="text-xs text-stone-600">Đang đồng bộ hồ sơ kết quả từ máy chủ học vụ...</p>
        </div>
      ) : error ? (
        <div className="bg-stone-50 border border-stone-300 rounded-2xl p-6 text-stone-800 flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0 text-red-700" />
          <div className="text-xs">{error}</div>
        </div>
      ) : filteredGrades.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
          <GraduationCap size={36} className="mx-auto text-stone-300 mb-2" />
          <h3 className="text-sm font-bold text-stone-700">Chưa có kết quả học phần nào</h3>
          <p className="text-xs text-stone-500 mt-1">Bảng điểm sẽ cập nhật ngay khi giảng viên hoàn tất nhập điểm và ký duyệt.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-stone-200/80 bg-stone-50/50 flex items-center justify-between">
            <h3 className="font-bold text-xs sm:text-sm text-stone-900 uppercase font-mono tracking-wider">
              Bảng Ghi Điểm Chi Tiết Các Lớp Học Phần ({filteredGrades.length} môn)
            </h3>
            <span className="text-[11px] font-mono text-stone-600">
              Chính thức • Đã qua kiểm tra
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100/70 text-stone-600 text-[10px] uppercase font-mono tracking-wider border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Môn học</th>
                  <th className="px-3 py-3 text-center">Học kỳ</th>
                  <th className="px-3 py-3 text-center">Số TC</th>
                  <th className="px-3 py-3 text-right">Chuyên cần (10%)</th>
                  <th className="px-3 py-3 text-right">Giữa kỳ (30%)</th>
                  <th className="px-3 py-3 text-right">Cuối kỳ (60%)</th>
                  <th className="px-3 py-3 text-right font-bold text-red-800">Tổng kết (Hệ 10)</th>
                  <th className="px-3 py-3 text-center">Điểm chữ</th>
                  <th className="px-4 py-3 text-center">Tình trạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-sans">
                {filteredGrades.map((g, idx) => {
                  const hasTotal = g.totalScore != null
                  const isPassed = hasTotal && g.letterGrade !== 'F'

                  return (
                    <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-stone-900 text-xs">{g.courseName}</div>
                        <div className="text-[10px] text-stone-600 font-mono mt-0.5 flex items-center gap-2">
                          <span className="font-bold text-red-800">{g.courseCode}</span>
                          <span>•</span>
                          <span>Lớp HP: #{g.enrollmentId}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono text-[11px] text-stone-600">
                        {g.semesterName || '2024-25_SEM2'}
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-semibold text-stone-800">{g.credits}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-stone-700">
                        {g.attendanceScore != null ? Number(g.attendanceScore).toFixed(1) : <span className="text-stone-300">-</span>}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-stone-700">
                        {g.midtermScore != null ? Number(g.midtermScore).toFixed(1) : <span className="text-stone-300">-</span>}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-stone-700">
                        {g.finalScore != null ? Number(g.finalScore).toFixed(1) : <span className="text-stone-300">-</span>}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono font-bold text-sm text-red-800">
                        {hasTotal ? Number(g.totalScore).toFixed(2) : <span className="text-stone-300">-</span>}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        {g.letterGrade ? (
                          <span className={`inline-block px-2 py-0.5 font-mono font-bold text-[11px] rounded ${
                            isPassed
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}>
                            {g.letterGrade}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {g.isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-800">
                            <CheckCircle2 size={12} className="text-emerald-600" /> Đã chốt điểm
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-700">
                            <Clock size={12} /> Đang cập nhật
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

      {/* 4. Grading Scale Reference Standard (Thang điểm quy đổi học vụ) */}
      <div className="bg-stone-50 rounded-xl border border-stone-200/80 p-4 text-xs">
        <h4 className="font-bold text-stone-900 text-xs uppercase font-mono tracking-wider mb-2 flex items-center gap-1.5">
          <Info size={14} className="text-stone-500" />
          Quy Chuẩn Quy Đổi Thang Điểm Đại Học (Theo Học Chế Tín Chỉ)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 font-mono text-[11px] text-stone-600">
          <div className="bg-white p-2 rounded border border-stone-200">
            <span className="font-bold text-red-800">A+ (9.0 - 10.0)</span>
            <div className="text-[10px] text-stone-600">Hệ 4: 4.0 • Xuất sắc</div>
          </div>
          <div className="bg-white p-2 rounded border border-stone-200">
            <span className="font-bold text-red-800">A (8.5 - 8.9)</span>
            <div className="text-[10px] text-stone-600">Hệ 4: 3.7 • Giỏi</div>
          </div>
          <div className="bg-white p-2 rounded border border-stone-200">
            <span className="font-bold text-stone-800">B+ (8.0 - 8.4)</span>
            <div className="text-[10px] text-stone-600">Hệ 4: 3.5 • Khá giỏi</div>
          </div>
          <div className="bg-white p-2 rounded border border-stone-200">
            <span className="font-bold text-stone-800">B (7.0 - 7.9)</span>
            <div className="text-[10px] text-stone-600">Hệ 4: 3.0 • Khá</div>
          </div>
          <div className="bg-white p-2 rounded border border-stone-200">
            <span className="font-bold text-stone-800">C (5.5 - 6.9)</span>
            <div className="text-[10px] text-stone-600">Hệ 4: 2.0 • Trung bình</div>
          </div>
          <div className="bg-white p-2 rounded border border-stone-200">
            <span className="font-bold text-stone-800">D (4.0 - 5.4)</span>
            <div className="text-[10px] text-stone-600">Hệ 4: 1.0 • Đạt</div>
          </div>
          <div className="bg-white p-2 rounded border border-red-200">
            <span className="font-bold text-red-700">F (&lt; 4.0)</span>
            <div className="text-[10px] text-stone-600">Hệ 4: 0.0 • Học lại</div>
          </div>
        </div>
      </div>

      {/* Verifiable Digital Transcript Modal */}
      <VerifiableTranscriptModal
        open={showCredentialModal}
        onClose={() => setShowCredentialModal(false)}
      />
    </div>
  )
}

export default StudentGrades
