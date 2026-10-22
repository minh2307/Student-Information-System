import React, { useState, useEffect } from 'react'
import api from '../services/api'
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

  // Fetch Lookups
  const fetchLookups = async () => {
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
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lớp học phần [${s.sectionCode}]?`)) {
      return
    }
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
    if (!window.confirm('Bạn có chắc muốn từ chối yêu cầu đăng ký học phần này?')) {
      return
    }
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
          <button
            onClick={handleOpenCreateSectionModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus size={18} />
            <span>Mở lớp học phần mới</span>
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('sections')}
          className={`pb-3 flex items-center gap-2 transition-colors relative ${
            activeTab === 'sections' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={18} />
          <span>Danh sách Lớp học phần ({sections.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 flex items-center gap-2 transition-colors relative ${
            activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
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
                  className="px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2024-25_SEM2">Học kỳ 2 (2024-2025)</option>
                  <option value="2024-25_SEM1">Học kỳ 1 (2024-2025)</option>
                  <option value="2025-26_SEM1">Học kỳ 1 (2025-2026)</option>
                </select>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value)
                    setTimeout(() => fetchSections(), 50)
                  }}
                  className="px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onKeyDown={(e) => e.key === 'Enter' && fetchSections()}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={() => fetchSections()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
            >
              Làm mới
            </button>
          </div>

          {/* Sections Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {sectionsLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 size={24} className="animate-spin text-blue-600" />
                <span className="text-xs">Đang tải danh sách lớp học phần...</span>
              </div>
            ) : sections.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Không tìm thấy lớp học phần nào phù hợp trong kỳ.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
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
                          <td className="px-6 py-4 font-mono font-bold text-blue-600 text-xs whitespace-nowrap">
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
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
              <Loader2 size={24} className="animate-spin text-blue-600" />
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
                      <strong className="text-blue-600">{p.courseName}</strong> ({p.courseCode}) - Lớp:{' '}
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
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Học kỳ *</label>
                  <input
                    type="text"
                    required
                    value={sectionFormData.semesterName}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, semesterName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Môn học *</label>
                  <select
                    required
                    value={sectionFormData.courseId}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, courseId: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white"
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
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white"
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
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
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
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ bắt đầu *</label>
                  <input
                    type="time"
                    required
                    value={sectionFormData.startTime}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, startTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ kết thúc *</label>
                  <input
                    type="time"
                    required
                    value={sectionFormData.endTime}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, endTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white"
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
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái *</label>
                  <select
                    value={sectionFormData.status}
                    onChange={(e) => setSectionFormData({ ...sectionFormData, status: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
                >
                  {sectionSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{sectionModalMode === 'create' ? 'Mở lớp' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default AdminSections
