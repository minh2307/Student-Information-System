import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  CalendarDays,
  Users, 
  FolderKanban, 
  BotMessageSquare, 
  Sparkles,
  UserCircle,
  CreditCard,
  FileCheck2,
  Bell
} from 'lucide-react'

export const Sidebar = () => {
  const { user } = useAuthStore()
  const role = user?.role || 'STUDENT'

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
      isActive
        ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
        : 'text-slate-600 hover:bg-red-50 hover:text-red-700'
    }`

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-700 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-red-500/25">
          RE
        </div>
        <div>
          <h1 className="font-extrabold text-slate-900 leading-tight tracking-tight text-base">
            Rikkei <span className="text-red-600">EduPortal</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Học viện Đại học</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Student Links */}
        {role === 'STUDENT' && (
          <>
            <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cổng Sinh viên
            </div>
            <NavLink to="/student/dashboard" className={navItemClass}>
              <LayoutDashboard size={17} />
              <span>Dashboard học kỳ</span>
            </NavLink>
            <NavLink to="/student/timetable" className={navItemClass}>
              <CalendarDays size={17} />
              <span>Thời khóa biểu tuần</span>
            </NavLink>
            <NavLink to="/student/registration" className={navItemClass}>
              <BookOpen size={17} />
              <span>Đăng ký học phần</span>
            </NavLink>
            <NavLink to="/student/grades" className={navItemClass}>
              <GraduationCap size={17} />
              <span>Tra cứu điểm thi</span>
            </NavLink>
            <NavLink to="/student/tuition" className={navItemClass}>
              <CreditCard size={17} />
              <span>Học phí & Công nợ</span>
            </NavLink>
            <NavLink to="/student/exams" className={navItemClass}>
              <FileCheck2 size={17} />
              <span>Lịch thi & Phòng thi</span>
            </NavLink>
            <NavLink to="/ai/advisor" className={navItemClass}>
              <BotMessageSquare size={17} className="text-red-600" />
              <span className="font-bold text-red-900">Cố vấn học tập AI</span>
            </NavLink>
          </>
        )}

        {/* Lecturer Links */}
        {role === 'LECTURER' && (
          <>
            <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cổng Giảng viên
            </div>
            <NavLink to="/lecturer/classes" className={navItemClass}>
              <Calendar size={17} />
              <span>Lớp học phần dạy</span>
            </NavLink>
            <NavLink to="/lecturer/timetable" className={navItemClass}>
              <CalendarDays size={17} />
              <span>Thời khóa biểu dạy</span>
            </NavLink>
          </>
        )}

        {/* Admin Links */}
        {role === 'ADMIN' && (
          <>
            <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quản trị Hệ thống
            </div>
            <NavLink to="/admin/users" className={navItemClass}>
              <Users size={17} />
              <span>Quản lý Tài khoản</span>
            </NavLink>
            <NavLink to="/admin/courses" className={navItemClass}>
              <BookOpen size={17} />
              <span>Danh mục Môn học</span>
            </NavLink>
            <NavLink to="/admin/sections" className={navItemClass}>
              <FolderKanban size={17} />
              <span>Mở lớp & Duyệt tín</span>
            </NavLink>
          </>
        )}

        {/* Common Section for All Roles */}
        <div className="pt-3 border-t border-slate-100">
          <div className="px-4 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tiện ích chung
          </div>
          <NavLink to="/announcements" className={navItemClass}>
            <Bell size={17} />
            <span>Bảng tin Thông báo</span>
          </NavLink>
          <NavLink to="/profile" className={navItemClass}>
            <UserCircle size={17} />
            <span>Hồ sơ cá nhân</span>
          </NavLink>
        </div>
      </nav>

      {/* Footer Badge */}
      <div className="p-4 border-t border-slate-100 bg-red-50/30">
        <div className="bg-white p-3 rounded-xl border border-red-100 text-xs text-slate-500 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>Rikkei Portal</span>
          </div>
          <span className="font-extrabold text-red-600">v1.2.0</span>
        </div>
      </div>
    </aside>
  )
}
export default Sidebar
