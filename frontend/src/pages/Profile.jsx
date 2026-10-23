import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { getRealAvatar } from '../utils/avatarUtils'
import api from '../services/api'
import { 
  User, 
  Mail, 
  Shield, 
  KeyRound, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  GraduationCap, 
  Briefcase, 
  Award,
  Hash,
  ShieldCheck
} from 'lucide-react'

export const Profile = () => {
  const { user, updateUser } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Form edit contact
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  // Form change password
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await api.get('/profile/me')
      if (res.data?.data) {
        const data = res.data.data
        setProfileData(data)
        setFullName(data.user?.fullName || '')
        setEmail(data.user?.email || '')
        setAvatarUrl(data.user?.avatarUrl || '')
      }
    } catch (err) {
      console.warn('Could not fetch profile from API, using store user:', err)
      setFullName(user?.fullName || '')
      setEmail(user?.email || 'user@rikkei.edu.vn')
      setAvatarUrl(user?.avatarUrl || '')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateContact = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })
    setSaving(true)

    try {
      const res = await api.put('/profile/me', {
        fullName,
        email,
        avatarUrl,
      })
      if (res.data?.data?.user) {
        updateUser(res.data.data.user)
      }
      setMessage({ type: 'success', text: 'Cập nhật thông tin lý lịch thành công!' })
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Lỗi khi cập nhật thông tin'
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu mới phải có tối thiểu 6 ký tự' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Xác nhận mật khẩu mới không khớp' })
      return
    }

    setSaving(true)
    try {
      await api.put('/profile/me', {
        oldPassword,
        newPassword,
      })
      setMessage({ type: 'success', text: 'Đổi mật khẩu tài khoản thành công!' })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Mật khẩu hiện tại không chính xác'
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setSaving(false)
    }
  }

  const studentProfile = profileData?.studentProfile
  const lecturerProfile = profileData?.lecturerProfile

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Page Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700">
          Học Viện Công Nghệ Rikkei • Hồ Sơ Học Vụ Cá Nhân
        </span>
        <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
          Lý Lịch & Bảo Mật Tài Khoản
        </h1>
        <p className="text-xs text-stone-600 mt-0.5">
          Quản lý thông tin định danh cá nhân, chương trình đào tạo và thiết lập mật khẩu truy cập
        </p>
      </div>

      {/* Alert message */}
      {message.text && (
        <div
          className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={16} className="text-emerald-700 shrink-0" /> : <AlertCircle size={16} className="text-red-700 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 2. Official Identity Dossier Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-2xs flex flex-col md:flex-row items-center gap-6">
        <div className="relative shrink-0">
          <div className="w-24 h-28 rounded-xl border-2 border-stone-300 overflow-hidden bg-stone-100 shadow-2xs flex items-center justify-center">
            <img
              src={avatarUrl || getRealAvatar(user)}
              alt="Avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = '/images/avatar-student.jpg'
              }}
            />
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-red-700 text-white whitespace-nowrap shadow-2xs">
            {user?.role || 'STUDENT'}
          </span>
        </div>

        <div className="text-center md:text-left flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
            <h2 className="text-lg font-bold text-stone-900 uppercase tracking-tight">
              {fullName || user?.fullName || 'Nguyễn Văn C'}
            </h2>
            <span className="font-mono text-xs font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200 w-fit mx-auto sm:mx-0">
              MSSV: {user?.username || 'SV2024001'}
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-1 font-sans">
            Chuyên ngành: <strong>Kỹ nghệ Phần mềm (Software Engineering)</strong> • Khóa 2024
          </p>

          <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start text-xs font-mono">
            <span className="px-2.5 py-1 bg-stone-100 rounded border border-stone-200 text-stone-700 flex items-center gap-1.5 text-[11px]">
              <Mail size={12} className="text-stone-400" />
              {email}
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-semibold flex items-center gap-1">
              <ShieldCheck size={12} /> Trực tuyến • Chính quy
            </span>
          </div>
        </div>
      </div>

      {/* 3. Role-specific Academic Dossier Details */}
      {user?.role === 'STUDENT' && studentProfile && (
        <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
          <h3 className="text-xs font-mono font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2 mb-3">
            <GraduationCap size={15} className="text-red-700" />
            <span>Tiến Độ Đào Tạo Học Vụ Tích Lũy</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-stone-200">
              <span className="text-[10px] font-mono text-stone-500 uppercase">Mã sinh viên</span>
              <p className="text-sm font-bold text-stone-900 font-mono mt-0.5">{studentProfile.studentCode}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-stone-200">
              <span className="text-[10px] font-mono text-stone-500 uppercase">Chuyên ngành</span>
              <p className="text-xs font-semibold text-stone-900 mt-0.5 truncate">{studentProfile.major}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-stone-200">
              <span className="text-[10px] font-mono text-stone-500 uppercase">Học kỳ hiện tại</span>
              <p className="text-xs font-bold text-stone-900 mt-0.5">Kỳ {studentProfile.currentSemester} (Năm 2)</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-stone-200">
              <span className="text-[10px] font-mono text-stone-500 uppercase">Tín chỉ tích lũy</span>
              <p className="text-sm font-bold font-mono text-red-800 mt-0.5">
                {studentProfile.creditsEarned} / {studentProfile.totalRequiredCredits} TC
              </p>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'LECTURER' && lecturerProfile && (
        <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
          <h3 className="text-xs font-mono font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Briefcase size={15} className="text-red-700" />
            <span>Hồ Sơ Cán Bộ Giảng Dạy</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-stone-200">
              <span className="text-[10px] font-mono text-stone-500 uppercase">Mã giảng viên</span>
              <p className="text-sm font-bold text-stone-900 font-mono mt-0.5">{lecturerProfile.lecturerCode}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-stone-200">
              <span className="text-[10px] font-mono text-stone-500 uppercase">Khoa chuyên môn</span>
              <p className="text-xs font-semibold text-stone-900 mt-0.5">{lecturerProfile.department}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-stone-200">
              <span className="text-[10px] font-mono text-stone-500 uppercase">Học vị / Học hàm</span>
              <p className="text-xs font-semibold text-stone-900 mt-0.5">{lecturerProfile.degree || 'Tiến sĩ CNTT'}</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Forms Grid: Update Info & Change Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Update Contact Form */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2 font-mono uppercase">
            <User size={15} className="text-red-700" />
            <span>Thông Tin Liên Hệ</span>
          </h3>

          <form onSubmit={handleUpdateContact} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1 uppercase">Họ và tên</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-red-700 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1 uppercase">Email đào tạo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-red-700 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1 uppercase">Link ảnh đại diện (Tùy chọn)</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="/images/avatar-student.svg hoặc link ảnh ngoài..."
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-red-700 focus:bg-white transition font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs mt-2"
            >
              <Save size={14} />
              <span>{saving ? 'Đang lưu...' : 'Lưu thông tin'}</span>
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2 font-mono uppercase">
            <KeyRound size={15} className="text-stone-700" />
            <span>Thiết Lập Mật Khẩu</span>
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1 uppercase">Mật khẩu hiện tại</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-red-700 focus:bg-white transition font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1 uppercase">Mật khẩu mới (tối thiểu 6 ký tự)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-red-700 focus:bg-white transition font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1 uppercase">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-red-700 focus:bg-white transition font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !oldPassword || !newPassword}
              className="w-full py-2 bg-stone-900 hover:bg-black disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs mt-2"
            >
              <Shield size={14} />
              <span>{saving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Profile
