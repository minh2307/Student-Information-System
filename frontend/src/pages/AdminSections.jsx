import React, { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import api from '../services/api'
import { confirmDialog, alertDialog } from '../store/confirmStore'
import {
  Check,
  X,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
  UserCheck,
  BookOpen,
  CalendarDays,
  ToggleLeft,
  ToggleRight,
  Download,
  Upload,
  FileSpreadsheet,
  FileUp,
} from 'lucide-react'

export const AdminSections = () => {
  const [activeTab, setActiveTab] = useState('sections') // 'sections' | 'pending'
  const [toast, setToast] = useState(null)

  // Tab 1: Class Sections states
  const [sections, setSections] = useState([])
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [filterSemester, setFilterSemester] = useState('2024-25_SEM2')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  // Semesters management states
  const [semestersList, setSemestersList] = useState([])
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false)
  const [semesterFormData, setSemesterFormData] = useState({
    semesterCode: '',
    semesterName: '',
    academicYear: '2025-2026',
    termNumber: 1,
    startDate: '',
    endDate: '',
    registrationOpen: true,
    isActive: false,
  })
  const [semesterSubmitting, setSemesterSubmitting] = useState(false)
  const [semesterFormError, setSemesterFormError] = useState('')

  // Lookups for modal
  const [coursesList, setCoursesList] = useState([])
  const [lecturersList, setLecturersList] = useState([])

  // Modal Section states
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false)
  const [sectionModalMode, setSectionModalMode] = useState('create') // 'create' | 'edit'
  const [editingSectionId, setEditingSectionId] = useState(null)
  const [sectionFormData, setSectionFormData] = useState({
    sectionCode: '',
    courseId: '',
    lecturerId: '',
    semesterName: '2024-25_SEM2',
    dayOfWeek: 'MON',
    startTime: '09:00',
    endTime: '10:30',
    roomName: 'Room A-204',
    maxCapacity: 40,
    status: 'OPEN',
  })
  const [sectionFormError, setSectionFormError] = useState('')
  const [sectionSubmitting, setSectionSubmitting] = useState(false)

  // Tab 2: Pending Enrollments states
  const [pendingList, setPendingList] = useState([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [actionProcessingId, setActionProcessingId] = useState(null)

  // Excel Import / Export States
  const [showImportModal, setShowImportModal] = useState(false)
  const [parsedSections, setParsedSections] = useState([])
  const [importingSections, setImportingSections] = useState(false)
  const [sectionImportResult, setSectionImportResult] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Fetch Class Sections
  const fetchSections = async () => {
    setSectionsLoading(true)
    try {
      const res = await api.get('/admin/class-sections', {
        params: {
          semester: filterSemester,
          status: filterStatus || undefined,
          keyword: searchKeyword || undefined,
        },
      })
      if (res.data?.data) {
        setSections(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch class sections:', err)
      // Fallback seed
      if (sections.length === 0) {
        setSections([
          {
            id: 1,
            sectionCode: 'CS201-2025-01',
            courseCode: 'CS201',
            courseName: 'Data Structures and Algorithms',
            credits: 3,
            lecturerName: 'TS. Nguyễn Văn A',
            semesterName: '2024-25_SEM2',
            dayOfWeek: 'MON',
            timeDisplay: '09:00 - 10:30',
            roomName: 'Room A-204',
            currentEnrolled: 2,
            maxCapacity: 40,
            status: 'OPEN',
          },
          {
            id: 2,
            sectionCode: 'CS301-2025-01',
            courseCode: 'CS301',
            courseName: 'Database Management Systems',
            credits: 3,
            lecturerName: 'ThS. Trần Thị B',
            semesterName: '2024-25_SEM2',
            dayOfWeek: 'TUE',
            timeDisplay: '07:30 - 09:00',
            roomName: 'Room B-101',
            currentEnrolled: 1,
            maxCapacity: 40,
            status: 'OPEN',
          },
          {
            id: 3,
            sectionCode: 'CS401-2025-01',
            courseCode: 'CS401',
            courseName: 'Web Application Development',
            credits: 3,
            lecturerName: 'TS. Nguyễn Văn A',
            semesterName: '2024-25_SEM2',
            dayOfWeek: 'WED',
            timeDisplay: '13:30 - 15:00',
            roomName: 'Lab 3',
            currentEnrolled: 1,
            maxCapacity: 35,
            status: 'OPEN',
          },
        ])
      }
    } finally {
      setSectionsLoading(false)
    }
  }

  // Fetch Semesters
  const fetchSemesters = async () => {
    try {
      const res = await api.get('/semesters')
      if (res.data?.data && res.data.data.length > 0) {
        const mapped = res.data.data.map(s => {
          const isOpen = s.isRegistrationOpen !== undefined ? s.isRegistrationOpen : (s.registrationOpen !== undefined ? s.registrationOpen : true)
          return {
            ...s,
            registrationOpen: Boolean(isOpen),
            isRegistrationOpen: Boolean(isOpen)
          }
        })
        setSemestersList(mapped)
      } else {
        setSemestersList([
          { id: 1, semesterCode: '2024-25_SEM2', semesterName: 'Học kỳ 2 (2024-2025)', isActive: true, registrationOpen: true },
          { id: 2, semesterCode: '2024-25_SEM1', semesterName: 'Học kỳ 1 (2024-2025)', isActive: false, registrationOpen: false },
          { id: 3, semesterCode: '2025-26_SEM1', semesterName: 'Học kỳ 1 (2025-2026)', isActive: false, registrationOpen: true },
        ])
      }
    } catch (e) {
      console.warn('Semester lookup error:', e)
      setSemestersList([
        { id: 1, semesterCode: '2024-25_SEM2', semesterName: 'Học kỳ 2 (2024-2025)', isActive: true, registrationOpen: true },
        { id: 2, semesterCode: '2024-25_SEM1', semesterName: 'Học kỳ 1 (2024-2025)', isActive: false, registrationOpen: false },
        { id: 3, semesterCode: '2025-26_SEM1', semesterName: 'Học kỳ 1 (2025-2026)', isActive: false, registrationOpen: true },
      ])
    }
  }

  // Fetch Lookups
  const fetchLookups = async () => {
    fetchSemesters()
    try {
      const [coursesRes, lecturersRes] = await Promise.allSettled([
        api.get('/admin/courses'),
        api.get('/admin/lecturers'),
      ])
      if (coursesRes.status === 'fulfilled' && coursesRes.value.data?.data) {
        setCoursesList(coursesRes.value.data.data)
      } else {
        setCoursesList([
          { id: 1, courseCode: 'CS101', name: 'Introduction to Programming' },
          { id: 2, courseCode: 'CS201', name: 'Data Structures and Algorithms' },
          { id: 3, courseCode: 'CS301', name: 'Database Management Systems' },
          { id: 4, courseCode: 'CS401', name: 'Web Application Development' },
        ])
      }

      if (lecturersRes.status === 'fulfilled' && lecturersRes.value.data?.data) {
        setLecturersList(lecturersRes.value.data.data)
      } else {
        setLecturersList([
          { id: 1, lecturerCode: 'GV001', fullName: 'TS. Nguyễn Văn A', department: 'Khoa CNTT' },
          { id: 2, lecturerCode: 'GV002', fullName: 'ThS. Trần Thị B', department: 'Khoa HTTT' },
        ])
      }
    } catch (e) {
      console.warn('Lookup error:', e)
    }
  }

  // Fetch Pending Enrollments
  const fetchPendingEnrollments = async () => {
    setPendingLoading(true)
    try {
      const res = await api.get('/admin/enrollments/pending')
      if (res.data?.data) {
        setPendingList(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch pending enrollments:', err)
      if (pendingList.length === 0) {
        setPendingList([
          {
            enrollmentId: 3,
            studentCode: 'SV2024001',
            studentName: 'Nguyễn Văn C',
            studentMajor: 'B.Tech - Computer Science',
            courseCode: 'CS401',
            courseName: 'Web Application Development',
            sectionCode: 'CS401-2025-01',
            dayOfWeek: 'WED',
            timeDisplay: '13:30 - 15:00',
            roomName: 'Lab 3',
            lecturerName: 'TS. Nguyễn Văn A',
            currentEnrolled: 1,
            maxCapacity: 35,
            status: 'PENDING',
            registeredAt: '2026-10-21T10:00:00',
          },
        ])
      }
    } finally {
      setPendingLoading(false)
    }
  }

  useEffect(() => {
    fetchSections()
    fetchLookups()
    fetchPendingEnrollments()
  }, [])

  // Semester management actions
  const handleOpenSemesterModal = () => {
    setSemesterFormData({
      semesterCode: '',
      semesterName: '',
      academicYear: '2025-2026',
      termNumber: 1,
      startDate: '',
      endDate: '',
      registrationOpen: true,
      isActive: false,
    })
    setSemesterFormError('')
    setIsSemesterModalOpen(true)
  }

  const handleCreateSemester = async (e) => {
    e.preventDefault()
    setSemesterFormError('')
    if (!semesterFormData.semesterCode.trim() || !semesterFormData.semesterName.trim()) {
      setSemesterFormError('Vui lòng nhập đầy đủ mã và tên học kỳ!')
      return
    }
    setSemesterSubmitting(true)
    try {
      await api.post('/admin/semesters', semesterFormData)
      showToast('Thêm học kỳ mới thành công!')
      fetchSemesters()
      setFilterSemester(semesterFormData.semesterCode.trim())
      setSemesterFormData({
        semesterCode: '',
        semesterName: '',
        academicYear: '2025-2026',
        termNumber: 1,
        startDate: '',
        endDate: '',
        registrationOpen: true,
        isActive: false,
      })
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể tạo học kỳ!'
      setSemesterFormError(msg)
    } finally {
      setSemesterSubmitting(false)
    }
  }

  const handleToggleRegistration = async (semesterId, currentStatus) => {
    try {
      const targetState = !Boolean(currentStatus)
      await api.put(`/admin/semesters/${semesterId}/registration?isOpen=${targetState}&open=${targetState}`)
      showToast(`Đã ${targetState ? 'mở' : 'đóng'} cổng đăng ký của học kỳ!`)
      fetchSemesters()
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái đăng ký', 'error')
    }
  }

  // Open Create Section Modal
  const handleOpenCreateSectionModal = () => {
    setSectionModalMode('create')
    setEditingSectionId(null)
    setSectionFormData({
      sectionCode: '',
      courseId: coursesList[0]?.id || '',
      lecturerId: lecturersList[0]?.id || '',
      semesterName: filterSemester || '2024-25_SEM2',
      dayOfWeek: 'MON',
      startTime: '09:00',
      endTime: '10:30',
      roomName: 'Room A-204',
      maxCapacity: 40,
      status: 'OPEN',
    })
    setSectionFormError('')
    setIsSectionModalOpen(true)
  }

  // Open Edit Section Modal
  const handleOpenEditSectionModal = (s) => {
    setSectionModalMode('edit')
    setEditingSectionId(s.id)
    setSectionFormData({
      sectionCode: s.sectionCode,
      courseId: s.courseId,
      lecturerId: s.lecturerId,
      semesterName: s.semesterName,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime ? s.startTime.substring(0, 5) : '09:00',
      endTime: s.endTime ? s.endTime.substring(0, 5) : '10:30',
      roomName: s.roomName,
      maxCapacity: s.maxCapacity,
      status: s.status,
    })
    setSectionFormError('')
    setIsSectionModalOpen(true)
  }

  // Save Section
  const handleSaveSection = async (e) => {
    e.preventDefault()
    setSectionFormError('')

    if (!sectionFormData.sectionCode.trim()) {
      setSectionFormError('Mã lớp học phần không được để trống!')
      return
    }
    if (!sectionFormData.courseId) {
      setSectionFormError('Vui lòng chọn môn học!')
      return
    }
    if (!sectionFormData.lecturerId) {
      setSectionFormError('Vui lòng chọn giảng viên giảng dạy!')
      return
    }

    setSectionSubmitting(true)
    const payload = {
      sectionCode: sectionFormData.sectionCode.trim().toUpperCase(),
      courseId: Number(sectionFormData.courseId),
      lecturerId: Number(sectionFormData.lecturerId),
      semesterName: sectionFormData.semesterName.trim(),
      dayOfWeek: sectionFormData.dayOfWeek,
      startTime: sectionFormData.startTime.length === 5 ? `${sectionFormData.startTime}:00` : sectionFormData.startTime,
      endTime: sectionFormData.endTime.length === 5 ? `${sectionFormData.endTime}:00` : sectionFormData.endTime,
      roomName: sectionFormData.roomName.trim(),
      maxCapacity: Number(sectionFormData.maxCapacity),
      status: sectionFormData.status,
    }

    try {
      if (sectionModalMode === 'create') {
        await api.post('/admin/class-sections', payload)
        showToast('Mở lớp học phần mới thành công!')
      } else {
        await api.put(`/admin/class-sections/${editingSectionId}`, payload)
        showToast('Cập nhật lớp học phần thành công!')
      }
      setIsSectionModalOpen(false)
      fetchSections()
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu lớp học phần!'
      setSectionFormError(msg)
    } finally {
      setSectionSubmitting(false)
    }
  }

  // Delete Section
  const handleDeleteSection = async (s) => {
    const confirmed = await confirmDialog({
      title: 'Xác nhận xóa lớp học phần',
      message: `Bạn có chắc chắn muốn xóa lớp học phần [${s.sectionCode}] (${s.courseName || s.courseCode || ''}) không?\nCác lịch học và danh sách sinh viên đăng ký lớp này sẽ bị hủy bỏ.`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy bỏ',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      await api.delete(`/admin/class-sections/${s.id}`)
      showToast(`Đã xóa lớp học phần ${s.sectionCode} thành công!`)
      fetchSections()
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể xóa lớp học phần này!'
      showToast(msg, 'error')
    }
  }

  // Approve Enrollment
  const handleApprove = async (id) => {
    setActionProcessingId(id)
    try {
      await api.put(`/admin/enrollments/${id}/approve`)
      setPendingList((prev) => prev.filter((p) => p.enrollmentId !== id))
      showToast('Đã phê duyệt đăng ký học phần thành công!')
      fetchSections() // Cập nhật lại sĩ số lớp
    } catch (err) {
      const msg = err.response?.data?.message || 'Phê duyệt thất bại!'
      showToast(msg, 'error')
    } finally {
      setActionProcessingId(null)
    }
  }

  // Reject Enrollment
  const handleReject = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Từ chối đăng ký học phần',
      message: 'Bạn có chắc chắn muốn từ chối yêu cầu đăng ký học phần này của sinh viên không?',
      confirmText: 'Từ chối đăng ký',
      cancelText: 'Hủy bỏ',
      variant: 'warning',
    })
    if (!confirmed) return

    setActionProcessingId(id)
    try {
      await api.put(`/admin/enrollments/${id}/reject`)
      setPendingList((prev) => prev.filter((p) => p.enrollmentId !== id))
      showToast('Đã từ chối yêu cầu đăng ký!')
    } catch (err) {
      const msg = err.response?.data?.message || 'Thao tác thất bại!'
      showToast(msg, 'error')
    } finally {
      setActionProcessingId(null)
    }
  }

  // Auto search when keyword changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSections()
    }, 250)
    return () => clearTimeout(timer)
  }, [searchKeyword])

  // Chuẩn hóa thứ trong tuần
  const normalizeDayOfWeek = (raw) => {
    if (!raw) return 'MON'
    const s = String(raw).trim().toUpperCase()
    if (['MON', 'THỨ 2', 'THỨ HAI', 'T2', '2'].includes(s)) return 'MON'
    if (['TUE', 'THỨ 3', 'THỨ BA', 'T3', '3'].includes(s)) return 'TUE'
    if (['WED', 'THỨ 4', 'THỨ TƯ', 'T4', '4'].includes(s)) return 'WED'
    if (['THU', 'THỨ 5', 'THỨ NĂM', 'T5', '5'].includes(s)) return 'THU'
    if (['FRI', 'THỨ 6', 'THỨ SÁU', 'T6', '6'].includes(s)) return 'FRI'
    if (['SAT', 'THỨ 7', 'THỨ BẢY', 'T7', '7'].includes(s)) return 'SAT'
    if (['SUN', 'CHỦ NHẬT', 'CN', '8'].includes(s)) return 'SUN'
    return s
  }

  // Chuẩn hóa giờ
  const normalizeTime = (raw) => {
    if (!raw) return ''
    const s = String(raw).trim()
    if (!isNaN(Number(s)) && Number(s) > 0 && Number(s) < 1) {
      const totalSeconds = Math.round(Number(s) * 86400)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
    }
    const parts = s.split(':')
    if (parts.length >= 2) {
      const hh = String(parseInt(parts[0], 10)).padStart(2, '0')
      const mm = String(parseInt(parts[1], 10)).padStart(2, '0')
      return `${hh}:${mm}:00`
    }
    return s.length === 5 ? `${s}:00` : s
  }

  // Tải file mẫu Excel Lớp học phần
  const downloadSectionTemplate = () => {
    const c1 = coursesList[0]?.courseCode || 'CS101'
    const c2 = coursesList[1]?.courseCode || 'CS201'
    const g1 = lecturersList[0]?.lecturerCode || 'GV001'
    const g2 = lecturersList[1]?.lecturerCode || 'GV002'
    const sem = filterSemester || '2024-25_SEM2'

    const sampleRows = [
      {
        'Mã lớp (*)': `${c1}-2025-01`,
        'Mã môn học (*)': c1,
        'Mã giảng viên (*)': g1,
        'Học kỳ (*)': sem,
        'Thứ học (*)': 'MON',
        'Giờ bắt đầu (*)': '07:30',
        'Giờ kết thúc (*)': '09:00',
        'Phòng học (*)': 'Room A-204',
        'Sĩ số tối đa (*)': 40,
      },
      {
        'Mã lớp (*)': `${c2}-2025-01`,
        'Mã môn học (*)': c2,
        'Mã giảng viên (*)': g2,
        'Học kỳ (*)': sem,
        'Thứ học (*)': 'TUE',
        'Giờ bắt đầu (*)': '09:00',
        'Giờ kết thúc (*)': '10:30',
        'Phòng học (*)': 'Room B-101',
        'Sĩ số tối đa (*)': 40,
      },
    ]

    const ws = XLSX.utils.json_to_sheet(sampleRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Import_Lop_Hoc_Phan')
    ws['!cols'] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
    ]
    XLSX.writeFile(wb, 'Mau_Import_Lop_Hoc_Phan.xlsx')
  }

  // Xuất danh sách lớp học phần ra Excel
  const exportSectionsToExcel = () => {
    if (!sections || sections.length === 0) {
      showToast('Không có dữ liệu lớp học phần để xuất Excel', 'error')
      return
    }

    const rows = sections.map((s, idx) => ({
      'STT': idx + 1,
      'Mã lớp': s.sectionCode || '',
      'Mã môn': s.courseCode || '',
      'Tên môn học': s.courseName || '',
      'Số tín chỉ': s.credits || 0,
      'Mã giảng viên': s.lecturerCode || '',
      'Giảng viên phụ trách': s.lecturerName || '',
      'Khoa': s.lecturerDepartment || '',
      'Học kỳ': s.semesterName || '',
      'Thứ': s.dayOfWeek || '',
      'Thời gian': s.timeDisplay || `${s.startTime || ''} - ${s.endTime || ''}`,
      'Phòng học': s.roomName || '',
      'Đã ĐK': s.currentEnrolled || 0,
      'Sĩ số tối đa': s.maxCapacity || 40,
      'Trạng thái': s.status || 'OPEN',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Lop_Hoc_Phan')
    ws['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 12 },
      { wch: 30 },
      { wch: 10 },
      { wch: 14 },
      { wch: 24 },
      { wch: 22 },
      { wch: 16 },
      { wch: 10 },
      { wch: 18 },
      { wch: 16 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
    ]
    XLSX.writeFile(wb, `Danh_Sach_Lop_Hoc_Phan_${filterSemester}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    showToast('Xuất file Excel danh sách lớp học phần thành công!')
  }

  // Đọc file Excel khi Admin tải lên
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result)
        const wb = XLSX.read(data, { type: 'array' })
        const wsName = wb.SheetNames[0]
        const ws = wb.Sheets[wsName]
        const rawJson = XLSX.utils.sheet_to_json(ws)

        if (!rawJson || rawJson.length === 0) {
          alertDialog({
            title: 'File Excel rỗng',
            message: 'Tập tin vừa chọn không có dữ liệu hàng nào hợp lệ. Vui lòng kiểm tra lại.',
            variant: 'warning',
          })
          return
        }

        const parsed = rawJson.map((row, idx) => {
          const sectionCode = String(
            row['Mã lớp (*)'] ||
            row['Mã lớp học phần'] ||
            row['Mã lớp'] ||
            row['Section Code'] ||
            row['sectionCode'] ||
            ''
          ).trim().toUpperCase()

          const courseCode = String(
            row['Mã môn học (*)'] ||
            row['Mã môn học'] ||
            row['Mã môn'] ||
            row['Course Code'] ||
            row['courseCode'] ||
            ''
          ).trim().toUpperCase()

          const lecturerCode = String(
            row['Mã giảng viên (*)'] ||
            row['Mã giảng viên'] ||
            row['Mã GV'] ||
            row['Lecturer Code'] ||
            row['lecturerCode'] ||
            ''
          ).trim().toUpperCase()

          const semesterName = String(
            row['Học kỳ (*)'] ||
            row['Học kỳ'] ||
            row['Semester'] ||
            row['semesterName'] ||
            filterSemester ||
            ''
          ).trim()

          const rawDay = row['Thứ học (*)'] || row['Thứ học'] || row['Thứ'] || row['Day'] || row['dayOfWeek'] || 'MON'
          const dayOfWeek = normalizeDayOfWeek(rawDay)

          const rawStart = row['Giờ bắt đầu (*)'] || row['Giờ bắt đầu'] || row['Start Time'] || row['startTime'] || ''
          const startTime = normalizeTime(rawStart)

          const rawEnd = row['Giờ kết thúc (*)'] || row['Giờ kết thúc'] || row['End Time'] || row['endTime'] || ''
          const endTime = normalizeTime(rawEnd)

          const roomName = String(
            row['Phòng học (*)'] ||
            row['Phòng học'] ||
            row['Phòng'] ||
            row['Room'] ||
            row['roomName'] ||
            ''
          ).trim()

          const capVal = row['Sĩ số tối đa (*)'] || row['Sĩ số tối đa'] || row['Sĩ số'] || row['Capacity'] || row['maxCapacity']
          const maxCapacity = capVal ? parseInt(capVal, 10) : 40

          const errors = []
          if (!sectionCode) errors.push('Thiếu mã lớp')
          if (!courseCode) errors.push('Thiếu mã môn')
          if (!lecturerCode) errors.push('Thiếu mã GV')
          if (!semesterName) errors.push('Thiếu học kỳ')
          if (!['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].includes(dayOfWeek)) {
            errors.push('Thứ không hợp lệ')
          }
          if (!startTime) errors.push('Thiếu giờ bắt đầu')
          if (!endTime) errors.push('Thiếu giờ kết thúc')
          if (!roomName) errors.push('Thiếu phòng học')
          if (isNaN(maxCapacity) || maxCapacity < 1) errors.push('Sĩ số không hợp lệ')

          return {
            rowIndex: idx + 2,
            sectionCode,
            courseCode,
            lecturerCode,
            semesterName,
            dayOfWeek,
            startTime,
            endTime,
            roomName,
            maxCapacity: isNaN(maxCapacity) ? 40 : maxCapacity,
            isValid: errors.length === 0,
            errorMsg: errors.join(', '),
          }
        })

        setParsedSections(parsed)
      } catch (err) {
        console.error('Error reading Excel file:', err)
        alertDialog({
          title: 'Lỗi đọc file',
          message: 'Không thể đọc dữ liệu file Excel. Định dạng tập tin không được hỗ trợ hoặc bị lỗi.',
          variant: 'danger',
        })
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  // Thực hiện Import Lớp học phần vào Backend
  const handleExecuteSectionImport = async () => {
    const validRows = parsedSections.filter((r) => r.isValid)
    if (validRows.length === 0) {
      alertDialog({
        title: 'Không có dữ liệu hợp lệ',
        message: 'Không có dòng dữ liệu hợp lệ nào để import vào hệ thống. Vui lòng kiểm tra lại bảng danh sách bên dưới.',
        variant: 'warning',
      })
      return
    }

    setImportingSections(true)
    const payload = validRows.map((r) => ({
      sectionCode: r.sectionCode,
      courseCode: r.courseCode,
      lecturerCode: r.lecturerCode,
      semesterName: r.semesterName,
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      roomName: r.roomName,
      maxCapacity: r.maxCapacity,
      status: 'OPEN',
    }))

    try {
      const res = await api.post('/admin/class-sections/batch', payload)
      const resultData = res.data?.data || {
        total: payload.length,
        successCount: payload.length,
        failureCount: 0,
        errors: [],
      }
      setSectionImportResult(resultData)
      setShowImportModal(false)
      fetchSections()
      showToast(`Import lớp học phần hoàn tất: ${resultData.successCount}/${resultData.total} thành công!`)
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi thực hiện import theo lô'
      alertDialog({
        title: 'Import thất bại',
        message: msg,
        variant: 'danger',
      })
    } finally {
      setImportingSections(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Lớp học phần & Duyệt Đăng ký</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Mở lớp học phần, xếp phòng/lịch học, kiểm tra xung đột trùng phòng/giảng viên và duyệt đăng ký (FR-07)
          </p>
        </div>
        {activeTab === 'sections' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportSectionsToExcel}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Xuất danh sách lớp học phần ra file Excel"
            >
              <Download size={16} className="text-emerald-700" />
              <span>Xuất Excel</span>
            </button>
            <button
              onClick={() => {
                setParsedSections([])
                setShowImportModal(true)
              }}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Nhập danh sách lớp học phần từ file Excel"
            >
              <Upload size={16} className="text-slate-600" />
              <span>Nhập từ Excel</span>
            </button>
            <button
              onClick={handleOpenSemesterModal}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-xs transition-all cursor-pointer"
            >
              <CalendarDays size={16} className="text-red-600" />
              <span>Quản lý Học kỳ ({semestersList.length})</span>
            </button>
            <button
              onClick={handleOpenCreateSectionModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Mở lớp học phần mới</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('sections')}
          className={`pb-3 flex items-center gap-2 transition-colors relative ${
            activeTab === 'sections' ? 'text-red-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={18} />
          <span>Danh sách Lớp học phần ({sections.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 flex items-center gap-2 transition-colors relative ${
            activeTab === 'pending' ? 'text-red-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck size={18} />
          <span>Duyệt đăng ký chờ xử lý</span>
          {pendingList.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-[11px] font-bold rounded-full">
              {pendingList.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Class Sections */}
      {activeTab === 'sections' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div>
                <select
                  value={filterSemester}
                  onChange={(e) => {
                    setFilterSemester(e.target.value)
                    setTimeout(() => fetchSections(), 50)
                  }}
                  className="px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {semestersList.map((s) => (
                    <option key={s.id || s.semesterCode} value={s.semesterCode}>
                      {s.semesterName} ({s.semesterCode}){s.registrationOpen ? ' • Mở ĐK' : ' • Đóng ĐK'}
                    </option>
                  ))}
                  {semestersList.length === 0 && (
                    <option value="2024-25_SEM2">Học kỳ 2 (2024-2025)</option>
                  )}
                </select>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value)
                    setTimeout(() => fetchSections(), 50)
                  }}
                  className="px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="OPEN">Đang mở (OPEN)</option>
                  <option value="CLOSED">Đã khóa (CLOSED)</option>
                  <option value="CANCELLED">Đã hủy (CANCELLED)</option>
                </select>
              </div>

              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã lớp, tên môn, giảng viên..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <span className="text-xs text-slate-500 whitespace-nowrap">
              Tổng số: <strong className="text-slate-800 font-semibold">{sections.length}</strong> lớp học phần
            </span>
          </div>

          {/* Sections Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {sectionsLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 size={24} className="animate-spin text-red-600" />
                <span className="text-xs">Đang tải danh sách lớp học phần...</span>
              </div>
            ) : sections.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Không tìm thấy lớp học phần nào phù hợp trong kỳ.
              </div>
            ) : (
              <div className="overflow-x-auto touch-scroll">
                <table className="w-full text-left text-sm min-w-[760px]">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Mã lớp</th>
                      <th className="px-6 py-4">Môn học</th>
                      <th className="px-4 py-4">Giảng viên</th>
                      <th className="px-4 py-4">Lịch & Phòng</th>
                      <th className="px-4 py-4 text-center">Sĩ số</th>
                      <th className="px-4 py-4 text-center">Trạng thái</th>
                      <th className="px-6 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sections.map((s) => {
                      const percent = Math.min(100, Math.round(((s.currentEnrolled || 0) / (s.maxCapacity || 40)) * 100))
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-red-600 text-xs whitespace-nowrap">
                            {s.sectionCode}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800 text-xs">{s.courseName}</div>
                            <div className="text-[11px] font-mono text-slate-400">{s.courseCode} ({s.credits} TC)</div>
                          </td>
                          <td className="px-4 py-4 text-xs font-medium text-slate-700">
                            {s.lecturerName || 'Chưa phân công'}
                          </td>
                          <td className="px-4 py-4 text-xs">
                            <div className="flex items-center gap-1 font-semibold text-slate-700">
                              <Calendar size={13} className="text-slate-400" />
                              <span>Thứ {s.dayOfWeek} ({s.timeDisplay || `${s.startTime} - ${s.endTime}`})</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                              <MapPin size={12} className="text-slate-400" />
                              <span>{s.roomName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-xs font-bold text-slate-700">
                                {s.currentEnrolled} / {s.maxCapacity}
                              </span>
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${percent >= 100 ? 'bg-rose-500' : percent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                                s.status === 'OPEN'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : s.status === 'CLOSED'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditSectionModal(s)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Chỉnh sửa lịch/phòng"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteSection(s)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Xóa lớp học phần"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Pending Enrollments Approval */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                Yêu cầu đăng ký chờ duyệt ({pendingList.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các học phần cần giáo vụ phê duyệt sĩ số hoặc xét ngoại lệ đăng ký
              </p>
            </div>
            <button
              onClick={() => fetchPendingEnrollments()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Làm mới danh sách
            </button>
          </div>

          {pendingLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 size={24} className="animate-spin text-red-600" />
              <span className="text-xs">Đang tải yêu cầu đăng ký...</span>
            </div>
          ) : pendingList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <CheckCircle2 size={32} className="text-emerald-500 stroke-1" />
              <span>Hiện tại không có yêu cầu đăng ký nào đang chờ xử lý.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingList.map((p) => (
                <div key={p.enrollmentId} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{p.studentName}</span>
                      <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {p.studentCode}
                      </span>
                      {p.studentMajor && (
                        <span className="text-xs text-slate-400">• {p.studentMajor}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600">
                      Đăng ký môn:{' '}
                      <strong className="text-red-600">{p.courseName}</strong> ({p.courseCode}) - Lớp:{' '}
                      <span className="font-mono font-semibold text-slate-700">{p.sectionCode}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> Thứ {p.dayOfWeek} ({p.timeDisplay})
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {p.roomName}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-indigo-600">
                        <Users size={12} /> Sĩ số hiện tại: {p.currentEnrolled}/{p.maxCapacity}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleApprove(p.enrollmentId)}
                      disabled={actionProcessingId === p.enrollmentId}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                    >
                      {actionProcessingId === p.enrollmentId ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      <span>Duyệt</span>
                    </button>
                    <button
                      onClick={() => handleReject(p.enrollmentId)}
                      disabled={actionProcessingId === p.enrollmentId}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <X size={14} />
                      <span>Từ chối</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Add / Edit Class Section */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {sectionModalMode === 'create' ? 'Mở lớp học phần mới' : `Cập nhật Lớp: ${sectionFormData.sectionCode}`}
              </h3>
              <button
                onClick={() => setIsSectionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="p-6 space-y-4 overflow-y-auto">
              {sectionFormError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{sectionFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã lớp học phần *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: CS201-2025-01"
                    value={sectionFormData.sectionCode}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, sectionCode: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Học kỳ áp dụng *</label>
                  <select
                    required
                    value={sectionFormData.semesterName}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, semesterName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white"
                  >
                    {semestersList.map((s) => (
                      <option key={s.id || s.semesterCode} value={s.semesterCode}>
                        {s.semesterName} ({s.semesterCode})
                      </option>
                    ))}
                    {semestersList.length === 0 && (
                      <option value="2024-25_SEM2">2024-25_SEM2</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Môn học *</label>
                  <select
                    required
                    value={sectionFormData.courseId}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, courseId: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white"
                  >
                    <option value="">-- Chọn môn học --</option>
                    {coursesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.courseCode}] {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giảng viên phụ trách *</label>
                  <select
                    required
                    value={sectionFormData.lecturerId}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, lecturerId: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white"
                  >
                    <option value="">-- Chọn giảng viên --</option>
                    {lecturersList.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.fullName} ({l.lecturerCode}) - {l.department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thứ trong tuần *</label>
                  <select
                    required
                    value={sectionFormData.dayOfWeek}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, dayOfWeek: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white font-medium"
                  >
                    <option value="MON">Thứ 2 (MON)</option>
                    <option value="TUE">Thứ 3 (TUE)</option>
                    <option value="WED">Thứ 4 (WED)</option>
                    <option value="THU">Thứ 5 (THU)</option>
                    <option value="FRI">Thứ 6 (FRI)</option>
                    <option value="SAT">Thứ 7 (SAT)</option>
                    <option value="SUN">Chủ nhật (SUN)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phòng học *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Room A-204, Lab 3..."
                    value={sectionFormData.roomName}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, roomName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ bắt đầu *</label>
                  <input
                    type="time"
                    required
                    value={sectionFormData.startTime}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, startTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ kết thúc *</label>
                  <input
                    type="time"
                    required
                    value={sectionFormData.endTime}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, endTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sĩ số tối đa *</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    required
                    value={sectionFormData.maxCapacity}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, maxCapacity: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái *</label>
                  <select
                    value={sectionFormData.status}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, status: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white font-medium"
                  >
                    <option value="OPEN">Mở đăng ký (OPEN)</option>
                    <option value="CLOSED">Khóa đăng ký (CLOSED)</option>
                    <option value="CANCELLED">Hủy lớp (CANCELLED)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={sectionSubmitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
                >
                  {sectionSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{sectionModalMode === 'create' ? 'Mở lớp' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Semester Management Modal */}
      {isSemesterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <CalendarDays className="text-red-600" size={20} />
                <h3 className="font-bold text-slate-800 text-base">Quản lý Học kỳ & Cổng Đăng ký</h3>
              </div>
              <button
                onClick={() => setIsSemesterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Existing Semesters Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Danh sách học kỳ hiện có ({semestersList.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Mã HK</th>
                        <th className="px-3 py-2 font-semibold">Tên hiển thị</th>
                        <th className="px-3 py-2 font-semibold">Năm học</th>
                        <th className="px-3 py-2 font-semibold text-center">Cổng ĐK</th>
                        <th className="px-3 py-2 font-semibold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {semestersList.map((s) => (
                        <tr key={s.id || s.semesterCode} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-mono font-bold text-red-600">
                            {s.semesterCode}
                            {s.isActive && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-red-700 font-semibold">
                                Hiện tại
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-slate-800">{s.semesterName}</td>
                          <td className="px-3 py-2.5 text-slate-500">{s.academicYear} - K{s.termNumber}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                s.registrationOpen
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {s.registrationOpen ? 'Đang mở' : 'Đã khóa'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {s.id ? (
                              <button
                                onClick={() => handleToggleRegistration(s.id, s.registrationOpen)}
                                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                                  s.registrationOpen
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {s.registrationOpen ? 'Đóng cổng ĐK' : 'Mở cổng ĐK'}
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Mặc định</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Form Add Semester */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Plus size={16} className="text-red-600" />
                  <span>Thêm học kỳ mới vào hệ thống</span>
                </h4>

                {semesterFormError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {semesterFormError}
                  </div>
                )}

                <form onSubmit={handleCreateSemester} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Mã học kỳ *</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: 2025-26_SEM1"
                        value={semesterFormData.semesterCode}
                        onChange={(e) => setSemesterFormData({ ...semesterFormData, semesterCode: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tên hiển thị *</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Học kỳ 1 (2025-2026)"
                        value={semesterFormData.semesterName}
                        onChange={(e) => setSemesterFormData({ ...semesterFormData, semesterName: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Năm học</label>
                      <input
                        type="text"
                        placeholder="VD: 2025-2026"
                        value={semesterFormData.academicYear}
                        onChange={(e) => setSemesterFormData({ ...semesterFormData, academicYear: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kỳ số (1, 2, 3)</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={semesterFormData.termNumber}
                        onChange={(e) => setSemesterFormData({ ...semesterFormData, termNumber: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={semesterFormData.registrationOpen}
                          onChange={(e) => setSemesterFormData({ ...semesterFormData, registrationOpen: e.target.checked })}
                          className="rounded text-red-600 focus:ring-red-500"
                        />
                        <span>Mở cổng ĐK ngay</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={semesterSubmitting}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {semesterSubmitting && <Loader2 size={14} className="animate-spin" />}
                      <span>Lưu học kỳ</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSemesterModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Excel Lớp học phần */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Nhập Danh sách Lớp học phần từ Excel
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hệ thống tự động đối soát xung đột phòng học và lịch dạy của giảng viên
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Tải file mẫu */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tải tệp mẫu Excel chuẩn</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mẫu đã có sẵn mã môn học và mã giảng viên mẫu từ hệ thống.
                  </p>
                </div>
                <button
                  onClick={downloadSectionTemplate}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <Download size={14} className="text-slate-600" />
                  <span>Tải mẫu Mau_Import_Lop_Hoc_Phan.xlsx</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 rounded-2xl p-6 text-center transition-colors">
                <input
                  type="file"
                  id="excelSectionInput"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="excelSectionInput"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="p-3 bg-white text-emerald-600 rounded-full shadow-xs border border-slate-200">
                    <FileUp size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 hover:text-emerald-700">
                      Bấm để chọn file Excel
                    </span>
                    <span className="text-xs text-slate-500"> hoặc kéo thả file vào đây</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Chấp nhận file định dạng .xlsx, .xls hoặc .csv
                  </span>
                </label>
              </div>

              {/* Preview Table */}
              {parsedSections.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Dữ liệu đọc từ file:
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {parsedSections.filter((r) => r.isValid).length} hợp lệ
                      </span>
                      {parsedSections.some((r) => !r.isValid) && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          {parsedSections.filter((r) => !r.isValid).length} lỗi
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      Tổng số {parsedSections.length} dòng
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Dòng</th>
                          <th className="px-3 py-2">Mã lớp</th>
                          <th className="px-3 py-2">Mã môn</th>
                          <th className="px-3 py-2">Mã GV</th>
                          <th className="px-3 py-2">Học kỳ</th>
                          <th className="px-3 py-2 text-center">Thứ</th>
                          <th className="px-3 py-2">Giờ học</th>
                          <th className="px-3 py-2">Phòng</th>
                          <th className="px-3 py-2 text-center">Sĩ số</th>
                          <th className="px-3 py-2">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedSections.map((row, idx) => (
                          <tr
                            key={idx}
                            className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}
                          >
                            <td className="px-3 py-2 font-mono text-slate-400">
                              #{row.rowIndex}
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-slate-800">
                              {row.sectionCode || <span className="text-rose-500 italic">Trống</span>}
                            </td>
                            <td className="px-3 py-2 font-mono font-semibold text-red-600">
                              {row.courseCode || <span className="text-rose-500 italic">Trống</span>}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-700">
                              {row.lecturerCode || <span className="text-rose-500 italic">Trống</span>}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {row.semesterName}
                            </td>
                            <td className="px-3 py-2 text-center font-semibold text-slate-800">
                              {row.dayOfWeek}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                              {row.startTime?.substring(0, 5)} - {row.endTime?.substring(0, 5)}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {row.roomName}
                            </td>
                            <td className="px-3 py-2 text-center font-medium">
                              {row.maxCapacity}
                            </td>
                            <td className="px-3 py-2">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                                  <CheckCircle2 size={13} /> Sẵn sàng
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-rose-600 font-semibold text-[11px]"
                                  title={row.errorMsg}
                                >
                                  <AlertCircle size={13} /> {row.errorMsg}
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
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={importingSections || parsedSections.filter((r) => r.isValid).length === 0}
                onClick={handleExecuteSectionImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {importingSections ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang nạp dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>
                      Tiến hành Import ({parsedSections.filter((r) => r.isValid).length} lớp)
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Dialog Modal */}
      {sectionImportResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div
                className={`p-2.5 rounded-xl ${
                  sectionImportResult.failureCount === 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {sectionImportResult.failureCount === 0 ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <AlertCircle size={24} />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Kết quả Import Lớp học phần
                </h3>
                <p className="text-xs text-slate-500">
                  Xử lý thành công {sectionImportResult.successCount} trên tổng số {sectionImportResult.total} lớp học phần
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-xs text-slate-500">Tổng số</div>
                  <div className="text-base font-bold text-slate-800">
                    {sectionImportResult.total}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <div className="text-xs text-emerald-600">Thành công</div>
                  <div className="text-base font-bold text-emerald-700">
                    {sectionImportResult.successCount}
                  </div>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl">
                  <div className="text-xs text-rose-600">Thất bại</div>
                  <div className="text-base font-bold text-rose-700">
                    {sectionImportResult.failureCount}
                  </div>
                </div>
              </div>

              {sectionImportResult.errors && sectionImportResult.errors.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-rose-700">
                    Chi tiết lỗi ({sectionImportResult.errors.length}):
                  </span>
                  <div className="max-h-48 overflow-y-auto p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1.5">
                    {sectionImportResult.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="font-bold">•</span>
                        <span>{typeof err === 'string' ? err : err.error || err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSectionImportResult(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default AdminSections
