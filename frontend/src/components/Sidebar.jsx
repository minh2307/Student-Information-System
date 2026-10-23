import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
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
  ChevronRight
} from 'lucide-react'

export const Sidebar = () => {
  const { user } = useAuthStore()
  const role = user?.role || 'STUDENT'

  const navItemClass = ({ isActive }) =>
    `group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
      isActive
        ? 'bg-red-50 text-red-800 font-semibold border-l-3 border-red-700 shadow-2xs'
        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
    }`

  return (
    <aside className="w-64 bg-white border-r border-stone-200/90 flex flex-col shrink-0 min-h-screen">
      {/* 1. Official University Brand Header */}
      <div className="p-4 border-b border-stone-200/80 bg-white">
        <div className="flex items-center gap-3">
          <img 
            src="/images/logo.svg" 
            alt="Rikkei EduPortal Logo" 
            className="h-10 w-auto object-contain"
            onError={(e) => {
              // Fallback if svg missing
              e.target.style.display = 'none'
            }}
          />
          <div className="flex flex-col">
            <span className="font-serif font-bold text-stone-900 text-[15px] tracking-tight leading-snug">
              RIKKEI <span className="text-red-700">EDUPORTAL</span>
            </span>
            <span className="text-[10px] text-stone-600 tracking-wider font-mono font-medium uppercase">
              Học viện Đào tạo
            </span>
          </div>
        </div>
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
                <NavLink to="/student/dashboard" className={navItemClass}>
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard size={16} className="text-stone-500 group-hover:text-red-700" />
                    <span>Dashboard học kỳ</span>
                  </div>
                </NavLink>

                <NavLink to="/student/timetable" className={navItemClass}>
                  <div className="flex items-center gap-2.5">
                    <CalendarDays size={16} className="text-stone-500 group-hover:text-red-700" />
                    <span>Thời khóa biểu tuần</span>
                  </div>
                </NavLink>

                <NavLink to="/student/registration" className={navItemClass}>
                  <div className="flex items-center gap-2.5">
                    <BookOpen size={16} className="text-stone-500 group-hover:text-red-700" />
                    <span>Đăng ký học phần</span>
                  </div>
                </NavLink>

                <NavLink to="/student/grades" className={navItemClass}>
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
                <NavLink to="/student/tuition" className={navItemClass}>
                  <div className="flex items-center gap-2.5">
                    <CreditCard size={16} className="text-stone-500 group-hover:text-red-700" />
                    <span>Học phí & Thanh toán</span>
                  </div>
                </NavLink>

                <NavLink to="/student/exams" className={navItemClass}>
                  <div className="flex items-center gap-2.5">
                    <FileCheck2 size={16} className="text-stone-500 group-hover:text-red-700" />
                    <span>Lịch thi & SBD</span>
                  </div>
                </NavLink>
              </div>
            </div>

            <div>
              <div className="px-3 pb-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest font-mono">
                Trợ lý Thông minh
              </div>
              <div className="space-y-0.5">
                <NavLink to="/ai/advisor" className={navItemClass}>
                  <div className="flex items-center gap-2.5">
                    <BotMessageSquare size={16} className="text-red-700" />
                    <span className="font-semibold text-red-900">Cố vấn học tập AI</span>
                  </div>
                  <span className="text-[10px] font-mono bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold">
                    PRO
                  </span>
                </NavLink>
              </div>
            </div>
          </>
        )}

        {/* Lecturer Navigation */}
        {role === 'LECTURER' && (
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest font-mono">
              Nghiệp vụ Giảng viên
            </div>
            <div className="space-y-0.5">
              <NavLink to="/lecturer/classes" className={navItemClass}>
                <div className="flex items-center gap-2.5">
                  <BookOpen size={16} className="text-stone-500 group-hover:text-red-700" />
                  <span>Lớp học phần & Điểm</span>
                </div>
              </NavLink>
              <NavLink to="/lecturer/timetable" className={navItemClass}>
                <div className="flex items-center gap-2.5">
                  <CalendarDays size={16} className="text-stone-500 group-hover:text-red-700" />
                  <span>Thời khóa biểu dạy</span>
                </div>
              </NavLink>
            </div>
          </div>
        )}

        {/* Admin Navigation */}
        {role === 'ADMIN' && (
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest font-mono">
              Quản trị Hệ thống
            </div>
            <div className="space-y-0.5">
              <NavLink to="/admin/users" className={navItemClass}>
                <div className="flex items-center gap-2.5">
                  <Users size={16} className="text-stone-500 group-hover:text-red-700" />
                  <span>Hồ sơ Người dùng</span>
                </div>
              </NavLink>
              <NavLink to="/admin/courses" className={navItemClass}>
                <div className="flex items-center gap-2.5">
                  <BookOpen size={16} className="text-stone-500 group-hover:text-red-700" />
                  <span>Chương trình đào tạo</span>
                </div>
              </NavLink>
              <NavLink to="/admin/sections" className={navItemClass}>
                <div className="flex items-center gap-2.5">
                  <FolderKanban size={16} className="text-stone-500 group-hover:text-red-700" />
                  <span>Mở lớp học phần</span>
                </div>
              </NavLink>
            </div>
          </div>
        )}

        {/* Common links */}
        <div>
          <div className="px-3 pb-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest font-mono">
            Kênh Học Viện
          </div>
          <div className="space-y-0.5">
            <NavLink to="/announcements" className={navItemClass}>
              <div className="flex items-center gap-2.5">
                <FileCheck2 size={16} className="text-stone-500 group-hover:text-red-700" />
                <span>Bảng tin thông báo</span>
              </div>
            </NavLink>
            <NavLink to="/profile" className={navItemClass}>
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
            <div className="w-8 h-8 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-xs shrink-0 font-serif">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
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
  )
}
