import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { 
  LogOut, 
  User as UserIcon, 
  Shield, 
  Hash, 
  ChevronDown,
  Bell,
  GraduationCap,
  CreditCard,
  BookOpen,
  Check,
  CheckCheck,
  ExternalLink
} from 'lucide-react'

export const Header = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const dropdownRef = useRef(null)
  const notifRef = useRef(null)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Tải danh sách thông báo
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications')
      if (res.data?.data) {
        setNotifications(res.data.data)
      }
    } catch (err) {
      console.debug('Chưa tải được notifications:', err.message)
    }
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleMarkAsRead = async (notif) => {
    try {
      if (!notif.isRead) {
        await api.put(`/notifications/${notif.id}/read`)
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n))
      }
      if (notif.linkUrl) {
        setNotifOpen(false)
        navigate(notif.linkUrl)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (err) {
      console.error(err)
    }
  }

  const getNotifIcon = (type) => {
    switch (type) {
      case 'GRADE':
        return <GraduationCap size={15} className="text-emerald-600" />
      case 'TUITION':
        return <CreditCard size={15} className="text-amber-600" />
      case 'ENROLLMENT':
        return <BookOpen size={15} className="text-blue-600" />
      default:
        return <Bell size={15} className="text-purple-600" />
    }
  }

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
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Cổng Thông Tin Đào Tạo Rikkei EduPortal
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen(prev => !prev)}
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none"
            title="Thông báo học vụ"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 transition-all animate-in fade-in slide-in-from-top-2 duration-150 z-50">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">Thông báo học vụ</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                  >
                    <CheckCheck size={14} />
                    <span>Đọc tất cả</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 text-xs">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <p>Không có thông báo mới.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAsRead(n)}
                      className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition cursor-pointer ${
                        !n.isRead ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        {getNotifIcon(n.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`font-bold ${!n.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                          )}
                        </div>
                        <p className="text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                          {new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 pt-2 border-t border-slate-100 text-center">
                <Link
                  to="/announcements"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 py-1"
                >
                  <span>Xem bảng tin nhà trường</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition-all focus:outline-none"
            title="Thông tin tài khoản"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="w-9 h-9 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <UserIcon size={18} />
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-700 leading-tight">
                {user?.fullName || user?.username || 'Người dùng'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {user?.username || 'user'}
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180 text-blue-600' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 transition-all animate-in fade-in slide-in-from-top-2 duration-150 z-50">
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

                {/* Mã người dùng */}
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

              {/* Profile Link */}
              <div className="pt-2 px-2">
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-colors text-left"
                >
                  <UserIcon size={16} />
                  <span>Xem hồ sơ cá nhân</span>
                </Link>
              </div>

              {/* Logout Action */}
              <div className="px-2 pt-1 border-t border-slate-50">
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
      </div>
    </header>
  )
}
export default Header
