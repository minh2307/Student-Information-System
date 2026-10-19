import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  Users, 
  FolderKanban, 
  BotMessageSquare, 
  Sparkles 
} from 'lucide-react'

export const Sidebar = () => {
  const { user } = useAuthStore()
  const role = user?.role || 'STUDENT'

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20">
          RE
        </div>
        <div>
          <h1 className="font-bold text-slate-800 leading-tight">EduPortal</h1>
          <p className="text-xs text-slate-400 font-medium">Student Info System</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {/* Student Links */}
        {role === 'STUDENT' && (
          <>
            <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cổng Sinh viên
            </div>
            <NavLink to="/student/dashboard" className={navItemClass}>
              <LayoutDashboard size={18} />
              <span>Dashboard học kỳ</span>
            </NavLink>
            <NavLink to="/student/registration" className={navItemClass}>
              <BookOpen size={18} />
              <span>Đăng ký học phần</span>
            </NavLink>
            <NavLink to="/student/grades" className={navItemClass}>
              <GraduationCap size={18} />
              <span>Tra cứu điểm thi</span>
            </NavLink>
          </>
        )}

        {/* Lecturer Links */}
        {role === 'LECTURER' && (
          <>
            <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cổng Giảng viên
            </div>
            <NavLink to="/lecturer/classes" className={navItemClass}>
              <Calendar size={18} />
              <span>Lớp học phần dạy</span>
            </NavLink>
            <NavLink to="/lecturer/grades" className={navItemClass}>
              <GraduationCap size={18} />
              <span>Nhập & Khóa điểm</span>
            </NavLink>
          </>
        )}

        {/* Admin Links */}
        {role === 'ADMIN' && (
          <>
            <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Quản trị Hệ thống
            </div>
            <NavLink to="/admin/users" className={navItemClass}>
              <Users size={18} />
              <span>Quản lý Tài khoản</span>
            </NavLink>
            <NavLink to="/admin/courses" className={navItemClass}>
              <BookOpen size={18} />
              <span>Danh mục Môn học</span>
            </NavLink>
            <NavLink to="/admin/sections" className={navItemClass}>
              <FolderKanban size={18} />
              <span>Mở lớp & Duyệt tín</span>
            </NavLink>
          </>
        )}

        {/* AI Assistant for all */}
        <div className="pt-4 mt-4 border-t border-slate-100">
          <div className="px-4 py-2 text-xs font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} />
            <span>AI Assistant</span>
          </div>
          <NavLink to="/ai/advisor" className={navItemClass}>
            <BotMessageSquare size={18} className="text-indigo-600" />
            <span className="font-semibold text-indigo-900">Cố vấn học tập AI</span>
          </NavLink>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Sprint 7 ngày (MVP)</span>
          <span className="font-bold text-blue-600">v0.0.1</span>
        </div>
      </div>
    </aside>
  )
}
