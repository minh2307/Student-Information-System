import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { Search, CheckCircle, AlertCircle, Plus, Trash2, Calendar, Clock, MapPin, Users } from 'lucide-react'

export const CourseRegistration = () => {
  const [semester] = useState('2024-25_SEM2')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const [availableSections, setAvailableSections] = useState([
    {
      id: 1,
      sectionCode: 'CS201-2025-01',
      courseCode: 'CS201',
      courseName: 'Data Structures and Algorithms',
      credits: 3,
      dayOfWeek: 'MON',
      startTime: '09:00:00',
      endTime: '10:30:00',
      roomName: 'Room A-204',
      maxCapacity: 40,
      currentEnrolled: 2,
      lecturerName: 'TS. Nguyễn Văn A',
      status: 'OPEN',
      isEnrolled: true,
      enrollmentId: 1,
    },
    {
      id: 2,
      sectionCode: 'CS301-2025-01',
      courseCode: 'CS301',
      courseName: 'Database Management Systems',
      credits: 3,
      dayOfWeek: 'TUE',
      startTime: '07:30:00',
      endTime: '09:00:00',
      roomName: 'Room B-101',
      maxCapacity: 40,
      currentEnrolled: 1,
      lecturerName: 'ThS. Trần Thị B',
      status: 'OPEN',
      isEnrolled: true,
      enrollmentId: 2,
    },
    {
      id: 4,
      sectionCode: 'CS402-2025-01',
      courseCode: 'CS402',
      courseName: 'Software Engineering & Agile',
      credits: 3,
      dayOfWeek: 'THU',
      startTime: '09:00:00',
      endTime: '10:30:00',
      roomName: 'Room A-301',
      maxCapacity: 40,
      currentEnrolled: 0,
      lecturerName: 'ThS. Trần Thị B',
      status: 'OPEN',
      isEnrolled: false,
    },
    {
      id: 5,
      sectionCode: 'AI101-2025-01',
      courseCode: 'AI101',
      courseName: 'Artificial Intelligence Basics',
      credits: 3,
      dayOfWeek: 'FRI',
      startTime: '15:15:00',
      endTime: '16:45:00',
      roomName: 'Lab 1',
      maxCapacity: 30,
      currentEnrolled: 0,
      lecturerName: 'TS. Nguyễn Văn A',
      status: 'OPEN',
      isEnrolled: false,
    },
  ])

  useEffect(() => {
    fetchSections()
  }, [keyword])

  const fetchSections = async () => {
    try {
      const res = await api.get(`/student/class-sections?semester=${semester}&keyword=${keyword}`)
      if (res.data?.data) {
        setAvailableSections(res.data.data)
      }
    } catch (err) {
      // Fallback dev mock
    }
  }

  const handleEnroll = async (sectionId) => {
    setMessage({ type: '', text: '' })
    setLoading(true)
    try {
      await api.post('/student/enrollments', { classSectionId: sectionId })
      setMessage({ type: 'success', text: 'Đăng ký học phần thành công!' })
      fetchSections()
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Không thể đăng ký học phần (Kiểm tra sĩ số hoặc trùng lịch)'
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEnrollment = async (enrollmentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đăng ký môn này?')) return
    try {
      await api.delete(`/student/enrollments/${enrollmentId}`)
      setMessage({ type: 'success', text: 'Đã hủy đăng ký môn học!' })
      fetchSections()
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi khi hủy đăng ký' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Đăng ký Học phần</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Học kỳ hiện tại: <span className="font-semibold text-blue-600">{semester}</span> (Tối đa 24 tín chỉ)
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mã môn, tên môn..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Sections Table / Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
            Danh sách Lớp Học phần Mở trong kỳ
          </h2>
          <span className="text-xs text-slate-400">
            {availableSections.length} lớp học phần khả dụng
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {availableSections.map((sec) => (
            <div key={sec.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {sec.courseCode}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Lớp: {sec.sectionCode}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                    {sec.credits} Tín chỉ
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-800">{sec.courseName}</h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" />
                    Thứ: <strong className="text-slate-700">{sec.dayOfWeek}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    {sec.startTime} - {sec.endTime}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-slate-400" />
                    Phòng: <strong className="text-slate-700">{sec.roomName}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={14} className="text-slate-400" />
                    Sĩ số: <strong className="text-slate-700">{sec.currentEnrolled}/{sec.maxCapacity}</strong>
                  </span>
                  <span>GV: <strong className="text-slate-700">{sec.lecturerName}</strong></span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                {sec.isEnrolled ? (
                  <button
                    onClick={() => handleCancelEnrollment(sec.enrollmentId)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Hủy môn</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleEnroll(sec.id)}
                    disabled={loading || sec.currentEnrolled >= sec.maxCapacity}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus size={14} />
                    <span>{sec.currentEnrolled >= sec.maxCapacity ? 'Hết chỗ' : 'Đăng ký ngay'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
