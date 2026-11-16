import React, { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import api from '../services/api'
import { confirmDialog, alertDialog } from '../store/confirmStore'
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
  AlertTriangle,
  Loader2,
  X,
  FileText,
  FileSpreadsheet,
  Download,
  Upload,
  Check,
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

  // Conflict filter state
  const [filterOnlyConflicts, setFilterOnlyConflicts] = useState(false)

  // Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [parsedImportRows, setParsedImportRows] = useState([])
  const [importOverwrite, setImportOverwrite] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importResultModal, setImportResultModal] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Fetch Semesters
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const res = await api.get('/semesters')
        if (res.data?.data && Array.isArray(res.data.data)) {
          setSemestersList(res.data.data)
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
        if (res.data?.data) {
          setSectionsList(res.data.data)
        }
      } catch (err) {
        // Fallback
        try {
          const resFallback = await api.get('/student/class-sections', {
            params: { semester: selectedSemester },
          })
          if (resFallback.data?.data) {
            setSectionsList(resFallback.data.data)
          }
        } catch (ignored) {}
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

  // Room Conflicts Detection (Trùng ngày, cùng phòng, giờ thi chồng lấn)
  const roomConflicts = useMemo(() => {
    const conflicts = new Map()
    for (let i = 0; i < exams.length; i++) {
      for (let j = i + 1; j < exams.length; j++) {
        const e1 = exams[i]
        const e2 = exams[j]
        if (
          e1.examDate &&
          e2.examDate &&
          e1.examDate === e2.examDate &&
          e1.roomName &&
          e2.roomName &&
          e1.roomName.trim().toLowerCase() === e2.roomName.trim().toLowerCase()
        ) {
          const s1 = e1.startTime?.slice(0, 5) || ''
          const en1 = e1.endTime?.slice(0, 5) || ''
          const s2 = e2.startTime?.slice(0, 5) || ''
          const en2 = e2.endTime?.slice(0, 5) || ''
          if (s1 < en2 && s2 < en1) {
            if (!conflicts.has(e1.id)) conflicts.set(e1.id, [])
            if (!conflicts.has(e2.id)) conflicts.set(e2.id, [])
            conflicts.get(e1.id).push(e2)
            conflicts.get(e2.id).push(e1)
          }
        }
      }
    }
    return conflicts
  }, [exams])

  // Stats calculation
  const stats = useMemo(() => {
    const total = exams.length
    const computerLab = exams.filter((e) => e.examType === 'THI MÁY').length
    const paper = exams.filter((e) => e.examType === 'TỰ LUẬN').length
    const defense = exams.filter((e) => e.examType === 'BẢO VỆ ĐỒ ÁN' || e.examType === 'VẤN ĐÁP').length
    const totalStudents = exams.reduce((acc, cur) => acc + (cur.currentEnrolled || 0), 0)
    const conflictCount = roomConflicts.size
    return { total, computerLab, paper, defense, totalStudents, conflictCount }
  }, [exams, roomConflicts])

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (filterType !== 'ALL' && e.examType !== filterType) return false
      if (filterOnlyConflicts && !roomConflicts.has(e.id)) return false
      return true
    })
  }, [exams, filterType, filterOnlyConflicts, roomConflicts])

  // Lớp học phần chưa có lịch thi trong kỳ hiện tại
  const sectionsWithoutExam = useMemo(() => {
    const scheduledSectionIds = new Set(exams.map((e) => e.classSectionId).filter(Boolean))
    return sectionsList.filter((s) => !scheduledSectionIds.has(s.id))
  }, [sectionsList, exams])

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

    if (modalMode === 'create' && !formData.classSectionId) {
      alertDialog({
        title: 'Thiếu thông tin bắt buộc',
        message: 'Vui lòng chọn Lớp học phần cần xếp lịch thi.',
        variant: 'warning'
      })
      return
    }
    if (!formData.examDate) {
      alertDialog({
        title: 'Thiếu thông tin bắt buộc',
        message: 'Vui lòng chọn Ngày thi.',
        variant: 'warning'
      })
      return
    }
    if (!formData.roomName?.trim()) {
      alertDialog({
        title: 'Thiếu thông tin bắt buộc',
        message: 'Vui lòng nhập Phòng thi.',
        variant: 'warning'
      })
      return
    }
    if (!formData.startTime || !formData.endTime) {
      alertDialog({
        title: 'Thiếu thông tin bắt buộc',
        message: 'Vui lòng nhập Giờ bắt đầu và Giờ kết thúc ca thi.',
        variant: 'warning'
      })
      return
    }
    if (formData.startTime >= formData.endTime) {
      alertDialog({
        title: 'Giờ thi không hợp lệ',
        message: 'Giờ bắt đầu phải trước giờ kết thúc ca thi.',
        variant: 'warning'
      })
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
    const confirmed = await confirmDialog({
      title: 'Xác nhận xóa ca thi',
      message: `Bạn có chắc chắn muốn xóa ca thi môn "${exam.courseName}" (Lớp ${exam.sectionCode}) vào ngày ${exam.examDate}?`,
      confirmText: 'Xóa ca thi',
      cancelText: 'Hủy bỏ',
      variant: 'danger',
    })
    if (!confirmed) return

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
    const allAssigned = sectionsList.length > 0 && sectionsWithoutExam.length === 0
    let overwrite = false

    if (allAssigned) {
      const confirmed = await confirmDialog({
        title: 'Tất cả lớp học phần đã có lịch thi',
        message: `Học kỳ "${selectedSemester}" hiện đã có đầy đủ ${exams.length} ca thi cho toàn bộ các lớp học phần.\n\nBạn có muốn TẠO LẠI TOÀN BỘ (ghi đè lịch thi cũ) không? Toàn bộ ca thi hiện tại của kỳ này sẽ được làm mới lại ngày giờ và phòng thi dự thảo.`,
        confirmText: 'Tạo lại toàn bộ (Ghi đè)',
        cancelText: 'Hủy bỏ',
        variant: 'warning',
      })
      if (!confirmed) return
      overwrite = true
    } else {
      const missingCount = sectionsWithoutExam.length
      const message =
        missingCount > 0
          ? `Học kỳ "${selectedSemester}" có ${missingCount}/${sectionsList.length} lớp học phần chưa có lịch thi.\n\nBạn có muốn hệ thống tự động phân bổ ngày thi, ca thi và phòng thi dự thảo cho các lớp này không?`
          : `Bạn có muốn hệ thống tự động quét và tạo lịch thi dự thảo cho các lớp học phần trong kỳ "${selectedSemester}" không?`

      const confirmed = await confirmDialog({
        title: 'Tự động lập lịch thi dự thảo',
        message,
        confirmText: 'Bắt đầu xếp lịch',
        cancelText: 'Hủy bỏ',
        variant: 'info',
      })
      if (!confirmed) return
      overwrite = false
    }

    setAutoGenerating(true)
    try {
      const res = await api.post('/admin/exam-schedules/auto-generate', null, {
        params: {
          semester: selectedSemester,
          overwrite,
        },
      })
      const count = res.data?.data?.createdCount || 0
      if (count > 0) {
        showToast(
          overwrite
            ? `Đã tạo lại toàn bộ ${count} ca thi dự thảo cho học kỳ!`
            : `Tự động lập lịch thành công! Đã thêm mới ${count} ca thi.`,
          'success'
        )
      } else {
        await alertDialog({
          title: 'Thông báo',
          message: 'Tất cả các lớp học phần trong kỳ đều đã có lịch thi. Không có ca thi nào được tạo thêm.',
          confirmText: 'Đã hiểu',
          variant: 'info',
        })
      }
      fetchExams()
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi tự động lập lịch thi', 'error')
    } finally {
      setAutoGenerating(false)
    }
  }

  // Xuất file Excel
  const exportToExcel = () => {
    if (!exams || exams.length === 0) {
      showToast('Không có dữ liệu lịch thi để xuất Excel', 'error')
      return
    }

    const rows = filteredExams.map((e, index) => ({
      'STT': index + 1,
      'Mã môn học': e.courseCode || '',
      'Tên môn học': e.courseName || '',
      'Mã lớp học phần': e.sectionCode || '',
      'Số tín chỉ': e.credits || 0,
      'Giảng viên phụ trách': e.lecturerName || '',
      'Ngày thi': e.examDate || '',
      'Giờ bắt đầu': e.startTime?.slice(0, 5) || '',
      'Giờ kết thúc': e.endTime?.slice(0, 5) || '',
      'Phòng thi': e.roomName || '',
      'Hình thức thi': e.examType || '',
      'Đã đăng ký': e.currentEnrolled || 0,
      'Sĩ số tối đa': e.maxCapacity || 40,
      'Ghi chú': e.notes || '',
      'Tình trạng phòng': roomConflicts.has(e.id) ? 'CẢNH BÁO: Trùng phòng thi!' : 'Hợp lệ',
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lịch thi')

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 28 },
      { wch: 18 },
      { wch: 10 },
      { wch: 24 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 35 },
      { wch: 30 },
    ]

    const filename = `Lich_Thi_${selectedSemester}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, filename)
    showToast('Đã xuất file Excel lịch thi thành công!', 'success')
  }

  // Tải file mẫu Excel
  const downloadSampleExcel = () => {
    const sampleRows = [
      {
        'Mã lớp học phần': sectionsList[0]?.sectionCode || 'AI101-2025-01',
        'Tên môn học (tham khảo)': sectionsList[0]?.courseName || 'Artificial Intelligence Basics',
        'Ngày thi (YYYY-MM-DD)': '2026-12-10',
        'Giờ bắt đầu (HH:mm)': '08:00',
        'Giờ kết thúc (HH:mm)': '09:30',
        'Phòng thi': 'LAB-201',
        'Hình thức thi': 'THI MÁY',
        'Ghi chú': 'Sinh viên có mặt trước 15 phút mang thẻ sinh viên',
      },
      {
        'Mã lớp học phần': sectionsList[1]?.sectionCode || 'CS101-01',
        'Tên môn học (tham khảo)': sectionsList[1]?.courseName || 'Lập trình căn bản',
        'Ngày thi (YYYY-MM-DD)': '2026-12-11',
        'Giờ bắt đầu (HH:mm)': '10:30',
        'Giờ kết thúc (HH:mm)': '12:00',
        'Phòng thi': 'P-302',
        'Hình thức thi': 'TỰ LUẬN',
        'Ghi chú': 'Không được sử dụng tài liệu',
      },
    ]

    const ws = XLSX.utils.json_to_sheet(sampleRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Import_Lich_Thi')
    ws['!cols'] = [
      { wch: 22 },
      { wch: 30 },
      { wch: 22 },
      { wch: 20 },
      { wch: 20 },
      { wch: 16 },
      { wch: 18 },
      { wch: 45 },
    ]
    XLSX.writeFile(wb, 'Mau_Import_Lich_Thi.xlsx')
  }

  // Đọc file Excel tải lên
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const rawJson = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (!rawJson || rawJson.length === 0) {
          alertDialog({
            title: 'File Excel trống',
            message: 'Không tìm thấy dữ liệu trong file đã chọn.',
            variant: 'warning',
          })
          return
        }

        const validSectionsMap = new Map(sectionsList.map((s) => [s.sectionCode?.toUpperCase(), s]))

        const parsed = rawJson.map((row, idx) => {
          const getVal = (...keys) => {
            for (const k of keys) {
              const found = Object.keys(row).find(
                (rk) => rk.trim().toLowerCase() === k.trim().toLowerCase()
              )
              if (found && row[found] !== undefined && row[found] !== '') {
                return String(row[found]).trim()
              }
            }
            return ''
          }

          const sectionCode = getVal('mã lớp học phần', 'mã lớp hp', 'mã lớp', 'sectioncode', 'section_code')
          const examDate = getVal('ngày thi (yyyy-mm-dd)', 'ngày thi', 'examdate', 'exam_date', 'date')
          const startTime = getVal('giờ bắt đầu (hh:mm)', 'giờ bắt đầu', 'starttime', 'start_time', 'start')
          const endTime = getVal('giờ kết thúc (hh:mm)', 'giờ kết thúc', 'endtime', 'end_time', 'end')
          const roomName = getVal('phòng thi', 'phòng', 'roomname', 'room_name', 'room')
          const examType = getVal('hình thức thi', 'hình thức', 'examtype', 'exam_type') || 'TỰ LUẬN'
          const notes = getVal('ghi chú', 'notes', 'note') || 'Sinh viên mang theo Thẻ sinh viên khi vào phòng thi'

          const errors = []
          if (!sectionCode) errors.push('Thiếu mã lớp học phần')
          if (!examDate) errors.push('Thiếu ngày thi')
          if (!startTime) errors.push('Thiếu giờ bắt đầu')
          if (!endTime) errors.push('Thiếu giờ kết thúc')
          if (!roomName) errors.push('Thiếu phòng thi')

          const matchedSection = sectionCode ? validSectionsMap.get(sectionCode.toUpperCase()) : null

          return {
            rowIdx: idx + 1,
            sectionCode,
            examDate,
            startTime,
            endTime,
            roomName,
            examType,
            notes,
            courseName: matchedSection?.courseName || getVal('tên môn học (tham khảo)', 'tên môn học', 'môn học') || '',
            classSectionId: matchedSection?.id,
            isValid: errors.length === 0,
            errors,
          }
        })

        setParsedImportRows(parsed)
      } catch (err) {
        console.error('Lỗi khi đọc file Excel:', err)
        alertDialog({
          title: 'Lỗi đọc file Excel',
          message: 'Không thể đọc nội dung file. Vui lòng kiểm tra lại định dạng file .xlsx hoặc .xls.',
          variant: 'danger',
        })
      }
    }
    reader.readAsBinaryString(file)
  }

  // Thực hiện Import vào Backend
  const handleExecuteImport = async () => {
    const validRows = parsedImportRows.filter((r) => r.isValid)
    if (validRows.length === 0) {
      alertDialog({
        title: 'Không có dữ liệu hợp lệ',
        message: 'Không tìm thấy dòng dữ liệu hợp lệ nào để nhập.',
        variant: 'warning',
      })
      return
    }

    setImporting(true)
    try {
      const payload = validRows.map((r) => ({
        classSectionId: r.classSectionId,
        sectionCode: r.sectionCode,
        examDate: r.examDate,
        startTime: r.startTime.length === 5 ? r.startTime : r.startTime.slice(0, 5),
        endTime: r.endTime.length === 5 ? r.endTime : r.endTime.slice(0, 5),
        roomName: r.roomName,
        examType: r.examType,
        notes: r.notes,
      }))

      const res = await api.post('/admin/exam-schedules/batch', payload, {
        params: { overwrite: importOverwrite },
      })
      const resultData = res.data?.data || {}
      setImportResultModal(resultData)
      setIsImportModalOpen(false)
      setParsedImportRows([])
      fetchExams()
      showToast(`Đã xử lý nhập ${resultData.successCount || 0} ca thi thành công!`, 'success')
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi nhập lịch thi', 'error')
    } finally {
      setImporting(false)
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
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer shadow-xs"
            title="Xuất toàn bộ lịch thi của học kỳ ra file Excel (.xlsx)"
          >
            <Download size={15} className="text-emerald-700" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={() => {
              setParsedImportRows([])
              setIsImportModalOpen(true)
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300 transition cursor-pointer shadow-xs"
            title="Nhập danh sách lịch thi hàng loạt từ file Excel"
          >
            <Upload size={15} className="text-blue-700" />
            <span>Nhập từ Excel</span>
          </button>

          <button
            onClick={handleAutoGenerate}
            disabled={autoGenerating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-300 transition cursor-pointer shadow-xs"
            title="Tự động xếp lịch cho các lớp học phần chưa có lịch thi"
          >
            {autoGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} className="text-amber-600" />}
            <span>Tự động lập lịch</span>
            {sectionsWithoutExam.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-200 text-amber-900 font-bold">
                +{sectionsWithoutExam.length}
              </span>
            )}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
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

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Lượt thí sinh</span>
            <Users size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">{stats.totalStudents}</div>
          <div className="text-[11px] text-stone-500 mt-1">Tổng sinh viên dự thi</div>
        </div>

        <div
          onClick={() => {
            if (stats.conflictCount > 0) {
              setFilterOnlyConflicts(!filterOnlyConflicts)
            }
          }}
          className={`p-4 rounded-2xl border shadow-xs transition ${
            stats.conflictCount > 0
              ? 'bg-amber-50/80 border-amber-300 cursor-pointer hover:bg-amber-100/80'
              : 'bg-white border-stone-200'
          }`}
          title={stats.conflictCount > 0 ? 'Nhấn để lọc các ca thi trùng phòng' : 'Không có xung đột phòng thi'}
        >
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className={`text-xs font-medium ${stats.conflictCount > 0 ? 'text-amber-900 font-bold' : ''}`}>
              Xung đột phòng
            </span>
            <AlertTriangle size={16} className={stats.conflictCount > 0 ? 'text-amber-600' : 'text-stone-300'} />
          </div>
          <div className={`text-2xl font-black font-mono ${stats.conflictCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {stats.conflictCount}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            {stats.conflictCount > 0
              ? (filterOnlyConflicts ? 'Đang lọc xem ca trùng' : 'Click để lọc xem')
              : 'Phân bổ hợp lệ'}
          </div>
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

          {/* Conflict Filter Toggle */}
          {stats.conflictCount > 0 && (
            <button
              onClick={() => setFilterOnlyConflicts(!filterOnlyConflicts)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                filterOnlyConflicts
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle size={13} />
              <span>{filterOnlyConflicts ? 'Đang lọc ca trùng phòng' : `Xem ${stats.conflictCount} ca trùng phòng`}</span>
              {filterOnlyConflicts && <X size={12} className="ml-0.5" />}
            </button>
          )}
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
                      {roomConflicts.has(exam.id) && (
                        <div
                          className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"
                          title={`Trùng phòng với: ${roomConflicts.get(exam.id).map((c) => c.sectionCode).join(', ')}`}
                        >
                          <AlertTriangle size={10} className="shrink-0" />
                          <span>Trùng phòng!</span>
                        </div>
                      )}
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
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                  >
                    <option value="">-- Chọn lớp học phần --</option>
                    {sectionsList.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        [{sec.sectionCode}] {sec.course?.name || sec.courseName} - {sec.roomName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

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

      {/* Modal Nhập Lịch Thi Từ File Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="text-emerald-700" size={22} />
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base">
                    Nhập Lịch Thi Hàng Loạt Từ File Excel
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Tải lên file danh sách phân bổ phòng thi và ngày thi (.xlsx, .xls)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false)
                  setParsedImportRows([])
                }}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Step 1: Download Template */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <span>1. File mẫu chuẩn Excel</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      Khuyến nghị
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Sử dụng đúng cấu trúc cột để hệ thống tự động ánh xạ với mã lớp học phần.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-stone-300 text-stone-800 hover:bg-stone-100 transition cursor-pointer shadow-2xs"
                >
                  <Download size={14} className="text-emerald-600" />
                  <span>Tải file mẫu Excel</span>
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  2. Chọn file Excel danh sách lịch thi
                </label>
                <div className="border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-stone-50/50 hover:bg-emerald-50/30 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload size={28} className="mx-auto text-stone-400 mb-2" />
                  <div className="text-xs font-bold text-stone-800">
                    Kéo thả file vào đây hoặc <span className="text-red-700 underline">bấm để chọn file</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">Hỗ trợ các định dạng .xlsx, .xls</div>
                </div>
              </div>

              {/* Step 3: Preview parsed data */}
              {parsedImportRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-stone-200 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900">
                        Đã đọc {parsedImportRows.length} dòng:
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {parsedImportRows.filter((r) => r.isValid).length} hợp lệ
                      </span>
                      {parsedImportRows.some((r) => !r.isValid) && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          {parsedImportRows.filter((r) => !r.isValid).length} dòng lỗi
                        </span>
                      )}
                    </div>

                    <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={importOverwrite}
                        onChange={(e) => setImportOverwrite(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span>Cập nhật nếu lớp học phần đã có lịch thi</span>
                    </label>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-stone-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-stone-100 sticky top-0 text-[11px] text-stone-600 font-mono uppercase">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Mã lớp HP</th>
                          <th className="py-2 px-3">Môn học</th>
                          <th className="py-2 px-3">Ngày thi</th>
                          <th className="py-2 px-3">Ca thi</th>
                          <th className="py-2 px-3">Phòng</th>
                          <th className="py-2 px-3">Hình thức</th>
                          <th className="py-2 px-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono">
                        {parsedImportRows.map((row) => (
                          <tr
                            key={row.rowIdx}
                            className={row.isValid ? 'hover:bg-stone-50' : 'bg-rose-50/50'}
                          >
                            <td className="py-2 px-3 text-stone-400">{row.rowIdx}</td>
                            <td className="py-2 px-3 font-bold text-stone-800">{row.sectionCode}</td>
                            <td className="py-2 px-3 font-sans max-w-[140px] truncate text-stone-700">
                              {row.courseName || '-'}
                            </td>
                            <td className="py-2 px-3 text-stone-800">{row.examDate}</td>
                            <td className="py-2 px-3 text-stone-600">
                              {row.startTime} - {row.endTime}
                            </td>
                            <td className="py-2 px-3 font-bold text-stone-900">{row.roomName}</td>
                            <td className="py-2 px-3 text-[10px] text-stone-600 uppercase">{row.examType}</td>
                            <td className="py-2 px-3 font-sans">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                                  <Check size={13} /> Sẵn sàng
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded"
                                  title={row.errors.join('; ')}
                                >
                                  <AlertCircle size={11} /> {row.errors[0]}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false)
                    setParsedImportRows([])
                  }}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importing || parsedImportRows.filter((r) => r.isValid).length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition cursor-pointer disabled:opacity-50"
                >
                  {importing && <Loader2 size={14} className="animate-spin" />}
                  <span>
                    Xác nhận Import ({parsedImportRows.filter((r) => r.isValid).length} ca thi)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Báo Cáo Kết Quả Import */}
      {importResultModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" size={20} />
                Kết Quả Nhập Lịch Thi
              </h3>
              <button
                onClick={() => setImportResultModal(null)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <div className="text-2xl font-black text-emerald-700 font-mono">
                    {importResultModal.successCount || 0}
                  </div>
                  <div className="text-xs font-semibold text-emerald-800 mt-0.5">Thành công</div>
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center">
                  <div className="text-2xl font-black text-stone-700 font-mono">
                    {importResultModal.failureCount || 0}
                  </div>
                  <div className="text-xs font-semibold text-stone-600 mt-0.5">Thất bại / Bỏ qua</div>
                </div>
              </div>

              {importResultModal.errors && importResultModal.errors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-stone-800">Chi tiết lỗi dòng:</div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 font-mono text-[11px]">
                    {importResultModal.errors.map((err, idx) => (
                      <div key={idx} className="flex items-start gap-1">
                        <span>&bull;</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setImportResultModal(null)}
                  className="w-full py-2.5 rounded-xl font-semibold text-xs bg-stone-900 text-white hover:bg-stone-800 transition cursor-pointer"
                >
                  Đóng thông báo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default AdminExams
