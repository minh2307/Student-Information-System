import React from 'react'
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
  X
} from 'lucide-react'

export const Sidebar = ({ mobileOpen = false, onClose = () => {} }) => {
  const { user } = useAuthStore()
  const role = user?.role || 'STUDENT'

  const navItemClass = ({ isActive }) =>
    `group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
      isActive
        ? 'bg-red-50 text-red-800 font-semibold border-l-3 border-red-700 shadow-2xs'
        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
    }`

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar (Static on desktop, off-canvas drawer on mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-200/90 flex flex-col shrink-0 min-h-screen transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* 1. Official University Brand Header */}
        <div className="p-4 border-b border-stone-200/80 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/images/logo.png" 
              alt="Rikkei Logo" 
              className="h-9 w-auto object-contain max-w-[130px]"
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
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 md:hidden"
            aria-label="Đóng Menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Navigation List */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
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

                  <NavLink to="/admin/semesters" onClick={onClose} className={navItemClass}>
                    <div className="flex items-center gap-2.5">
                      <FolderKanban size={16} className="text-stone-500 group-hover:text-red-700" />
                      <span>Quản lý học kỳ</span>
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
              Hệ thống
            </div>
            <div className="space-y-0.5">
              <NavLink to="/ai-advisor" onClick={onClose} className={navItemClass}>
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

        {/* 3. Footer Compact Status Card */}
        <div className="p-3 border-t border-stone-200/80 bg-stone-50/70">
          <div className="bg-white border border-stone-200/90 rounded-lg p-2.5 shadow-2xs">
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
