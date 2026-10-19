import React, { useState } from 'react'
import { Calendar, Users, CheckCircle, Clock } from 'lucide-react'

export const LecturerClasses = () => {
  const [classes] = useState([
    {
      id: 1,
      sectionCode: 'CS201-2025-01',
      courseName: 'Data Structures and Algorithms',
      roomName: 'Room A-204',
      dayOfWeek: 'MON',
      time: '09:00 - 10:30',
      enrolled: 2,
      max: 40,
    },
    {
      id: 3,
      sectionCode: 'CS401-2025-01',
      courseName: 'Web Application Development',
      roomName: 'Lab 3',
      dayOfWeek: 'WED',
      time: '13:30 - 15:00',
      enrolled: 1,
      max: 35,
    },
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Lịch Dạy & Điểm Danh</h1>
        <p className="text-slate-500 text-sm mt-0.5">Danh sách các lớp học phần được phân công trong kỳ</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-blue-50 text-blue-700">
                  {cls.sectionCode}
                </span>
                <h3 className="font-bold text-slate-800 text-base mt-2">{cls.courseName}</h3>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium">
                {cls.roomName}
              </span>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <p className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                Thứ: <strong>{cls.dayOfWeek}</strong> ({cls.time})
              </p>
              <p className="flex items-center gap-2">
                <Users size={14} className="text-slate-400" />
                Sĩ số hiện tại: <strong>{cls.enrolled}/{cls.max}</strong>
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button className="flex-1 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                Danh sách Sinh viên & Điểm danh
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
