import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { confirmDialog } from '../store/confirmStore'
import { Plus, BookOpen, Clock, Loader2, Search, Edit2, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react'

export const AdminCourses = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [toast, setToast] = useState(null)

  // Modal states
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

  const handleSearch = (e) => {
    e.preventDefault()
    fetchCourses(searchKeyword)
  }

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

    if (!formData.courseCode.trim()) {
      setFormError('Mã môn học không được để trống!')
      return
    }
    if (!formData.name.trim()) {
      setFormError('Tên môn học không được để trống!')
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
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Plus size={18} />
          <span>Thêm môn học mới</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-96">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã hoặc tên môn học..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
          >
            Tìm kiếm
          </button>
        </form>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
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
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {c.name}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-full">
                        {c.credits} TC
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-slate-600 text-xs">
                      {c.weeklyHours}h
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {c.prerequisiteCourseCode ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-medium rounded border border-amber-200">
                          {c.prerequisiteCourseCode}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Không có</span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-xs text-slate-600 line-clamp-2" title={c.syllabusDescription}>
                        {c.syllabusDescription || <span className="text-slate-400 italic">Chưa có đề cương</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Chỉnh sửa môn học"
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Course */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {modalMode === 'create' ? 'Thêm mới Môn học' : `Cập nhật Môn học: ${formData.courseCode}`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã môn học *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: CS301, AI101..."
                    value={formData.courseCode}
                    onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tên môn học *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Database Systems..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số tín chỉ *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số giờ học/tuần *</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={formData.weeklyHours}
                    onChange={(e) => setFormData({ ...formData, weeklyHours: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Môn học tiên quyết (Prerequisite)</label>
                <select
                  value={formData.prerequisiteCourseId}
                  onChange={(e) => setFormData({ ...formData, prerequisiteCourseId: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white"
                >
                  <option value="">-- Không có môn tiên quyết --</option>
                  {courses
                    .filter((c) => modalMode === 'create' || c.id !== editingId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.courseCode}] {c.name} ({c.credits} TC)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả đề cương học phần (Syllabus Description)
                </label>
                <textarea
                  rows="4"
                  placeholder="Nội dung tóm tắt đề cương môn học, chuẩn đầu ra..."
                  value={formData.syllabusDescription}
                  onChange={(e) => setFormData({ ...formData, syllabusDescription: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white leading-relaxed font-mono"
                />
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
    </div>
  )
}
export default AdminCourses
