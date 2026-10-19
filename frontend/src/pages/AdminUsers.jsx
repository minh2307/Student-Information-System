import React, { useState } from 'react'
import { Plus, Search, UserCheck, Shield } from 'lucide-react'

export const AdminUsers = () => {
  const [users] = useState([
    { id: 1, username: 'admin', fullName: 'Quản trị viên Hệ thống', email: 'admin@rikkei.edu.vn', role: 'ADMIN', status: 'ACTIVE' },
    { id: 2, username: 'gv001', fullName: 'TS. Nguyễn Văn A', email: 'nguyenvana@rikkei.edu.vn', role: 'LECTURER', status: 'ACTIVE' },
    { id: 4, username: 'sv2024001', fullName: 'Nguyễn Văn C', email: 'nguyenvanc@rikkei.edu.vn', role: 'STUDENT', status: 'ACTIVE' },
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Tài khoản & Hồ sơ</h1>
          <p className="text-slate-500 text-sm mt-0.5">CRUD Sinh viên, Giảng viên và Quản trị viên</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm">
          <Plus size={16} /> Thêm tài khoản mới
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Tài khoản</th>
              <th className="px-4 py-4">Họ và tên</th>
              <th className="px-4 py-4">Email</th>
              <th className="px-4 py-4">Vai trò</th>
              <th className="px-4 py-4">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono font-semibold text-slate-800">{u.username}</td>
                <td className="px-4 py-4 font-medium text-slate-800">{u.fullName}</td>
                <td className="px-4 py-4 text-slate-500">{u.email}</td>
                <td className="px-4 py-4">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                    u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                    u.role === 'LECTURER' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                    {u.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
