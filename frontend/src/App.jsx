import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Rikkei EduPortal (MVP)
        </h1>
        <p className="text-slate-500 mb-6">
          Hệ thống Quản lý Đào tạo và Đăng ký Học phần (Kiến trúc Microservices)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h2 className="font-semibold text-blue-700">Cổng Sinh viên</h2>
            <p className="text-xs text-blue-600 mt-1">Dashboard, Đăng ký học phần, Bảng điểm</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <h2 className="font-semibold text-emerald-700">Cổng Giảng viên</h2>
            <p className="text-xs text-emerald-600 mt-1">Lớp dạy, Điểm danh, Nhập điểm</p>
          </div>
          <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
            <h2 className="font-semibold text-purple-700">Trang Quản trị</h2>
            <p className="text-xs text-purple-600 mt-1">Hồ sơ, Môn học, Mở lớp, AI Syllabus</p>
          </div>
        </div>

        <div className="mt-8 text-xs text-slate-400">
          Khung dự án sẵn sàng cho Sprint 7 ngày (Microservices + ReactJS)
        </div>
      </div>
    </div>
  )
}

export default App
