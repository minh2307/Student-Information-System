import React, { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { LogOut, User as UserIcon, Shield, Hash, ChevronDown } from 'lucide-react'

export const Header = () => {
  const { user, logout } = useAuthStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
            <Shield size={12} /> Admin
          </span>
        )
      case 'LECTURER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <Shield size={12} /> Giảng viên
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
            <Shield size={12} /> Sinh viên
          </span>
        )
    }
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between relative z-30">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Cổng Thông Tin Đào Tạo Rikkei EduPortal
        </h2>
      </div>

      {/* User Avatar & Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-blue-500/30 transition-all focus:outline-none"
          title="Thông tin tài khoản"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Avatar"
              className="w-10 h-10 rounded-full border border-slate-200 object-cover shadow-2xs"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <UserIcon size={20} />
            </div>
          )}
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform duration-200 ${
              dropdownOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 transition-all animate-in fade-in slide-in-from-top-2 duration-150">
            {/* User Info Header */}
            <div className="px-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Avatar"
                    className="w-11 h-11 rounded-full border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <UserIcon size={22} />
                  </div>
                )}
                <div className="overflow-hidden">
                  <h4 className="text-sm font-bold text-slate-800 truncate">
                    {user?.fullName || user?.username || 'Người dùng'}
                  </h4>
                  <div className="mt-1 flex items-center gap-1.5">
                    {getRoleBadge(user?.role)}
                  </div>
                </div>
              </div>

              {/* Mã người dùng / Mã SV */}
              <div className="mt-3 bg-slate-50 rounded-xl p-2.5 flex items-center justify-between text-xs border border-slate-100">
                <span className="text-slate-500 flex items-center gap-1 font-medium">
                  <Hash size={13} className="text-slate-400" />
                  Mã tài khoản:
                </span>
                <span className="font-bold text-slate-800 font-mono">
                  {user?.username || 'sv2024001'}
                </span>
              </div>
            </div>

            {/* Logout Action */}
            <div className="pt-2 px-2">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false)
                  logout()
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
              >
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
