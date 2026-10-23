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
  ExternalLink,
  Calendar,
  Building
} from 'lucide-react'

export const Header = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const dropdownRef = useRef(null)
  const notifRef = useRef(null)

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
        return <GraduationCap size={15} className="text-red-700" />
      case 'TUITION':
        return <CreditCard size={15} className="text-amber-700" />
      case 'ENROLLMENT':
        return <BookOpen size={15} className="text-red-800" />
      default:
        return <Bell size={15} className="text-stone-700" />
    }
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 text-stone-800 border border-stone-300">
            <Shield size={11} className="text-red-700" /> Quản trị viên
          </span>
        )
      case 'LECTURER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 text-stone-800 border border-stone-300">
            <Shield size={11} className="text-stone-700" /> Giảng viên
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200">
            <Shield size={11} className="text-red-700" /> Sinh viên
          </span>
        )
    }
  }

  // Today formatted in formal Vietnamese format
  const currentDateStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  })

  return (
    <header className="h-16 bg-white border-b border-stone-200/90 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Academic dispatch date & semester context */}
      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-2.5 text-xs text-stone-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="capitalize">{currentDateStr}</span>
          <span className="text-stone-300">|</span>
          <span className="font-mono text-stone-700 font-semibold bg-stone-100 px-2 py-0.5 rounded border border-stone-200/80">
            Học kỳ II (2024-2025)
          </span>
        </div>
        <div className="lg:hidden flex items-center gap-2">
          <span className="font-serif font-bold text-stone-900 text-sm">
            Rikkei <span className="text-red-700">EduPortal</span>
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Quick Portal Switch / Announcement Link */}
        <Link
          to="/announcements"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition border border-transparent hover:border-stone-200"
        >
          <Building size={14} className="text-stone-500" />
          <span>Bản tin Học viện</span>
        </Link>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen(prev => !prev)}
            className="relative p-2 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors focus:outline-none border border-transparent hover:border-stone-200"
            title="Thông báo học vụ"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-700 text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-stone-200/90 py-2.5 transition-all animate-in fade-in slide-in-from-top-2 duration-150 z-50">
              <div className="px-4 pb-2 border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-stone-900 uppercase font-mono tracking-wider">
                    Thông báo học vụ
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-800">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] text-red-700 hover:text-red-900 font-semibold flex items-center gap-1"
                  >
                    <CheckCheck size={13} />
                    <span>Đánh dấu đã đọc</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 text-xs">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-stone-600">
                    <p>Không có thông báo mới.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAsRead(n)}
                      className={`p-3.5 flex items-start gap-3 hover:bg-stone-50 transition cursor-pointer ${
                        !n.isRead ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <div className="w-7 h-7 rounded bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 mt-0.5">
                        {getNotifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-semibold truncate ${!n.isRead ? 'text-stone-900' : 'text-stone-700'}`}>
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
                          )}
                        </div>
                        <p className="text-stone-600 mt-1 line-clamp-2 leading-relaxed text-[11px]">
                          {n.message}
                        </p>
                        <p className="text-[10px] font-mono text-stone-600 mt-1.5">
                          {new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 pt-2 border-t border-stone-100 text-center">
                <Link
                  to="/announcements"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-semibold text-red-700 hover:text-red-900 flex items-center justify-center gap-1 py-1"
                >
                  <span>Xem tất cả công văn & thông báo</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Identity Pill & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 pl-2 pr-2.5 rounded-lg border border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 transition-all focus:outline-none"
            title="Tài khoản học vụ"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="w-7 h-7 rounded object-cover border border-stone-200"
              />
            ) : (
              <div className="w-7 h-7 rounded bg-red-700 text-white flex items-center justify-center font-bold text-xs font-serif">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-stone-800 leading-none">
                {user?.fullName || user?.username || 'Người dùng'}
              </span>
              <span className="text-[10px] font-mono text-stone-600">
                {user?.username || 'user'}
              </span>
            </div>
            <ChevronDown
              size={13}
              className={`text-stone-600 transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180 text-stone-900' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-stone-200/90 py-2.5 transition-all animate-in fade-in slide-in-from-top-2 duration-150 z-50">
              <div className="px-4 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-red-700 text-white flex items-center justify-center font-bold text-sm font-serif shrink-0">
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-stone-900 truncate">
                      {user?.fullName || user?.username || 'Người dùng'}
                    </h4>
                    <div className="mt-1">
                      {getRoleBadge(user?.role)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 bg-stone-50 rounded-lg p-2 flex items-center justify-between text-xs border border-stone-200/80">
                  <span className="text-stone-500 font-mono text-[11px]">Mã định danh:</span>
                  <span className="font-bold text-stone-900 font-mono">
                    {user?.username || 'sv2024001'}
                  </span>
                </div>
              </div>

              <div className="pt-2 px-2">
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 rounded-lg transition-colors text-left"
                >
                  <UserIcon size={14} className="text-stone-500" />
                  <span>Hồ sơ lý lịch học vụ</span>
                </Link>
              </div>

              <div className="px-2 pt-1 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false)
                    logout()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors text-left"
                >
                  <LogOut size={14} />
                  <span>Đăng xuất phiên làm việc</span>
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
