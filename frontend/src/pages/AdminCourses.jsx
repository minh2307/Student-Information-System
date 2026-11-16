import React, { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import api from '../services/api'
import { confirmDialog, alertDialog } from '../store/confirmStore'
import {
  Plus,
  BookOpen,
  Clock,
  Loader2,
  Search,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Download,
  Upload,
  FileSpreadsheet,
  FileUp,
} from 'lucide-react'

export const AdminCourses = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [toast, setToast] = useState(null)

  // Modal states for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null)

  // Form states
  const [formData, setFormData] = useState({
    courseCode: '',
    name: '',
    credits: 3,
    weeklyHours: 4,
    syllabusDescription: '',
    prerequisiteCourseId: '',
  })
  const [formError, setFormError] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Excel Import states
  const [showImportModal, setShowImportModal] = useState(false)
  const [parsedCourses, setParsedCourses] = useState([])
  const [importingCourses, setImportingCourses] = useState(false)
  const [courseImportResult, setCourseImportResult] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchCourses = async (keyword = '') => {
    setLoading(true)
    try {
      const res = await api.get('/admin/courses', {
        params: keyword ? { keyword } : {},
      })
      if (res.data?.data) {
        setCourses(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err)
      if (courses.length === 0) {
        setCourses([
          { id: 1, courseCode: 'CS101', name: 'Introduction to Programming', credits: 3, weeklyHours: 4, syllabusDescription: 'Nhập môn lập trình căn bản với C/C++.', prerequisiteCourseCode: null },
          { id: 2, courseCode: 'CS201', name: 'Data Structures and Algorithms', credits: 3, weeklyHours: 4, syllabusDescription: 'Cấu trúc dữ liệu nâng cao (Tree, Graph) và các thuật toán tối ưu.', prerequisiteCourseId: 1, prerequisiteCourseCode: 'CS101' },
          { id: 3, courseCode: 'CS301', name: 'Database Management Systems', credits: 3, weeklyHours: 4, syllabusDescription: 'Mô hình CSDL quan hệ, thiết kế chuẩn hóa và SQL chuyên sâu.', prerequisiteCourseCode: null },
          { id: 4, courseCode: 'CS401', name: 'Web Application Development', credits: 3, weeklyHours: 4, syllabusDescription: 'Xây dựng ứng dụng fullstack với Spring Boot và ReactJS.', prerequisiteCourseId: 2, prerequisiteCourseCode: 'CS201' },
        ])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  // Auto search when keyword changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourses(searchKeyword.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [searchKeyword])

  const handleOpenCreateModal = () => {
    setModalMode('create')
    setEditingId(null)
    setFormData({
      courseCode: '',
      name: '',
      credits: 3,
      weeklyHours: 4,
      syllabusDescription: '',
      prerequisiteCourseId: '',
    })
    setFormError('')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (c) => {
    setModalMode('edit')
    setEditingId(c.id)
    setFormData({
      courseCode: c.courseCode,
      name: c.name,
      credits: c.credits,
      weeklyHours: c.weeklyHours,
      syllabusDescription: c.syllabusDescription || '',
      prerequisiteCourseId: c.prerequisiteCourseId || '',
    })
    setFormError('')
    setIsModalOpen(true)
  }

  const handleSaveCourse = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!formData.courseCode?.trim() || !formData.name?.trim() || !formData.credits || !formData.weeklyHours) {
      alertDialog({
        title: 'Thiếu thông tin bắt buộc',
        message: 'Vui lòng điền đầy đủ các thông tin: Mã môn học, Tên môn học, Số tín chỉ và Số giờ học/tuần.',
        variant: 'warning'
      })
      return
    }

    setFormSubmitting(true)
    const payload = {
      courseCode: formData.courseCode.trim().toUpperCase(),
      name: formData.name.trim(),
      credits: Number(formData.credits),
      weeklyHours: Number(formData.weeklyHours),
      syllabusDescription: formData.syllabusDescription,
      prerequisiteCourseId: formData.prerequisiteCourseId ? Number(formData.prerequisiteCourseId) : null,
    }

    try {
      if (modalMode === 'create') {
        await api.post('/admin/courses', payload)
        showToast('Thêm môn học mới thành công!')
      } else {
        await api.put(`/admin/courses/${editingId}`, payload)
        showToast('Cập nhật môn học thành công!')
      }
      setIsModalOpen(false)
      fetchCourses(searchKeyword)
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin môn học!'
      setFormError(msg)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDeleteCourse = async (course) => {
    const confirmed = await confirmDialog({
      title: 'Xác nhận xóa môn học',
      message: `Bạn có chắc chắn muốn xóa môn học [${course.courseCode}] ${course.name} không?\nCác lớp học phần liên quan sẽ bị ảnh hưởng nếu môn này bị xóa.`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy bỏ',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      await api.delete(`/admin/courses/${course.id}`)
      showToast(`Đã xóa môn học ${course.courseCode} thành công!`)
      fetchCourses(searchKeyword)
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể xóa môn học này!'
      showToast(msg, 'error')
    }
  }

  // Tải file mẫu Excel Môn học
  const downloadCourseTemplate = () => {
    const sampleRows = [
      {
        'Mã môn học (*)': 'CS101',
        'Tên môn học (*)': 'Nhập môn Lập trình C++',
        'Số tín chỉ (*)': 3,
        'Số giờ học/tuần (*)': 4,
        'Mã môn tiên quyết': '',
        'Mô tả đề cương': 'Cung cấp kiến thức cơ bản về lập trình cấu trúc và giải thuật căn bản.',
      },
      {
        'Mã môn học (*)': 'CS201',
        'Tên môn học (*)': 'Cấu trúc Dữ liệu & Giải thuật',
        'Số tín chỉ (*)': 3,
        'Số giờ học/tuần (*)': 4,
        'Mã môn tiên quyết': 'CS101',
        'Mô tả đề cương': 'Nghiên cứu cây, đồ thị, bảng băm và thuật toán tìm kiếm, sắp xếp nâng cao.',
      },
      {
        'Mã môn học (*)': 'CS301',
        'Tên môn học (*)': 'Cơ sở Dữ liệu Quan hệ',
        'Số tín chỉ (*)': 3,
        'Số giờ học/tuần (*)': 4,
        'Mã môn tiên quyết': '',
        'Mô tả đề cương': 'Mô hình E-R, ngôn ngữ SQL chuẩn và kỹ thuật tối ưu hóa truy vấn CSDL.',
      },
    ]

    const ws = XLSX.utils.json_to_sheet(sampleRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Import_Mon_Hoc')
    ws['!cols'] = [
      { wch: 18 },
      { wch: 35 },
      { wch: 15 },
      { wch: 18 },
      { wch: 20 },
      { wch: 45 },
    ]
    XLSX.writeFile(wb, 'Mau_Import_Mon_Hoc.xlsx')
  }

  // Xuất danh sách môn học ra Excel
  const exportCoursesToExcel = () => {
    if (!courses || courses.length === 0) {
      showToast('Không có dữ liệu môn học để xuất Excel', 'error')
      return
    }

    const rows = courses.map((c, idx) => ({
      'STT': idx + 1,
      'Mã môn học': c.courseCode || '',
      'Tên môn học': c.name || '',
      'Số tín chỉ': c.credits || 0,
      'Số giờ/tuần': c.weeklyHours || 0,
      'Môn tiên quyết': c.prerequisiteCourseCode || 'Không có',
      'Mô tả đề cương': c.syllabusDescription || '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Mon_Hoc')
    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 35 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 45 },
    ]
    XLSX.writeFile(wb, `Danh_Sach_Mon_Hoc_${new Date().toISOString().slice(0, 10)}.xlsx`)
    showToast('Xuất file Excel danh mục môn học thành công!')
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
          const courseCode = String(
            row['Mã môn học (*)'] ||
            row['Mã môn học'] ||
            row['Mã môn'] ||
            row['Course Code'] ||
            row['courseCode'] ||
            ''
          ).trim().toUpperCase()

          const name = String(
            row['Tên môn học (*)'] ||
            row['Tên môn học'] ||
            row['Tên môn'] ||
            row['Course Name'] ||
            row['name'] ||
            ''
          ).trim()

          const creditsVal = row['Số tín chỉ (*)'] || row['Số tín chỉ'] || row['Tín chỉ'] || row['Credits'] || row['credits']
          const credits = creditsVal ? parseInt(creditsVal, 10) : 3

          const hoursVal = row['Số giờ học/tuần (*)'] || row['Số giờ học/tuần'] || row['Số giờ/tuần'] || row['Weekly Hours'] || row['weeklyHours']
          const weeklyHours = hoursVal ? parseInt(hoursVal, 10) : (credits + 1)

          const prerequisiteCourseCode = String(
            row['Mã môn tiên quyết'] ||
            row['Môn tiên quyết'] ||
            row['Prerequisite'] ||
            row['prerequisiteCourseCode'] ||
            ''
          ).trim().toUpperCase()

          const syllabusDescription = String(
            row['Mô tả đề cương'] ||
            row['Mô tả'] ||
            row['Description'] ||
            row['syllabusDescription'] ||
            ''
          ).trim()

          const errors = []
          if (!courseCode) errors.push('Thiếu mã môn học')
          if (!name) errors.push('Thiếu tên môn học')
          if (isNaN(credits) || credits < 1) errors.push('Số tín chỉ không hợp lệ')
          if (isNaN(weeklyHours) || weeklyHours < 1) errors.push('Số giờ/tuần không hợp lệ')

          return {
            rowIndex: idx + 2,
            courseCode,
            name,
            credits: isNaN(credits) ? 3 : credits,
            weeklyHours: isNaN(weeklyHours) ? 4 : weeklyHours,
            prerequisiteCourseCode: prerequisiteCourseCode || null,
            syllabusDescription: syllabusDescription || null,
            isValid: errors.length === 0,
            errorMsg: errors.join(', '),
          }
        })

        setParsedCourses(parsed)
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

  // Thực hiện Import Môn học vào Backend
  const handleExecuteCourseImport = async () => {
    const validRows = parsedCourses.filter((r) => r.isValid)
    if (validRows.length === 0) {
      alertDialog({
        title: 'Không có dữ liệu hợp lệ',
        message: 'Không có dòng dữ liệu hợp lệ nào để import vào hệ thống. Vui lòng kiểm tra lại bảng danh sách bên dưới.',
        variant: 'warning',
      })
      return
    }

    setImportingCourses(true)
    const payload = validRows.map((r) => ({
      courseCode: r.courseCode,
      name: r.name,
      credits: r.credits,
      weeklyHours: r.weeklyHours,
      prerequisiteCourseCode: r.prerequisiteCourseCode || null,
      syllabusDescription: r.syllabusDescription || '',
    }))

    try {
      const res = await api.post('/admin/courses/batch', payload)
      const resultData = res.data?.data || {
        total: payload.length,
        successCount: payload.length,
        failureCount: 0,
        errors: [],
      }
      setCourseImportResult(resultData)
      setShowImportModal(false)
      fetchCourses(searchKeyword)
      showToast(`Import môn học hoàn tất: ${resultData.successCount}/${resultData.total} thành công!`)
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi thực hiện import theo lô'
      alertDialog({
        title: 'Import thất bại',
        message: msg,
        variant: 'danger',
      })
    } finally {
      setImportingCourses(false)
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
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Danh mục Môn học</h1>
          <p className="text-slate-500 text-sm mt-0.5">Quản trị danh mục học phần, thông tin tín chỉ và môn học tiên quyết (FR-06)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportCoursesToExcel}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Xuất danh sách môn học ra file Excel"
          >
            <Download size={16} className="text-emerald-700" />
            <span>Xuất Excel</span>
          </button>
          <button
            onClick={() => {
              setParsedCourses([])
              setShowImportModal(true)
            }}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Nhập danh sách môn học từ file Excel"
          >
            <Upload size={16} className="text-slate-600" />
            <span>Nhập từ Excel</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus size={18} />
            <span>Thêm môn học mới</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm nhanh theo mã hoặc tên môn học..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
          />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-xs text-slate-500">
          Tổng số: <strong className="text-slate-800 font-semibold">{courses.length}</strong> môn học
        </span>
      </div>

      {/* Course List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 size={24} className="animate-spin text-red-600" />
            <span className="text-xs">Đang tải danh mục môn học...</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Không tìm thấy môn học nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-left text-sm min-w-[720px]">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Mã môn</th>
                  <th className="px-6 py-4">Tên môn học</th>
                  <th className="px-4 py-4 text-center">Tín chỉ</th>
                  <th className="px-4 py-4 text-center">Giờ/tuần</th>
                  <th className="px-4 py-4">Môn tiên quyết</th>
                  <th className="px-6 py-4">Mô tả đề cương</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-red-600 text-xs">
                      {c.courseCode}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 text-xs">
                      {c.name}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        {c.credits} TC
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-xs text-slate-600 font-medium">
                      <div className="inline-flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        <span>{c.weeklyHours}h</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {c.prerequisiteCourseCode ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-mono font-bold rounded text-[11px] border border-amber-200">
                          {c.prerequisiteCourseCode}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={c.syllabusDescription}>
                      {c.syllabusDescription || <span className="italic text-slate-400">Chưa có đề cương</span>}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditModal(c)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Chỉnh sửa thông tin môn học"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(c)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa môn học"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create / Edit Course */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="text-red-600" size={20} />
                <span>{modalMode === 'create' ? 'Thêm mới Môn học' : 'Cập nhật Môn học'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCourse} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã môn học <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.courseCode}
                    onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                    placeholder="VD: CS101"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số tín chỉ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên môn học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Introduction to Programming"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số giờ học/tuần <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.weeklyHours}
                    onChange={(e) => setFormData({ ...formData, weeklyHours: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Môn học tiên quyết
                  </label>
                  <select
                    value={formData.prerequisiteCourseId}
                    onChange={(e) => setFormData({ ...formData, prerequisiteCourseId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Không có tiên quyết --</option>
                    {courses
                      .filter((c) => (modalMode === 'edit' ? c.id !== editingId : true))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.courseCode} - {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả đề cương (Syllabus)
                </label>
                <textarea
                  rows="3"
                  value={formData.syllabusDescription}
                  onChange={(e) => setFormData({ ...formData, syllabusDescription: e.target.value })}
                  placeholder="Nội dung tóm tắt đề cương môn học, chuẩn đầu ra..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
                >
                  {formSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{modalMode === 'create' ? 'Tạo môn học' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Excel Môn học */}
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
                    Nhập Danh mục Môn học từ Excel
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hỗ trợ thêm hàng loạt môn học, mã môn tiên quyết và số tín chỉ
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
                    Tải mẫu Excel đã được định dạng sẵn cột và hướng dẫn điền dữ liệu.
                  </p>
                </div>
                <button
                  onClick={downloadCourseTemplate}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <Download size={14} className="text-slate-600" />
                  <span>Tải mẫu Mau_Import_Mon_Hoc.xlsx</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 rounded-2xl p-6 text-center transition-colors">
                <input
                  type="file"
                  id="excelCourseInput"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="excelCourseInput"
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
              {parsedCourses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Dữ liệu đọc từ file:
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {parsedCourses.filter((r) => r.isValid).length} hợp lệ
                      </span>
                      {parsedCourses.some((r) => !r.isValid) && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          {parsedCourses.filter((r) => !r.isValid).length} lỗi
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      Tổng số {parsedCourses.length} dòng
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Dòng</th>
                          <th className="px-3 py-2">Mã môn</th>
                          <th className="px-3 py-2">Tên môn học</th>
                          <th className="px-3 py-2 text-center">Tín chỉ</th>
                          <th className="px-3 py-2 text-center">Giờ/tuần</th>
                          <th className="px-3 py-2">Môn tiên quyết</th>
                          <th className="px-3 py-2">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedCourses.map((row, idx) => (
                          <tr
                            key={idx}
                            className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}
                          >
                            <td className="px-3 py-2 font-mono text-slate-400">
                              #{row.rowIndex}
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-slate-800">
                              {row.courseCode || <span className="text-rose-500 italic">Trống</span>}
                            </td>
                            <td className="px-3 py-2 text-slate-700 max-w-[200px] truncate">
                              {row.name || <span className="text-rose-500 italic">Trống</span>}
                            </td>
                            <td className="px-3 py-2 text-center font-semibold">
                              {row.credits}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {row.weeklyHours}h
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-600">
                              {row.prerequisiteCourseCode || <span className="text-slate-400 italic">—</span>}
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
                disabled={importingCourses || parsedCourses.filter((r) => r.isValid).length === 0}
                onClick={handleExecuteCourseImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {importingCourses ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang nạp dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>
                      Tiến hành Import ({parsedCourses.filter((r) => r.isValid).length} môn)
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Dialog Modal */}
      {courseImportResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div
                className={`p-2.5 rounded-xl ${
                  courseImportResult.failureCount === 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {courseImportResult.failureCount === 0 ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <AlertCircle size={24} />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Kết quả Import Môn học
                </h3>
                <p className="text-xs text-slate-500">
                  Xử lý thành công {courseImportResult.successCount} trên tổng số {courseImportResult.total} môn học
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-xs text-slate-500">Tổng số</div>
                  <div className="text-base font-bold text-slate-800">
                    {courseImportResult.total}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <div className="text-xs text-emerald-600">Thành công</div>
                  <div className="text-base font-bold text-emerald-700">
                    {courseImportResult.successCount}
                  </div>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl">
                  <div className="text-xs text-rose-600">Thất bại</div>
                  <div className="text-base font-bold text-rose-700">
                    {courseImportResult.failureCount}
                  </div>
                </div>
              </div>

              {courseImportResult.errors && courseImportResult.errors.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-rose-700">
                    Chi tiết lỗi ({courseImportResult.errors.length}):
                  </span>
                  <div className="max-h-40 overflow-y-auto p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1">
                    {courseImportResult.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-1.5">
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
                onClick={() => setCourseImportResult(null)}
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
export default AdminCourses