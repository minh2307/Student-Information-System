import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { getRealAvatar } from '../utils/avatarUtils'
import { toast } from '../store/toastStore'
import { confirmDialog } from '../store/confirmStore'
import { Plus, Search, UserCheck, Shield, Trash2, Edit2, X, Check, Lock, Unlock, AlertCircle, CheckCircle, Key } from 'lucide-react'

export const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState('')
  const [keyword, setKeyword] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Create Form State
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '123456',
    fullName: '',
    role: 'STUDENT',
    avatarUrl: '',
    studentCode: '',
    major: 'B.Tech - Computer Science',
    lecturerCode: '',
    department: 'Khoa Công nghệ Thông tin',
    degree: 'Tiến sĩ',
  })

  // Edit Form State
  const [editingUserId, setEditingUserId] = useState(null)
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    role: 'STUDENT',
    status: 'ACTIVE',
    avatarUrl: '',
    password: '',
    studentCode: '',
    major: '',
    currentSemester: 1,
    lecturerCode: '',
    department: '',
    degree: '',
  })

  useEffect(() => {
    fetchUsers()
  }, [selectedRole, keyword])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      let url = '/admin/users'
      const params = new URLSearchParams()
      if (selectedRole) params.append('role', selectedRole)
      if (keyword) params.append('keyword', keyword)
      if (params.toString()) url += `?${params.toString()}`

      const res = await api.get(url)
      if (res.data?.data) {
        setUsers(res.data.data)
      }
    } catch (err) {
      console.warn('API error, using initial fallback list for dev:', err)
      // Fallback
      setUsers([
        {
          user: { id: 1, username: 'admin', fullName: 'Quản trị viên Hệ thống', email: 'admin@rikkei.edu.vn', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-10-19T10:00:00' },
          studentProfile: null,
          lecturerProfile: null,
        },
        {
          user: { id: 2, username: 'gv001', fullName: 'TS. Nguyễn Văn A', email: 'nguyenvana@rikkei.edu.vn', role: 'LECTURER', status: 'ACTIVE', createdAt: '2026-10-19T10:00:00' },
          studentProfile: null,
          lecturerProfile: { lecturerCode: 'GV001', department: 'Khoa CNTT', degree: 'Tiến sĩ' },
        },
        {
          user: { id: 4, username: 'sv2024001', fullName: 'Nguyễn Văn C', email: 'nguyenvanc@rikkei.edu.vn', role: 'STUDENT', status: 'ACTIVE', createdAt: '2026-10-19T10:00:00' },
          studentProfile: { studentCode: 'SV2024001', major: 'Computer Science', currentSemester: 6, creditsEarned: 84 },
          lecturerProfile: null,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      await api.post('/admin/users', createForm)
      setMessage({ type: 'success', text: `Tạo tài khoản ${createForm.username} thành công!` })
      setShowCreateModal(false)
      setCreateForm({
        username: '',
        email: '',
        password: '123456',
        fullName: '',
        role: 'STUDENT',
        avatarUrl: '',
        studentCode: '',
        major: 'B.Tech - Computer Science',
        lecturerCode: '',
        department: 'Khoa Công nghệ Thông tin',
        degree: 'Tiến sĩ',
      })
      fetchUsers()
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Lỗi khi tạo tài khoản'
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (item) => {
    setEditingUserId(item.user.id)
    setEditForm({
      fullName: item.user.fullName || '',
      email: item.user.email || '',
      role: item.user.role || 'STUDENT',
      status: item.user.status || 'ACTIVE',
      avatarUrl: item.user.avatarUrl || '',
      password: '',
      studentCode: item.studentProfile?.studentCode || '',
      major: item.studentProfile?.major || '',
      currentSemester: item.studentProfile?.currentSemester || 1,
      lecturerCode: item.lecturerProfile?.lecturerCode || '',
      department: item.lecturerProfile?.department || '',
      degree: item.lecturerProfile?.degree || '',
    })
    setShowEditModal(true)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      await api.put(`/admin/users/${editingUserId}`, editForm)
      setMessage({ type: 'success', text: 'Cập nhật tài khoản thành công!' })
      setShowEditModal(false)
      fetchUsers()
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Lỗi khi cập nhật tài khoản'
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (id, username) => {
    const confirmed = await confirmDialog({
      title: 'Xác nhận xóa tài khoản',
      message: `Bạn có chắc chắn muốn xóa tài khoản "${username}" không?\nTất cả hồ sơ học vụ, lớp học và thông tin liên quan sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác!`,
      confirmText: 'Xác nhận xóa vĩnh viễn',
      cancelText: 'Hủy bỏ',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      await api.delete(`/admin/users/${id}`)
      toast.success(`Đã xóa tài khoản "${username}" thành công!`)
      setMessage({ type: 'success', text: `Đã xóa tài khoản ${username}!` })
      fetchUsers()
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Lỗi khi xóa tài khoản'
      toast.error(errMsg)
      setMessage({ type: 'error', text: errMsg })
    }
  }

  const handleToggleStatus = async (item) => {
    const nextStatus = item.user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'
    try {
      await api.put(`/admin/users/${item.user.id}`, { status: nextStatus })
      const statusText = nextStatus === 'ACTIVE' ? 'mở khóa' : 'khóa'
      toast.success(`Đã ${statusText} tài khoản ${item.user.username}!`)
      setMessage({ type: 'success', text: `Đã ${statusText} tài khoản ${item.user.username}!` })
      fetchUsers()
    } catch (err) {
      toast.error('Lỗi khi cập nhật trạng thái')
      setMessage({ type: 'error', text: 'Lỗi khi cập nhật trạng thái' })
    }
  }

  const handleResetPassword = async (item) => {
    const confirmed = await confirmDialog({
      title: 'Đặt lại mật khẩu mặc định',
      message: `Bạn có muốn đặt lại mật khẩu cho tài khoản "${item.user.username}" về mật khẩu mặc định "123456" không?`,
      confirmText: 'Đặt lại về 123456',
      cancelText: 'Hủy bỏ',
      variant: 'warning',
    })
    if (!confirmed) return

    try {
      await api.put(`/admin/users/${item.user.id}`, { password: '123456' })
      toast.success(`Mật khẩu của tài khoản "${item.user.username}" đã được đặt về "123456"!`)
      setMessage({ type: 'success', text: `Đã đặt lại mật khẩu của ${item.user.username} về "123456" thành công!` })
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Lỗi khi đặt lại mật khẩu'
      toast.error(errMsg)
      setMessage({ type: 'error', text: errMsg })
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Tài khoản & Hồ sơ</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            CRUD tài khoản và phân quyền hồ sơ Sinh viên, Giảng viên, Quản trị viên
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm shadow-blue-500/25 transition-colors"
        >
          <Plus size={16} />
          <span>Thêm tài khoản mới</span>
        </button>
      </div>

      {/* Alert Message */}
      {message.text && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedRole('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedRole === '' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setSelectedRole('STUDENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedRole === 'STUDENT' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-blue-100'
            }`}
          >
            Sinh viên
          </button>
          <button
            onClick={() => setSelectedRole('LECTURER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedRole === 'LECTURER' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Giảng viên
          </button>
          <button
            onClick={() => setSelectedRole('ADMIN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedRole === 'ADMIN' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Quản trị viên
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên, mã SV/GV, email..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Tài khoản & Người dùng</th>
                <th className="px-4 py-4">Email</th>
                <th className="px-4 py-4">Vai trò & Mã hồ sơ</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((item) => {
                const u = item.user
                const sp = item.studentProfile
                const lp = item.lecturerProfile

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getRealAvatar(u)}
                          alt="avatar"
                          className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 object-cover shadow-2xs"
                          onError={(e) => {
                            e.target.src = '/images/avatar-student.jpg'
                          }}
                        />
                        <div>
                          <div className="font-bold text-slate-800">{u.fullName}</div>
                          <div className="text-xs text-slate-400 font-mono">@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-600 font-medium">{u.email}</td>

                    <td className="px-4 py-4">
                      <div>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : u.role === 'LECTURER'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {u.role}
                        </span>
                        {sp && (
                          <div className="text-xs text-slate-500 mt-1 font-mono">
                            Mã: <strong className="text-slate-700">{sp.studentCode}</strong> ({sp.major})
                          </div>
                        )}
                        {lp && (
                          <div className="text-xs text-slate-500 mt-1 font-mono">
                            Mã: <strong className="text-slate-700">{lp.lecturerCode}</strong> ({lp.department})
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        title="Bấm để đổi trạng thái"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? <Unlock size={12} /> : <Lock size={12} />}
                        <span>{u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}</span>
                      </button>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResetPassword(item)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Đặt lại mật khẩu về mặc định (123456)"
                        >
                          <Key size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa"
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
      </div>

      {/* Modal: Create User */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">Tạo Tài khoản & Hồ sơ mới</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tên đăng nhập *</label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="VD: sv2024005, gv003..."
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Vai trò *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="STUDENT">Sinh viên</option>
                    <option value="LECTURER">Giảng viên</option>
                    <option value="ADMIN">Quản trị viên</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="email@rikkei.edu.vn"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Mật khẩu * <span className="text-red-700 font-normal">(Mặc định: 123456)</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Conditional Profile Fields */}
              {createForm.role === 'STUDENT' && (
                <div className="p-3.5 bg-red-50/60 rounded-xl border border-blue-100 space-y-3">
                  <span className="text-xs font-bold text-blue-900 block">Thông tin Sinh viên</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Mã sinh viên</label>
                      <input
                        type="text"
                        value={createForm.studentCode}
                        onChange={(e) => setCreateForm({ ...createForm, studentCode: e.target.value })}
                        placeholder="Để trống tự sinh"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Ngành học</label>
                      <input
                        type="text"
                        value={createForm.major}
                        onChange={(e) => setCreateForm({ ...createForm, major: e.target.value })}
                        placeholder="Computer Science"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {createForm.role === 'LECTURER' && (
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-3">
                  <span className="text-xs font-bold text-emerald-900 block">Thông tin Giảng viên</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Mã GV</label>
                      <input
                        type="text"
                        value={createForm.lecturerCode}
                        onChange={(e) => setCreateForm({ ...createForm, lecturerCode: e.target.value })}
                        placeholder="GV003"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Khoa</label>
                      <input
                        type="text"
                        value={createForm.department}
                        onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                        placeholder="Khoa CNTT"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Học vị</label>
                      <input
                        type="text"
                        value={createForm.degree}
                        onChange={(e) => setCreateForm({ ...createForm, degree: e.target.value })}
                        placeholder="TS, ThS..."
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Đang tạo...' : 'Xác nhận tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">Chỉnh sửa Tài khoản</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Trạng thái</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                    <option value="LOCKED">Khóa (LOCKED)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Đổi mật khẩu mới (Bỏ trống nếu giữ nguyên)
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {editForm.role === 'STUDENT' && (
                <div className="p-3.5 bg-red-50/60 rounded-xl border border-blue-100 space-y-3">
                  <span className="text-xs font-bold text-blue-900 block">Cập nhật Hồ sơ Sinh viên</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Mã sinh viên</label>
                      <input
                        type="text"
                        value={editForm.studentCode}
                        onChange={(e) => setEditForm({ ...editForm, studentCode: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Ngành đào tạo</label>
                      <input
                        type="text"
                        value={editForm.major}
                        onChange={(e) => setEditForm({ ...editForm, major: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editForm.role === 'LECTURER' && (
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-3">
                  <span className="text-xs font-bold text-emerald-900 block">Cập nhật Hồ sơ Giảng viên</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Mã giảng viên</label>
                      <input
                        type="text"
                        value={editForm.lecturerCode}
                        onChange={(e) => setEditForm({ ...editForm, lecturerCode: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Khoa</label>
                      <input
                        type="text"
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
