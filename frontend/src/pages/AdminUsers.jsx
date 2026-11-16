import React, { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import { getRealAvatar } from '../utils/avatarUtils'
import { toast } from '../store/toastStore'
import { confirmDialog, alertDialog } from '../store/confirmStore'
import { Plus, Search, UserCheck, Shield, Trash2, Edit2, X, Check, Lock, Unlock, AlertCircle, CheckCircle, Key, History, ChevronLeft, ChevronRight, Loader2, Download, Upload, FileSpreadsheet } from 'lucide-react'

export const AdminUsers = () => {
  const currentUser = useAuthStore((state) => state.user)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState('')
  const [keyword, setKeyword] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Excel Import / Export State
  const [showImportModal, setShowImportModal] = useState(false)
  const [importRole, setImportRole] = useState('STUDENT') // 'STUDENT' | 'LECTURER'
  const [parsedUserRows, setParsedUserRows] = useState([])
  const [importingUsers, setImportingUsers] = useState(false)
  const [userImportResult, setUserImportResult] = useState(null)

  // Audit Trail State
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditLogs, setAuditLogs] = useState([])
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [auditActionFilter, setAuditActionFilter] = useState('')

  const renderAuditDelta = (valueStr) => {
    if (!valueStr) return null
    try {
      const parsed = typeof valueStr === 'string' ? JSON.parse(valueStr) : valueStr
      if (parsed && parsed.diff && typeof parsed.diff === 'object') {
        const diffEntries = Object.entries(parsed.diff)
        return (
          <div className="mt-1 space-y-1">
            <div className="flex flex-wrap gap-1">
              {diffEntries.map(([field, change]) => (
                <span
                  key={field}
                  className="inline-flex items-center gap-1 text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                >
                  <span className="font-semibold text-slate-800">{field}:</span>
                  <span className="text-rose-600 line-through">
                    {change?.from !== undefined && change?.from !== null ? String(change.from) : 'null'}
                  </span>
                  <span>→</span>
                  <span className="text-emerald-600 font-bold">
                    {change?.to !== undefined && change?.to !== null ? String(change.to) : 'null'}
                  </span>
                </span>
              ))}
            </div>
            {parsed.metadata?.reason && (
              <div className="text-[10px] text-slate-500 italic">
                Lý do: {parsed.metadata.reason}
              </div>
            )}
          </div>
        )
      }
    } catch (e) {
      // ignore
    }
    return (
      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-xs" title={valueStr}>
        Giá trị: {valueStr}
      </div>
    )
  }

  const fetchAuditLogs = async (action = '') => {
    setLoadingAudit(true)
    try {
      const url = action ? `/admin/audit-logs?action=${encodeURIComponent(action)}` : '/admin/audit-logs'
      const res = await api.get(url)
      if (res.data?.data) {
        setAuditLogs(res.data.data)
      }
    } catch (err) {
      console.error('Lỗi khi tải nhật ký kiểm toán:', err)
      toast.error('Không thể tải nhật ký kiểm toán.')
    } finally {
      setLoadingAudit(false)
    }
  }

  const openAuditModal = () => {
    setShowAuditModal(true)
    fetchAuditLogs(auditActionFilter)
  }

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

  // State
  const [currentPage, setCurrentPage] = useState(1)
  const USERS_PER_PAGE = 10

  useEffect(() => {
    setCurrentPage(1)
    fetchUsers()
  }, [selectedRole, keyword])

  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE))
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE
    return users.slice(start, start + USERS_PER_PAGE)
  }, [users, currentPage])

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
    if (!createForm.username.trim() || !createForm.fullName.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      alertDialog({
        title: 'Thiếu thông tin bắt buộc',
        message: 'Vui lòng điền đầy đủ các thông tin: Tên đăng nhập, Họ và tên, Email và Mật khẩu.',
        variant: 'warning'
      })
      return
    }

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
    const u = item?.user || item || {}
    const sp = item?.studentProfile || {}
    const lp = item?.lecturerProfile || {}
    setEditingUserId(u.id)
    setEditForm({
      fullName: u.fullName || '',
      email: u.email || '',
      role: u.role || 'STUDENT',
      status: u.status || 'ACTIVE',
      avatarUrl: u.avatarUrl || '',
      password: '',
      studentCode: sp?.studentCode || '',
      major: sp?.major || '',
      currentSemester: sp?.currentSemester || 1,
      lecturerCode: lp?.lecturerCode || '',
      department: lp?.department || '',
      degree: lp?.degree || '',
    })
    setShowEditModal(true)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    if (!editForm.fullName?.trim() || !editForm.email?.trim()) {
      alertDialog({
        title: 'Thiếu thông tin bắt buộc',
        message: 'Vui lòng điền đầy đủ Họ và tên và Email.',
        variant: 'warning'
      })
      return
    }
    if (editForm.role === 'ADMIN' && editForm.status === 'LOCKED') {
      toast.warning('Tài khoản Quản trị viên (Admin) không thể chuyển sang trạng thái Khóa!')
      return
    }
    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      await api.put(`/admin/users/${editingUserId}`, editForm)
      toast.success('Cập nhật tài khoản thành công!')
      setMessage({ type: 'success', text: 'Cập nhật tài khoản thành công!' })
      setShowEditModal(false)
      fetchUsers()
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Lỗi khi cập nhật tài khoản'
      toast.error(errMsg)
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (id, username) => {
    const targetItem = users.find((it) => (it?.user?.id === id || it?.id === id))
    const targetRole = targetItem?.user?.role || targetItem?.role
    if (targetRole === 'ADMIN') {
      toast.warning('Không thể xóa tài khoản Quản trị viên (Admin)!')
      return
    }

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
    const u = item?.user || item || {}
    if (u.role === 'ADMIN') {
      toast.warning('Tài khoản Quản trị viên (Admin) luôn ở trạng thái hoạt động, không thể khóa!')
      return
    }
    const nextStatus = u.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'
    try {
      await api.put(`/admin/users/${u.id}`, { status: nextStatus })
      const statusText = nextStatus === 'ACTIVE' ? 'mở khóa' : 'khóa'
      toast.success(`Đã ${statusText} tài khoản ${u.username}!`)
      setMessage({ type: 'success', text: `Đã ${statusText} tài khoản ${u.username}!` })
      fetchUsers()
    } catch (err) {
      toast.error('Lỗi khi cập nhật trạng thái')
      setMessage({ type: 'error', text: 'Lỗi khi cập nhật trạng thái' })
    }
  }

  const handleResetPassword = async (item) => {
    const u = item?.user || item || {}
    const confirmed = await confirmDialog({
      title: 'Đặt lại mật khẩu mặc định',
      message: `Bạn có muốn đặt lại mật khẩu cho tài khoản "${u.username}" về mật khẩu mặc định "123456" không?`,
      confirmText: 'Đặt lại về 123456',
      cancelText: 'Hủy bỏ',
      variant: 'warning',
    })
    if (!confirmed) return

    try {
      await api.put(`/admin/users/${u.id}`, { password: '123456' })
      toast.success(`Mật khẩu của tài khoản "${u.username}" đã được đặt về "123456"!`)
      setMessage({ type: 'success', text: `Đã đặt lại mật khẩu của ${u.username} về "123456" thành công!` })
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Lỗi khi đặt lại mật khẩu'
      toast.error(errMsg)
      setMessage({ type: 'error', text: errMsg })
    }
  }

  // Tải file mẫu Excel cho Sinh viên
  const downloadStudentTemplate = () => {
    const sampleRows = [
      {
        'Tên đăng nhập (username)': 'sv2026001',
        'Họ và tên': 'Nguyễn Văn Minh',
        'Email': 'nguyenvanminh@rikkei.edu.vn',
        'Mã sinh viên': 'SV2026001',
        'Chuyên ngành': 'Kỹ thuật phần mềm',
        'Mật khẩu (để trống mặc định 123456)': '123456',
      },
      {
        'Tên đăng nhập (username)': 'sv2026002',
        'Họ và tên': 'Trần Thị Mai',
        'Email': 'tranthimai@rikkei.edu.vn',
        'Mã sinh viên': 'SV2026002',
        'Chuyên ngành': 'Khoa học máy tính',
        'Mật khẩu (để trống mặc định 123456)': '123456',
      },
      {
        'Tên đăng nhập (username)': 'sv2026003',
        'Họ và tên': 'Lê Hoàng Nam',
        'Email': 'lehoangnam@rikkei.edu.vn',
        'Mã sinh viên': 'SV2026003',
        'Chuyên ngành': 'Trí tuệ nhân tạo',
        'Mật khẩu (để trống mặc định 123456)': '123456',
      },
    ]

    const ws = XLSX.utils.json_to_sheet(sampleRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Import_Sinh_Vien')
    ws['!cols'] = [
      { wch: 25 },
      { wch: 25 },
      { wch: 30 },
      { wch: 18 },
      { wch: 25 },
      { wch: 35 },
    ]
    XLSX.writeFile(wb, 'Mau_Import_Sinh_Vien.xlsx')
  }

  // Tải file mẫu Excel cho Giảng viên
  const downloadLecturerTemplate = () => {
    const sampleRows = [
      {
        'Tên đăng nhập (username)': 'gv_cntt_01',
        'Họ và tên': 'TS. Nguyễn Văn Hùng',
        'Email': 'nguyenvanhung@rikkei.edu.vn',
        'Mã giảng viên': 'GV2026001',
        'Khoa / Bộ môn': 'Khoa Công nghệ Thông tin',
        'Học vị': 'Tiến sĩ',
        'Mật khẩu (để trống mặc định 123456)': '123456',
      },
      {
        'Tên đăng nhập (username)': 'gv_cntt_02',
        'Họ và tên': 'ThS. Lê Thị Lan',
        'Email': 'lethilan@rikkei.edu.vn',
        'Mã giảng viên': 'GV2026002',
        'Khoa / Bộ môn': 'Khoa Khoa học Máy tính',
        'Học vị': 'Thạc sĩ',
        'Mật khẩu (để trống mặc định 123456)': '123456',
      },
    ]

    const ws = XLSX.utils.json_to_sheet(sampleRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Import_Giang_Vien')
    ws['!cols'] = [
      { wch: 25 },
      { wch: 25 },
      { wch: 30 },
      { wch: 18 },
      { wch: 28 },
      { wch: 16 },
      { wch: 35 },
    ]
    XLSX.writeFile(wb, 'Mau_Import_Giang_Vien.xlsx')
  }

  // Xuất danh sách người dùng ra Excel
  const exportUsersToExcel = () => {
    if (!users || users.length === 0) {
      toast.warning('Không có dữ liệu người dùng để xuất Excel')
      return
    }

    const rows = users.map((item, idx) => {
      const u = item?.user || item || {}
      const sp = item?.studentProfile
      const lp = item?.lecturerProfile

      let code = ''
      let detail1 = ''
      let detail2 = ''

      if (u.role === 'STUDENT') {
        code = sp?.studentCode || ''
        detail1 = sp?.major || ''
        detail2 = `Kỳ ${sp?.currentSemester || 1}`
      } else if (u.role === 'LECTURER') {
        code = lp?.lecturerCode || ''
        detail1 = lp?.department || ''
        detail2 = lp?.degree || ''
      }

      return {
        'STT': idx + 1,
        'Tên đăng nhập': u.username || '',
        'Họ và tên': u.fullName || '',
        'Email': u.email || '',
        'Vai trò': u.role === 'STUDENT' ? 'Sinh viên' : u.role === 'LECTURER' ? 'Giảng viên' : 'Quản trị viên',
        'Mã SV/GV': code,
        'Khoa / Ngành': detail1,
        'Học kỳ / Học vị': detail2,
        'Trạng thái': u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa',
        'Ngày tạo': u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '',
      }
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Nguoi_Dung')

    ws['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 26 },
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 26 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
    ]

    const filename = `Danh_Sach_Nguoi_Dung_${selectedRole || 'TAT_CA'}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, filename)
    toast.success('Đã xuất file Excel danh sách người dùng thành công!')
  }

  // Đọc file Excel người dùng tải lên
  const handleUserFileUpload = (e) => {
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

          const username = getVal('tên đăng nhập (username)', 'tên đăng nhập', 'username', 'user_name')
          const fullName = getVal('họ và tên', 'họ tên', 'fullname', 'full_name', 'name')
          const email = getVal('email', 'thư điện tử')
          const password = getVal('mật khẩu (để trống mặc định 123456)', 'mật khẩu', 'password') || '123456'

          const errors = []
          if (!username) errors.push('Thiếu Tên đăng nhập')
          else if (username.length < 3) errors.push('Tên đăng nhập tối thiểu 3 ký tự')

          if (!fullName) errors.push('Thiếu Họ và tên')
          if (!email) errors.push('Thiếu Email')
          else if (!email.includes('@')) errors.push('Email không đúng định dạng')

          if (importRole === 'STUDENT') {
            const studentCode = getVal('mã sinh viên', 'mã sv', 'studentcode', 'student_code')
            const major = getVal('chuyên ngành', 'ngành', 'khoa/ngành', 'major') || 'Kỹ thuật phần mềm'
            return {
              rowIdx: idx + 1,
              username,
              fullName,
              email,
              password,
              role: 'STUDENT',
              studentCode,
              major,
              isValid: errors.length === 0,
              errors,
            }
          } else {
            const lecturerCode = getVal('mã giảng viên', 'mã gv', 'lecturercode', 'lecturer_code')
            const department = getVal('khoa / bộ môn', 'khoa', 'bộ môn', 'department') || 'Khoa CNTT'
            const degree = getVal('học vị', 'trình độ', 'degree') || 'Thạc sĩ'
            return {
              rowIdx: idx + 1,
              username,
              fullName,
              email,
              password,
              role: 'LECTURER',
              lecturerCode,
              department,
              degree,
              isValid: errors.length === 0,
              errors,
            }
          }
        })

        setParsedUserRows(parsed)
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

  // Thực hiện Import người dùng
  const handleExecuteUserImport = async () => {
    const validRows = parsedUserRows.filter((r) => r.isValid)
    if (validRows.length === 0) {
      alertDialog({
        title: 'Không có dữ liệu hợp lệ',
        message: 'Không tìm thấy dòng dữ liệu hợp lệ nào để nhập.',
        variant: 'warning',
      })
      return
    }

    setImportingUsers(true)
    try {
      const payload = validRows.map((r) => {
        if (importRole === 'STUDENT') {
          return {
            username: r.username,
            fullName: r.fullName,
            email: r.email,
            password: r.password,
            role: 'STUDENT',
            studentCode: r.studentCode,
            major: r.major,
          }
        } else {
          return {
            username: r.username,
            fullName: r.fullName,
            email: r.email,
            password: r.password,
            role: 'LECTURER',
            lecturerCode: r.lecturerCode,
            department: r.department,
            degree: r.degree,
          }
        }
      })

      const res = await api.post('/admin/users/batch', payload)
      const resultData = res.data?.data || {}
      setUserImportResult(resultData)
      setShowImportModal(false)
      setParsedUserRows([])
      fetchUsers()
      if (resultData.successCount > 0) {
        toast.success(`Đã nhập thành công ${resultData.successCount} tài khoản!`)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi nhập danh sách người dùng')
    } finally {
      setImportingUsers(false)
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportUsersToExcel}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Xuất danh sách người dùng ra file Excel"
          >
            <Download size={14} className="text-emerald-700" />
            <span>Xuất Excel</span>
          </button>
          <button
            onClick={() => {
              setParsedUserRows([])
              setShowImportModal(true)
            }}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Nhập danh sách Sinh viên / Giảng viên từ file Excel"
          >
            <Upload size={14} className="text-blue-700" />
            <span>Nhập từ Excel</span>
          </button>
          <button
            onClick={openAuditModal}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <History size={14} />
            <span>Nhật ký</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Thêm tài khoản</span>
          </button>
        </div>
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
            Tất cả {users.length > 0 && `(${users.length})`}
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
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left text-sm min-w-[760px]">
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
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={24} className="animate-spin text-red-600" />
                      <span className="text-xs font-medium">Đang tải danh sách tài khoản...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-xs">
                    Không tìm thấy tài khoản người dùng nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((item) => {
                  const u = item?.user || item || {}
                  const sp = item?.studentProfile || null
                  const lp = item?.lecturerProfile || null
                  const isAdmin = u.role === 'ADMIN'
                  const isSelf = currentUser && (currentUser.id === u.id || currentUser.username === u.username)

                  return (
                    <tr key={u.id || Math.random()} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getRealAvatar(u)}
                            alt="avatar"
                            className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 object-cover shadow-2xs"
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.src = '/images/avatar-student.jpg'
                            }}
                          />
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{u.fullName || 'Chưa cập nhật'}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                  Bạn
                                </span>
                              )}
                            </div>
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
                        {isAdmin ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default select-none shadow-2xs"
                            title="Tài khoản Quản trị viên (Admin) luôn duy trì hoạt động và không thể bị khóa"
                          >
                            <Shield size={12} className="text-emerald-600" />
                            <span>Hoạt động</span>
                          </span>
                        ) : (
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
                        )}
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
                          {isAdmin ? (
                            <span
                              className="p-1.5 text-slate-300 cursor-not-allowed rounded-lg opacity-40 select-none inline-flex"
                              title="Không thể xóa tài khoản Quản trị viên (Admin)"
                            >
                              <Trash2 size={16} />
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa tài khoản"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {users.length > USERS_PER_PAGE && (
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-600 font-sans">
              Hiển thị <strong className="text-slate-900 font-mono">{(currentPage - 1) * USERS_PER_PAGE + 1}</strong> - <strong className="text-slate-900 font-mono">{Math.min(currentPage * USERS_PER_PAGE, users.length)}</strong> trên tổng số <strong className="text-slate-900 font-mono">{users.length}</strong> tài khoản
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                <ChevronLeft size={14} />
                <span>Trước</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono font-medium transition ${
                      currentPage === page
                        ? 'bg-red-600 text-white font-bold shadow-2xs'
                        : 'text-slate-700 hover:bg-white border border-slate-200/80 bg-white/60'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                <span>Sau</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
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
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Trạng thái</label>
                  {editForm.role === 'ADMIN' ? (
                    <div className="px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-600 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-emerald-700 text-xs">
                        <Shield size={14} className="text-emerald-600" /> Hoạt động (Cố định)
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">Bảo vệ quyền Admin</span>
                    </div>
                  ) : (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                      <option value="LOCKED">Khóa (LOCKED)</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                <input
                  type="email"
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
      {/* Audit Trail Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Nhật ký Kiểm toán Hệ thống (Audit Trail)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ghi vết bất biến các hành động nhạy cảm: Tạo tài khoản, Đổi trạng thái, Khóa/Mở khóa, Đổi mật khẩu
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter bar */}
            <div className="py-3 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="font-semibold text-slate-500">Lọc theo hành động:</span>
              {[
                { key: '', label: 'Tất cả' },
                { key: 'USER_CREATED', label: 'Tạo tài khoản' },
                { key: 'USER_LOCKED', label: 'Khóa tài khoản' },
                { key: 'USER_STATUS_CHANGED', label: 'Đổi trạng thái' },
                { key: 'PASSWORD_RESET', label: 'Đặt lại mật khẩu' },
                { key: 'USER_DELETED', label: 'Xóa tài khoản' },
                { key: 'GRADE_UPDATED', label: 'Chấm điểm' },
                { key: 'GRADE_LOCKED', label: 'Chốt điểm' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => {
                    setAuditActionFilter(f.key)
                    fetchAuditLogs(f.key)
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    auditActionFilter === f.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto mt-2 border border-slate-100 rounded-xl">
              {loadingAudit ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Đang tải nhật ký kiểm toán...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Chưa có bản ghi nhật ký kiểm toán nào phù hợp.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">Hành động</th>
                      <th className="py-2.5 px-3">Người thực hiện</th>
                      <th className="py-2.5 px-3">Đối tượng</th>
                      <th className="py-2.5 px-3">Mô tả chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {auditLogs.map((log) => {
                      const isCreate = log.action === 'USER_CREATED'
                      const isLock = log.action === 'USER_LOCKED'
                      const isPass = log.action === 'PASSWORD_RESET'
                      const isDel = log.action === 'USER_DELETED'
                      const isGrade = log.action === 'GRADE_UPDATED' || log.action === 'GRADE_ADJUSTMENT'
                      const isGradeLock = log.action === 'GRADE_LOCKED'

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—'}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                isCreate
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isLock
                                  ? 'bg-rose-100 text-rose-800'
                                  : isPass
                                  ? 'bg-amber-100 text-amber-800'
                                  : isDel
                                  ? 'bg-red-100 text-red-800'
                                  : isGrade
                                  ? 'bg-purple-100 text-purple-800'
                                  : isGradeLock
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-900">
                            {log.actorUsername}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">{log.targetEntity}</span> #{log.targetId}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div>{log.summary}</div>
                            {renderAuditDelta(log.newValue)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end mt-4">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập Tài Khoản Hàng Loạt Từ Excel */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="text-blue-700" size={22} />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Nhập Danh Sách Tài Khoản Từ File Excel
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Khởi tạo hàng loạt tài khoản & hồ sơ Sinh viên hoặc Giảng viên
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setParsedUserRows([])
                }}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Role Selection Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Chọn đối tượng cần nhập:
                </label>
                <div className="flex rounded-xl bg-slate-100 p-1 gap-1 max-w-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setImportRole('STUDENT')
                      setParsedUserRows([])
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      importRole === 'STUDENT'
                        ? 'bg-white text-red-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sinh viên
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportRole('LECTURER')
                      setParsedUserRows([])
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      importRole === 'LECTURER'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Giảng viên
                  </button>
                </div>
              </div>

              {/* Step 2: Download Template */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>2. Tải file mẫu {importRole === 'STUDENT' ? 'Sinh viên' : 'Giảng viên'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                      Chuẩn định dạng
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    File chứa sẵn tiêu đề cột và dữ liệu minh họa. Mật khẩu mặc định là 123456.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={importRole === 'STUDENT' ? downloadStudentTemplate : downloadLecturerTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                >
                  <Download size={14} className="text-blue-600" />
                  <span>Tải file mẫu ({importRole === 'STUDENT' ? 'Sinh viên' : 'Giảng viên'})</span>
                </button>
              </div>

              {/* Step 3: Upload File */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  3. Tải lên file Excel (.xlsx, .xls)
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-blue-50/30 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleUserFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                  <div className="text-xs font-bold text-slate-800">
                    Kéo thả file Excel vào đây hoặc <span className="text-blue-700 underline">bấm để chọn file</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Định dạng hỗ trợ: .xlsx, .xls</div>
                </div>
              </div>

              {/* Step 4: Preview Table */}
              {parsedUserRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Đã đọc {parsedUserRows.length} tài khoản:
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {parsedUserRows.filter((r) => r.isValid).length} hợp lệ
                      </span>
                      {parsedUserRows.some((r) => !r.isValid) && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          {parsedUserRows.filter((r) => !r.isValid).length} dòng lỗi
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead className="bg-slate-100 sticky top-0 text-[11px] text-slate-600 uppercase">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Tên đăng nhập</th>
                          <th className="py-2 px-3">Họ và tên</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">
                            {importRole === 'STUDENT' ? 'Mã SV / Ngành' : 'Mã GV / Khoa'}
                          </th>
                          <th className="py-2 px-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedUserRows.map((row) => (
                          <tr
                            key={row.rowIdx}
                            className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}
                          >
                            <td className="py-2 px-3 text-slate-400">{row.rowIdx}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{row.username}</td>
                            <td className="py-2 px-3 font-sans text-slate-800">{row.fullName}</td>
                            <td className="py-2 px-3 text-slate-600">{row.email}</td>
                            <td className="py-2 px-3 font-sans text-slate-700">
                              {importRole === 'STUDENT'
                                ? `${row.studentCode || '-'} • ${row.major || ''}`
                                : `${row.lecturerCode || '-'} • ${row.department || ''}`}
                            </td>
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
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false)
                    setParsedUserRows([])
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleExecuteUserImport}
                  disabled={importingUsers || parsedUserRows.filter((r) => r.isValid).length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 transition cursor-pointer disabled:opacity-50"
                >
                  {importingUsers && <Loader2 size={14} className="animate-spin" />}
                  <span>
                    Xác nhận Import ({parsedUserRows.filter((r) => r.isValid).length} tài khoản)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Báo Cáo Kết Quả Nhập Người Dùng */}
      {userImportResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <CheckCircle className="text-emerald-600" size={20} />
                Kết Quả Nhập Tài Khoản
              </h3>
              <button
                onClick={() => setUserImportResult(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <div className="text-2xl font-black text-emerald-700 font-mono">
                    {userImportResult.successCount || 0}
                  </div>
                  <div className="text-xs font-semibold text-emerald-800 mt-0.5">Thành công</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-2xl font-black text-slate-700 font-mono">
                    {userImportResult.failureCount || 0}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 mt-0.5">Thất bại / Trùng</div>
                </div>
              </div>

              {userImportResult.errors && userImportResult.errors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-800">Chi tiết các dòng lỗi:</div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 font-mono text-[11px]">
                    {userImportResult.errors.map((err, idx) => (
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
                  onClick={() => setUserImportResult(null)}
                  className="w-full py-2.5 rounded-xl font-semibold text-xs bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
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
