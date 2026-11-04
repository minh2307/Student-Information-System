import React, { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getRealAvatar } from '../utils/avatarUtils'
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  CalendarDays,
  CreditCard,
  FileCheck2,
  BotMessageSquare,
  Users,
  FolderKanban,
  ShieldAlert,
  UserCircle,
  ExternalLink,
  ChevronRight,
  Bell,
  X,
  CalendarCheck
} from 'lucide-react'

export const Sidebar = ({ mobileOpen = false, onClose = () => {} }) => {
  const { user } = useAuthStore()
  const role = user?.role || 'STUDENT'

  // Khoá cuộn body trang web khi mở Drawer trên mobile (Safari iOS & Chrome Android)
  useEffect(() => {
    if (mobileOpen) {
      const originalOverflow = document.body.style.overflow
      const originalTouchAction = document.body.style.touchAction
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleKeyDown)

      return () => {
        document.body.style.overflow = originalOverflow
        document.body.style.touchAction = originalTouchAction
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [mobileOpen, onClose])

  const navItemClass = ({ isActive }) =>
    `group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all min-h-[42px] touch-manipulation ${
      isActive
        ? 'bg-red-50 text-red-800 font-semibold border-l-3 border-red-700 shadow-2xs'
        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70 active:bg-stone-200/60'
    }`

  return (
    <>
      {/* Mobile Backdrop with Smooth Fade & Touch Dismiss */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200 touch-manipulation"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: Static on Desktop, Off-Canvas Drawer with 100dvh & Safe-Area on Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-64 bg-white border-r border-stone-200/90 flex flex-col shrink-0 h-screen h-[100dvh] max-h-[100dvh] transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:h-auto md:min-h-screen drawer-hardware-accelerated ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        aria-label="Thanh điều hướng chính"
      >
        {/* 1. Official University Brand Header (with iOS Notch Safe Area) */}
        <div className="px-4 py-3.5 pt-[max(0.875rem,env(safe-area-inset-top,0.875rem))] border-b border-stone-200/80 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <img 
              src="/images/logo.png" 
              alt="Rikkei Logo" 
              className="h-9 w-auto object-contain max-w-[125px]"
              onError={(e) => {
                e.target.src = '/images/logo.svg'
              }}
            />
            <div className="flex flex-col border-l border-stone-200 pl-2.5">
              <span className="font-serif font-bold text-stone-900 text-xs tracking-tight uppercase leading-snug">
                EDUPORTAL
              </span>
              <span className="text-[9px] text-stone-500 tracking-wider font-mono uppercase">
                Học viện Đào tạo
              </span>
            </div>
          </div>

          {/* Close button for mobile with 44x44px touch target */}
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 active:bg-stone-200 md:hidden transition-colors"
            aria-label="Đóng Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* 2. Navigation List with Momentum Scrolling */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto overscroll-contain touch-pan-y touch-scroll">
          {/* Student Navigation */}
          {role === 'STUDENT' && (
            <>
              <div>
                <div className="px-3 pb-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest font-mono">
                  Quản lý Đào tạo
                </div>
                <div className="space-y-0.5">
                  <NavLink to="/student/dashboard" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Dashboard học kỳ</span>
                    </div>
                  </NavLink>

                  <NavLink to="/student/timetable" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <CalendarDays size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Thời khóa biểu tuần</span>
                    </div>
                  </NavLink>

                  <NavLink to="/student/registration" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <BookOpen size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Đăng ký học phần</span>
                    </div>
                  </NavLink>

                  <NavLink to="/student/grades" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <GraduationCap size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Tra cứu bảng điểm</span>
                    </div>
                  </NavLink>
                </div>
              </div>

              <div>
                <div className="px-3 pb-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest font-mono">
                  Tài chính & Khảo thí
                </div>
                <div className="space-y-0.5">
                  <NavLink to="/student/tuition" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <CreditCard size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Học phí & VietQR</span>
                    </div>
                  </NavLink>

                  <NavLink to="/student/exams" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <CalendarCheck size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Lịch thi học kỳ</span>
                    </div>
                  </NavLink>
                </div>
              </div>

              <div>
                <div className="px-3 pb-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest font-mono">
                  Thông tin chung
                </div>
                <div className="space-y-0.5">
                  <NavLink to="/announcements" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <Bell size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Bảng tin đào tạo</span>
                    </div>
                  </NavLink>
                </div>
              </div>
            </>
          )}

          {/* Lecturer Navigation */}
          {role === 'LECTURER' && (
            <>
              <div>
                <div className="px-3 pb-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest font-mono">
                  Giảng dạy & Học vụ
                </div>
                <div className="space-y-0.5">
                  <NavLink to="/lecturer/classes" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <FolderKanban size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Lớp giảng dạy</span>
                    </div>
                  </NavLink>

                  <NavLink to="/lecturer/timetable" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <CalendarDays size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Lịch giảng dạy tuần</span>
                    </div>
                  </NavLink>

                  <NavLink to="/announcements" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <Bell size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Bảng tin đào tạo</span>
                    </div>
                  </NavLink>
                </div>
              </div>
            </>
          )}

          {/* Admin Navigation */}
          {role === 'ADMIN' && (
            <>
              <div>
                <div className="px-3 pb-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest font-mono">
                  Quản trị Đào tạo
                </div>
                <div className="space-y-0.5">
                  <NavLink to="/admin/courses" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <BookOpen size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Danh mục môn học</span>
                    </div>
                  </NavLink>

                  <NavLink to="/admin/sections" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <CalendarDays size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Quản lý lớp học phần</span>
                    </div>
                  </NavLink>
                </div>
              </div>

              <div>
                <div className="px-3 pb-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest font-mono">
                  Hệ thống & Người dùng
                </div>
                <div className="space-y-0.5">
                  <NavLink to="/admin/users" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <Users size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Quản lý tài khoản</span>
                    </div>
                  </NavLink>

                  <NavLink to="/announcements" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <Bell size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Bảng tin thông báo</span>
                    </div>
                  </NavLink>
                </div>
              </div>
            </>
          )}

          {/* Common Account Section */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest font-mono">
              Hệ thống & Tiện ích
            </div>
            <div className="space-y-0.5">
              <NavLink to="/ai/advisor" onClick={onClose} className={navItemClass}>
                <div className="flex items-center gap-2.5">
                  <BotMessageSquare size={16} className="text-stone-500 group-hover:text-red-700" />
                  <span>Cố vấn AI 24/7</span>
                </div>
              </NavLink>
              <NavLink to="/profile" onClick={onClose} className={navItemClass}>
                <div className="flex items-center gap-2.5">
                  <UserCircle size={16} className="text-stone-500 group-hover:text-red-700" />
                  <span>Hồ sơ cá nhân</span>
                </div>
              </NavLink>
            </div>
          </div>
        </nav>

        {/* 3. Footer Compact Status Card (with iOS Home Indicator Safe Area) */}
        <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] border-t border-stone-200/80 bg-stone-50/80 shrink-0">
          <div className="bg-white border border-stone-200/90 rounded-xl p-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <img 
                src={getRealAvatar(user)} 
                alt={user?.fullName || 'Avatar'} 
                className="w-8 h-8 rounded-full object-cover border border-stone-300 shadow-2xs shrink-0"
                onError={(e) => {
                  e.target.src = '/images/avatar-student.jpg'
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-stone-900 truncate">
                  {user?.fullName || 'Tài khoản'}
                </p>
                <p className="text-[10px] font-mono text-stone-600 truncate">
                  {user?.username || 'SV2024001'}
                </p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-600">
              <span className="flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Trực tuyến
              </span>
              <span className="font-mono text-stone-600 font-semibold">2024-SEM2</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
