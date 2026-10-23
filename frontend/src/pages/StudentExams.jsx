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
  ShieldCheck
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
        return 'bg-red-50 text-red-800 border-red-200'
      case 'THỰC HÀNH':
        return 'bg-stone-100 text-stone-800 border-stone-300'
      case 'ĐỒ ÁN':
        return 'bg-stone-100 text-stone-800 border-stone-300'
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200'
    }
  }

  // Sắp xếp ngày thi
  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
  }, [exams])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Official Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700">
            Học Viện Công Nghệ Rikkei • Ban Khảo Thí & Đảm Bảo Chất Lượng
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
            Lịch Thi & Giấy Báo Dự Thi Kết Thúc Học Phần
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Thông tin số báo danh (SBD), phòng thi, ca thi và hình thức đánh giá chính thức
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
            <Filter size={14} className="text-stone-500" />
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="bg-transparent text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 transition border border-stone-200"
          >
            <Printer size={14} />
            <span>In thẻ dự thi</span>
          </button>
        </div>
      </div>

      {/* 2. Official Exam Rules Dispatch */}
      <div className="bg-stone-50 border border-stone-200/90 rounded-xl p-4 text-xs text-stone-700 flex items-start gap-3 print:hidden">
        <ShieldAlert size={18} className="text-red-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-stone-900 font-mono text-[11px] uppercase">
            Quy định giám thị & Kỷ luật phòng thi học kỳ:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-stone-600 text-[11px]">
            <li>Sinh viên phải xuất trình Thẻ sinh viên điện tử / CCCD hợp lệ trước khi vào bàn thi.</li>
            <li>Có mặt trước cửa phòng thi 15 phút. Sinh viên đến muộn quá 15 phút sau khi bóc túi đề thi sẽ không được dự thi.</li>
            <li>Không mang điện thoại, tài liệu không được phép vào phòng thi. Vi phạm sẽ bị lập biên bản đình chỉ thi.</li>
          </ul>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-stone-200/90 text-center">
          <div className="inline-block w-8 h-8 border-3 border-red-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs text-stone-600">Đang tra cứu lịch thi chính thức từ phòng Khảo thí...</p>
        </div>
      ) : sortedExams.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-stone-300 text-center">
          <FileCheck2 size={32} className="mx-auto text-stone-300 mb-2" />
          <h3 className="text-sm font-bold text-stone-700">Chưa có lịch thi cho học kỳ này</h3>
          <p className="text-xs text-stone-500 mt-1">Lịch thi sẽ được công bố sau khi kết thúc tuần đăng ký và học bù.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 bg-stone-50/50 border-b border-stone-200/80 flex items-center justify-between">
            <h3 className="font-bold text-xs sm:text-sm text-stone-900 uppercase font-mono tracking-wider">
              Danh Mục Môn Thi Kết Thúc Học Phần ({sortedExams.length} môn)
            </h3>
            <span className="text-[11px] font-mono text-stone-600">
              Sắp xếp theo thứ tự ngày thi
            </span>
          </div>

          <div className="divide-y divide-stone-100 font-sans">
            {sortedExams.map((exam, idx) => (
              <div
                key={exam.id || idx}
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-stone-50/60 transition"
              >
                <div className="flex items-start gap-4">
                  {/* Date badge */}
                  <div className="w-16 h-16 rounded-xl bg-stone-100 border border-stone-200 flex flex-col items-center justify-center text-stone-900 shrink-0">
                    <span className="text-[10px] font-mono font-bold uppercase text-red-700">
                      Tháng {new Date(exam.examDate).getMonth() + 1}
                    </span>
                    <span className="text-xl font-mono font-bold leading-none">
                      {new Date(exam.examDate).getDate()}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">
                      {new Date(exam.examDate).getFullYear()}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {exam.courseCode}
                      </span>
                      <span className="text-xs text-stone-500 font-mono">({exam.sectionCode})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${getExamTypeBadge(exam.examType)}`}>
                        {exam.examType}
                      </span>
                    </div>

                    <h4 className="font-bold text-stone-900 text-sm sm:text-base mt-1">{exam.courseName}</h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 mt-1.5 font-sans">
                      <span className="flex items-center gap-1 font-semibold text-red-800">
                        <MapPin size={13} /> Phòng thi: {exam.roomName}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-stone-800">
                        <Clock size={13} className="text-stone-500" />
                        {exam.startTime} - {exam.endTime}
                      </span>
                      {exam.credits && (
                        <span className="font-mono">Số TC: <strong>{exam.credits}</strong></span>
                      )}
                    </div>

                    {exam.notes && (
                      <p className="text-[11px] text-stone-500 italic mt-1 font-mono">
                        * Ghi chú: {exam.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 self-end sm:self-center bg-stone-50 px-4 py-2.5 rounded-lg border border-stone-200">
                  <div className="text-[10px] uppercase font-mono font-bold text-stone-500">Số báo danh (SBD)</div>
                  <div className="text-base font-bold font-mono text-stone-900">SV2024001</div>
                  <div className="text-[10px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1 justify-end">
                    <ShieldCheck size={12} /> Đủ điều kiện dự thi
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

export default StudentExams
