import React, { useState, useEffect, useMemo } from 'react'
import api from '../services/api'
import {
  FileCheck2,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  Printer,
  Filter,
  CheckCircle2,
  ShieldAlert,
  Info,
  Layers,
  Sparkles
} from 'lucide-react'

export const StudentExams = () => {
  const [semesters, setSemesters] = useState([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSemesters = async () => {
      try {
        const res = await api.get('/semesters')
        if (res.data?.data && res.data.data.length > 0) {
          setSemesters(res.data.data)
          const active = res.data.data.find(s => s.isActive) || res.data.data[0]
          setSelectedSemester(active.semesterCode)
        }
      } catch (err) {
        console.error('Lỗi tải học kỳ:', err)
        setSelectedSemester('2024-25_SEM2')
      }
    }
    loadSemesters()
  }, [])

  useEffect(() => {
    if (!selectedSemester) return
    const fetchExams = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/student/exams?semester=${selectedSemester}`)
        if (res.data?.data) {
          setExams(res.data.data)
        }
      } catch (err) {
        console.error('Lỗi tải lịch thi:', err)
        setExams([])
      } finally {
        setLoading(false)
      }
    }
    fetchExams()
  }, [selectedSemester])

  const getExamTypeBadge = (type) => {
    switch (type) {
      case 'TRẮC NGHIỆM':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'THỰC HÀNH':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'ĐỒ ÁN':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-blue-50 text-red-700 border-blue-200'
    }
  }

  // Sắp xếp ngày thi
  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
  }, [exams])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
            <FileCheck2 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Lịch Thi & Phòng Thi Học Kỳ</h1>
            <p className="text-xs text-slate-500">Tra cứu ngày thi, giờ thi, số báo danh và phòng thi kết thúc học phần</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter size={15} className="text-slate-500" />
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              {semesters.map((s) => (
                <option key={s.id || s.semesterCode} value={s.semesterCode}>
                  {s.semesterName} {s.isActive ? '(Hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Printer size={15} />
            <span>In lịch thi</span>
          </button>
        </div>
      </div>

      {/* Exam Rules Alert Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3 print:hidden">
        <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Quy chế thi kết thúc học phần:</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800">
            <li>Sinh viên bắt buộc mang theo Thẻ sinh viên hoặc CCCD khi vào phòng thi.</li>
            <li>Có mặt trước cửa phòng thi 15 phút trước giờ phát đề thi.</li>
            <li>Nghiêm cấm mang điện thoại di động, đồng hồ thông minh và các thiết bị thu phát sóng vào phòng thi.</li>
          </ul>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center">
          <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500">Đang tải lịch thi học kỳ...</p>
        </div>
      ) : sortedExams.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-300 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-3">
            <FileCheck2 size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-700">Chưa có lịch thi cho học kỳ này</h3>
          <p className="text-xs text-slate-500 mt-1">Phòng Khảo thí & Đảm bảo chất lượng chưa công bố lịch thi chính thức cho học kỳ {selectedSemester}.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">
              Danh sách các môn thi trong kỳ ({sortedExams.length} môn)
            </h3>
            <span className="text-xs text-slate-500 font-medium">Sắp xếp theo ngày thi</span>
          </div>

          <div className="divide-y divide-slate-100">
            {sortedExams.map((exam, idx) => (
              <div
                key={exam.id || idx}
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
              >
                <div className="flex items-start gap-4">
                  {/* Date badge */}
                  <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex flex-col items-center justify-center text-red-900 shrink-0 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-red-600">
                      {new Date(exam.examDate).toLocaleDateString('vi-VN', { month: 'short' })}
                    </span>
                    <span className="text-xl font-extrabold leading-none">
                      {new Date(exam.examDate).getDate()}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">
                      {new Date(exam.examDate).getFullYear()}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {exam.courseCode}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">({exam.sectionCode})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getExamTypeBadge(exam.examType)}`}>
                        {exam.examType}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-base mt-1">{exam.courseName}</h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                      <span className="flex items-center gap-1 font-semibold text-rose-600">
                        <MapPin size={13} /> Phòng thi: {exam.roomName}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Clock size={13} className="text-red-600" />
                        Giờ thi: {exam.startTime} - {exam.endTime}
                      </span>
                      {exam.credits && (
                        <span>Số TC: <strong>{exam.credits}</strong></span>
                      )}
                    </div>

                    {exam.notes && (
                      <p className="text-xs text-slate-400 italic mt-1.5">
                        * Ghi chú: {exam.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 self-end sm:self-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Số báo danh (SBD)</div>
                  <div className="text-base font-extrabold font-mono text-red-700">SV2024001</div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1 justify-end">
                    <CheckCircle2 size={11} /> Đủ điều kiện dự thi
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
