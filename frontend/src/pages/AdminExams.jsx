import React, { useState, useEffect, useMemo } from 'react'
import api from '../services/api'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  Edit2,
  Trash2,
  Plus,
  Wand2,
  BookOpen,
  Award,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileText,
  Monitor,
  GraduationCap
} from 'lucide-react'

export const AdminExams = () => {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // Filters
  const [selectedSemester, setSelectedSemester] = useState('2024-25_SEM2')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterType, setFilterType] = useState('ALL')

  // Semesters & Class Sections lookups
  const [semestersList, setSemestersList] = useState([])
  const [sectionsList, setSectionsList] = useState([])

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'
  const [editingExamId, setEditingExamId] = useState(null)
  const [formData, setFormData] = useState({
    classSectionId: '',
    examDate: '',
    startTime: '08:00',
    endTime: '09:30',
    roomName: '',
    examType: 'TỰ LUẬN',
    notes: 'Sinh viên mang theo Thẻ sinh viên khi vào phòng thi',
  })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Auto-generate state
  const [autoGenerating, setAutoGenerating] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Fetch Semesters
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const res = await api.get('/semesters')
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setSemestersList(res.data.data)
          const exists = res.data.data.some((s) => s.semesterCode === selectedSemester)
          if (!exists) {
            const active = res.data.data.find((s) => s.isActive) || res.data.data[0]
            if (active?.semesterCode) {
              setSelectedSemester(active.semesterCode)
            }
          }
        }
      } catch (err) {
        setSemestersList([
          { semesterCode: '2024-25_SEM2', semesterName: 'Học kỳ 2 (2024-2025)' },
          { semesterCode: '2025-26_SEM1', semesterName: 'Học kỳ 1 (2025-2026)' },
        ])
      }
    }
    fetchSemesters()
  }, [])

  // Fetch Class Sections for the selected semester
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await api.get('/admin/class-sections', {
          params: { semester: selectedSemester },
        })
        if (res.data?.data && Array.isArray(res.data.data)) {
          setSectionsList(res.data.data)
        } else {
          setSectionsList([])
        }
      } catch (err) {
        // Fallback
        try {
          const resFallback = await api.get('/student/class-sections', {
            params: { semester: selectedSemester },
          })
          if (resFallback.data?.data && Array.isArray(resFallback.data.data)) {
            setSectionsList(resFallback.data.data)
          } else {
            setSectionsList([])
          }
        } catch (ignored) {
          setSectionsList([])
        }
      }
    }
    fetchSections()
  }, [selectedSemester])

  // Fetch Exams
  const fetchExams = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/exam-schedules', {
        params: {
          semester: selectedSemester,
          keyword: searchKeyword || undefined,
        },
      })
      if (res.data?.data && Array.isArray(res.data.data)) {
        setExams(res.data.data)
      } else {
        setExams([])
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể tải danh sách lịch thi', 'error')
      setExams([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExams()
  }, [selectedSemester, searchKeyword])

  // Stats calculation
  const stats = useMemo(() => {
    const total = exams.length
    const computerLab = exams.filter((e) => e.examType === 'THI MÁY').length
    const paper = exams.filter((e) => e.examType === 'TỰ LUẬN').length
    const defense = exams.filter((e) => e.examType === 'BẢO VỆ ĐỒ ÁN' || e.examType === 'VẤN ĐÁP').length
    const totalStudents = exams.reduce((acc, cur) => acc + (cur.currentEnrolled || 0), 0)
    return { total, computerLab, paper, defense, totalStudents }
  }, [exams])

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (filterType !== 'ALL' && e.examType !== filterType) return false
      return true
    })
  }, [exams, filterType])

  // Handle open modal
  const handleOpenCreate = () => {
    setModalMode('create')
    setEditingExamId(null)
    setFormData({
      classSectionId: sectionsList[0]?.id || '',
      examDate: new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '09:30',
      roomName: sectionsList[0]?.roomName || 'LAB-201',
      examType: 'TỰ LUẬN',
      notes: 'Sinh viên mang theo Thẻ sinh viên khi vào phòng thi',
    })
    setFormError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (exam) => {
    setModalMode('edit')
    setEditingExamId(exam.id)
    setFormData({
      classSectionId: exam.classSectionId || '',
      examDate: exam.examDate || '',
      startTime: exam.startTime?.slice(0, 5) || '08:00',
      endTime: exam.endTime?.slice(0, 5) || '09:30',
      roomName: exam.roomName || '',
      examType: exam.examType || 'TỰ LUẬN',
      notes: exam.notes || '',
    })
    setFormError('')
    setIsModalOpen(true)
  }

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!formData.examDate) {
      setFormError('Vui lòng chọn ngày thi')
      return
    }
    if (!formData.startTime || !formData.endTime) {
      setFormError('Vui lòng nhập giờ bắt đầu và kết thúc ca thi')
      return
    }
    if (formData.startTime >= formData.endTime) {
      setFormError('Giờ bắt đầu phải trước giờ kết thúc ca thi')
      return
    }
    if (!formData.roomName.trim()) {
      setFormError('Vui lòng nhập phòng thi')
      return
    }

    setFormSubmitting(true)
    try {
      const payload = {
        ...formData,
        classSectionId: formData.classSectionId ? Number(formData.classSectionId) : undefined,
        startTime: formData.startTime?.length === 5 ? `${formData.startTime}:00` : formData.startTime,
        endTime: formData.endTime?.length === 5 ? `${formData.endTime}:00` : formData.endTime,
      }

      if (modalMode === 'create') {
        if (!payload.classSectionId) {
          setFormError('Vui lòng chọn lớp học phần')
          setFormSubmitting(false)
          return
        }
        await api.post('/admin/exam-schedules', payload)
        showToast('Tạo lịch thi mới thành công!', 'success')
      } else {
        await api.put(`/admin/exam-schedules/${editingExamId}`, payload)
        showToast('Cập nhật thông tin ca thi thành công!', 'success')
      }
      setIsModalOpen(false)
      fetchExams()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu lịch thi')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Handle Delete
  const handleDelete = async (exam) => {
    if (
      !window.confirm(
        `Xác nhận xóa ca thi môn "${exam.courseName}" (Lớp ${exam.sectionCode}) vào ngày ${exam.examDate}?`
      )
    ) {
      return
    }
    try {
      await api.delete(`/admin/exam-schedules/${exam.id}`)
      showToast('Đã xóa ca thi thành công', 'success')
      fetchExams()
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi xóa lịch thi', 'error')
    }
  }

  // Handle Auto Generate
  const handleAutoGenerate = async () => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn tự động tạo lịch thi dự thảo cho các lớp học phần chưa có lịch trong kỳ "${selectedSemester}"?`
      )
    ) {
      return
    }
    setAutoGenerating(true)
    try {
      const res = await api.post(`/admin/exam-schedules/auto-generate?semester=${selectedSemester}`)
      const count = res.data?.data?.createdCount || 0
      showToast(`Tự động lập lịch thành công! Đã thêm mới ${count} ca thi.`, 'success')
      fetchExams()
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi tự động lập lịch thi', 'error')
    } finally {
      setAutoGenerating(false)
    }
  }

  const getExamTypeBadge = (type) => {
    switch (type) {
      case 'THI MÁY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'BẢO VỆ ĐỒ ÁN':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'TRẮC NGHIỆM':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'VẤN ĐÁP':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200'
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-stone-500 text-xs font-mono mb-1">
            <span>HỆ THỐNG QUẢN TRỊ ĐÀO TẠO</span>
            <span>&bull;</span>
            <span className="text-red-700 font-semibold">LỊCH THI & PHÒNG THI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
            <Calendar className="text-red-700" size={28} />
            Quản Lý Lịch Thi & Ca Thi Tập Trung
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Điều phối phòng thi, ngày thi và hình thức thi. Dữ liệu này đồng bộ trực tiếp tới thời khóa biểu, lịch thi cá nhân và WebCal Feed của sinh viên.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={handleAutoGenerate}
            disabled={autoGenerating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-300 transition cursor-pointer shadow-xs"
            title="Tự động xếp lịch cho các lớp học phần chưa có lịch thi"
          >
            {autoGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} className="text-amber-600" />}
            <span>Tự động lập lịch</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-red-700 text-white hover:bg-red-800 transition cursor-pointer shadow-sm"
          >
            <Plus size={16} />
            <span>Thêm ca thi mới</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Tổng ca thi</span>
            <Award size={16} className="text-red-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">{stats.total}</div>
          <div className="text-[11px] text-stone-500 mt-1">Trong kỳ {selectedSemester}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Thi thực hành (Máy)</span>
            <Monitor size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">{stats.computerLab}</div>
          <div className="text-[11px] text-stone-500 mt-1">Phòng máy & Lab</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Thi tự luận (Giấy)</span>
            <FileText size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono">{stats.paper}</div>
          <div className="text-[11px] text-stone-500 mt-1">Hội trường & Giảng đường</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Bảo vệ / Vấn đáp</span>
            <GraduationCap size={16} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono">{stats.defense}</div>
          <div className="text-[11px] text-stone-500 mt-1">Hội đồng chấm thi</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Lượt thí sinh</span>
            <Users size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">{stats.totalStudents}</div>
          <div className="text-[11px] text-stone-500 mt-1">Tổng sinh viên tham gia</div>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Semester Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider font-mono">Học kỳ:</span>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
            >
              {semestersList.map((s) => (
                <option key={s.semesterCode} value={s.semesterCode}>
                  {s.semesterName || s.semesterCode}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider font-mono">Hình thức:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
            >
              <option value="ALL">Tất cả hình thức</option>
              <option value="TỰ LUẬN">Tự luận</option>
              <option value="THI MÁY">Thi máy</option>
              <option value="TRẮC NGHIỆM">Trắc nghiệm</option>
              <option value="BẢO VỆ ĐỒ ÁN">Bảo vệ đồ án</option>
              <option value="VẤN ĐÁP">Vấn đáp</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm mã môn, tên môn, phòng thi..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-stone-50 focus:bg-white"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-red-700" size={32} />
            <p className="text-sm font-medium">Đang tải danh sách lịch thi...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <Calendar size={48} className="mx-auto text-stone-300 mb-3" />
            <p className="text-base font-semibold text-stone-700">Chưa có lịch thi nào trong học kỳ này</p>
            <p className="text-xs text-stone-400 mt-1">
              Bạn có thể nhấn nút "Tự động lập lịch" hoặc "Thêm ca thi mới" ở góc trên để khởi tạo lịch thi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-mono uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Môn học</th>
                  <th className="py-3 px-4">Lớp HP</th>
                  <th className="py-3 px-4">Thời gian thi</th>
                  <th className="py-3 px-4">Phòng thi</th>
                  <th className="py-3 px-4">Hình thức</th>
                  <th className="py-3 px-4">Sĩ số / Sức chứa</th>
                  <th className="py-3 px-4">Giảng viên</th>
                  <th className="py-3 px-4">Ghi chú</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-stone-50/80 transition">
                    {/* Course */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900">{exam.courseName}</div>
                      <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-red-700">{exam.courseCode}</span>
                        {exam.credits && <span>&bull; {exam.credits} TC</span>}
                      </div>
                    </td>

                    {/* Section Code */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-stone-800">
                      {exam.sectionCode}
                    </td>

                    {/* Exam Date & Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                        <Calendar size={13} className="text-stone-400" />
                        {exam.examDate}
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} className="text-stone-400" />
                        {exam.startTime?.slice(0, 5)} - {exam.endTime?.slice(0, 5)}
                      </div>
                    </td>

                    {/* Room */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 font-mono font-bold text-stone-800">
                        <MapPin size={12} className="text-red-600" />
                        {exam.roomName}
                      </div>
                    </td>

                    {/* Exam Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider font-mono ${getExamTypeBadge(
                          exam.examType
                        )}`}
                      >
                        {exam.examType}
                      </span>
                    </td>

                    {/* Students */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                      <span className="font-bold text-stone-900">{exam.currentEnrolled || 0}</span>
                      <span className="text-stone-400"> / {exam.maxCapacity || 40} SV</span>
                    </td>

                    {/* Lecturer */}
                    <td className="py-3.5 px-4 text-stone-700 whitespace-nowrap">
                      {exam.lecturerName || 'Chưa phân công'}
                    </td>

                    {/* Notes */}
                    <td className="py-3.5 px-4 text-stone-500 max-w-[200px] truncate" title={exam.notes}>
                      {exam.notes || '-'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(exam)}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/70 transition cursor-pointer"
                          title="Chỉnh sửa ca thi"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(exam)}
                          className="p-1.5 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50 transition cursor-pointer"
                          title="Xóa ca thi"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="text-red-700" size={20} />
                <h3 className="font-extrabold text-stone-900 text-base">
                  {modalMode === 'create' ? 'Thêm Ca Thi Mới' : 'Chỉnh Sửa Ca Thi'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Class Section Selection */}
              {modalMode === 'create' ? (
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Lớp học phần *
                  </label>
                  <select
                    value={formData.classSectionId}
                    onChange={(e) => {
                      const secId = e.target.value
                      const sec = sectionsList.find((s) => String(s.id) === String(secId))
                      setFormData({
                        ...formData,
                        classSectionId: secId,
                        roomName: sec?.roomName || formData.roomName,
                      })
                    }}
                    required
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                  >
                    <option value="">-- Chọn lớp học phần --</option>
                    {sectionsList.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        [{sec.sectionCode}] {sec.courseName || sec.course?.name || 'Môn học'} - {sec.roomName || 'Chưa xếp phòng'}
                      </option>
                    ))}
                  </select>
                  {sectionsList.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      Chưa có lớp học phần nào trong học kỳ này để xếp lịch thi.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs space-y-1">
                  <div className="text-stone-500 font-mono text-[11px] uppercase">Lớp học phần đang chỉnh sửa:</div>
                  <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <span className="font-mono text-red-700 font-extrabold">{exams.find((e) => e.id === editingExamId)?.sectionCode}</span>
                    <span>&bull;</span>
                    <span>{exams.find((e) => e.id === editingExamId)?.courseName}</span>
                  </div>
                </div>
              )}

              {/* Date & Room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Ngày thi *
                  </label>
                  <input
                    type="date"
                    value={formData.examDate}
                    onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                    required
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Phòng thi *
                  </label>
                  <input
                    type="text"
                    value={formData.roomName}
                    onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                    placeholder="VD: LAB-201, P-304"
                    required
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                  />
                </div>
              </div>

              {/* Time Slots */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Giờ bắt đầu *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="w-full text-xs font-mono font-medium px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Giờ kết thúc *
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    className="w-full text-xs font-mono font-medium px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                  />
                </div>
              </div>

              {/* Exam Type */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Hình thức thi *
                </label>
                <select
                  value={formData.examType}
                  onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                >
                  <option value="TỰ LUẬN">Tự luận (Giấy)</option>
                  <option value="THI MÁY">Thi trên máy tính (LAB)</option>
                  <option value="TRẮC NGHIỆM">Trắc nghiệm</option>
                  <option value="BẢO VỆ ĐỒ ÁN">Bảo vệ đồ án / Khóa luận</option>
                  <option value="VẤN ĐÁP">Vấn đáp trực tiếp</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Ghi chú cho thí sinh
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú mang theo thẻ SV, máy tính bỏ túi..."
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-red-700 text-white hover:bg-red-800 transition cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{modalMode === 'create' ? 'Tạo ca thi' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default AdminExams
