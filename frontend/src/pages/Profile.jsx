import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { User, Mail, Shield, KeyRound, Save, AlertCircle, CheckCircle, GraduationCap, Briefcase, Award } from 'lucide-react'

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
      // fallback
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
      setMessage({ type: 'success', text: 'Cập nhật thông tin liên hệ thành công!' })
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
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' })
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
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Hồ sơ cá nhân</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Quản lý thông tin tài khoản, hồ sơ học vụ / giảng dạy và bảo mật
        </p>
      </div>

      {/* Alert message */}
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

      {/* User Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
          <img
            src={avatarUrl || user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`}
            alt="Avatar"
            className="w-24 h-24 rounded-2xl border-2 border-slate-100 shadow-md bg-slate-50 object-cover"
          />
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white shadow-sm">
            {user?.role}
          </span>
        </div>

        <div className="text-center md:text-left flex-1">
          <h2 className="text-xl font-bold text-slate-800">{fullName || user?.fullName}</h2>
          <p className="text-sm text-slate-500 mt-0.5 font-mono">@{user?.username}</p>
          <div className="mt-2 flex flex-wrap gap-2 justify-center md:justify-start text-xs text-slate-600">
            <span className="px-2.5 py-1 bg-slate-100 rounded-md flex items-center gap-1.5">
              <Mail size={14} className="text-slate-400" />
              {email}
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md font-semibold">
              Trạng thái: Hoạt động
            </span>
          </div>
        </div>
      </div>

      {/* Role-specific Profile Details */}
      {user?.role === 'STUDENT' && studentProfile && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-red-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2 mb-4">
            <GraduationCap size={18} />
            <span>Thông tin Học vụ Sinh viên</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-3.5 rounded-xl border border-blue-100">
              <span className="text-xs text-slate-400">Mã sinh viên</span>
              <p className="text-base font-bold text-slate-800 font-mono mt-0.5">{studentProfile.studentCode}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-blue-100">
              <span className="text-xs text-slate-400">Ngành đào tạo</span>
              <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{studentProfile.major}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-blue-100">
              <span className="text-xs text-slate-400">Học kỳ hiện tại</span>
              <p className="text-base font-bold text-slate-800 mt-0.5">Học kỳ {studentProfile.currentSemester}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-blue-100">
              <span className="text-xs text-slate-400">Tín chỉ tích lũy</span>
              <p className="text-base font-bold text-red-600 mt-0.5">
                {studentProfile.creditsEarned} / {studentProfile.totalRequiredCredits}
              </p>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'LECTURER' && lecturerProfile && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Briefcase size={18} />
            <span>Hồ sơ Giảng viên</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-3.5 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-400">Mã giảng viên</span>
              <p className="text-base font-bold text-slate-800 font-mono mt-0.5">{lecturerProfile.lecturerCode}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-400">Khoa phụ trách</span>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{lecturerProfile.department}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-100">
              <span className="text-xs text-slate-400">Học vị / Học hàm</span>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{lecturerProfile.degree || 'Chưa cập nhật'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Forms Grid: Update Info & Change Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Update Contact Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <User size={18} className="text-red-600" />
            <span>Thông tin Liên hệ</span>
          </h3>

          <form onSubmit={handleUpdateContact} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và tên</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Link Ảnh đại diện (Avatar URL)</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Save size={16} />
              <span>{saving ? 'Đang lưu...' : 'Lưu thông tin'}</span>
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <KeyRound size={18} className="text-amber-600" />
            <span>Đổi mật khẩu</span>
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mật khẩu hiện tại</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mật khẩu mới (tối thiểu 6 ký tự)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !oldPassword || !newPassword}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Shield size={16} />
              <span>{saving ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
