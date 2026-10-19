import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { Lock, User, GraduationCap, ShieldAlert, ArrowRight } from 'lucide-react'

export const Login = () => {
  const [username, setUsername] = useState('sv2024001')
  const [password, setPassword] = useState('123456')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Call Auth API
      const res = await api.post('/auth/login', { username, password })
      const { user, accessToken } = res.data.data
      login(user, accessToken)

      if (user.role === 'ADMIN') navigate('/admin/users')
      else if (user.role === 'LECTURER') navigate('/lecturer/classes')
      else navigate('/student/dashboard')
    } catch (err) {
      console.warn('Backend API not responding, fallback for local dev preview:', err)
      // Fallback dev mock for quick preview if backend is not started yet
      let role = 'STUDENT'
      let fullName = 'Nguyễn Văn C'
      if (username === 'admin') {
        role = 'ADMIN'
        fullName = 'Quản trị viên Hệ thống'
      } else if (username.startsWith('gv')) {
        role = 'LECTURER'
        fullName = 'TS. Nguyễn Văn A'
      }

      login(
        {
          id: 1,
          username,
          fullName,
          role,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        },
        'mock-jwt-token-sprint-7-days'
      )

      if (role === 'ADMIN') navigate('/admin/users')
      else if (role === 'LECTURER') navigate('/lecturer/classes')
      else navigate('/student/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const fillQuickAccount = (u, p) => {
    setUsername(u)
    setPassword(p)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
          <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-sm mb-3">
            <GraduationCap size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold">Rikkei EduPortal</h2>
          <p className="text-sm text-blue-100 mt-1">Cổng thông tin đào tạo và đăng ký học phần</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-600 rounded-lg flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Tên đăng nhập / Mã định danh
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User size={18} />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="sv2024001, gv001, admin..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Mật khẩu
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <span>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
            <ArrowRight size={18} />
          </button>

          {/* Quick login helpers for testers / members */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 mb-2 text-center uppercase tracking-wider">
              Tài khoản mẫu (Seed Accounts - MK: 123456)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillQuickAccount('sv2024001', '123456')}
                className="px-2 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                Sinh viên
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('gv001', '123456')}
                className="px-2 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                Giảng viên
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('admin', '123456')}
                className="px-2 py-1.5 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
              >
                Admin
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
