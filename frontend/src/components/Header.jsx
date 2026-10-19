import React from 'react'
import { useAuthStore } from '../store/authStore'
import { LogOut, User as UserIcon } from 'lucide-react'

export const Header = () => {
  const { user, logout } = useAuthStore()

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">Admin</span>
      case 'LECTURER':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">Giảng viên</span>
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">Sinh viên</span>
    }
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Cổng Thông Tin Đào Tạo Rikkei EduPortal
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full border border-slate-200" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <UserIcon size={18} />
            </div>
          )}
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-800 leading-none">
              {user?.fullName || user?.username || 'Người dùng'}
            </div>
            <div className="mt-1 flex items-center justify-end gap-1.5">
              {getRoleBadge(user?.role)}
              <span className="text-xs text-slate-400">({user?.username || 'user'})</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Đăng xuất"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-2"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
