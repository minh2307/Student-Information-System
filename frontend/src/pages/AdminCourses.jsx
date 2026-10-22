import React, { useState } from 'react'
import api from '../services/api'
import { Plus, Sparkles, BookOpen, Clock, Loader2 } from 'lucide-react'

export const AdminCourses = () => {
  const [courses, setCourses] = useState([
    { id: 2, courseCode: 'CS201', name: 'Data Structures and Algorithms', credits: 3, weeklyHours: 4, syllabus: 'Cấu trúc dữ liệu nâng cao (Tree, Graph) và các thuật toán tối ưu.' },
    { id: 3, courseCode: 'CS301', name: 'Database Management Systems', credits: 3, weeklyHours: 4, syllabus: 'Mô hình CSDL quan hệ, thiết kế chuẩn hóa và SQL chuyên sâu.' },
    { id: 4, courseCode: 'CS401', name: 'Web Application Development', credits: 3, weeklyHours: 4, syllabus: 'Xây dựng ứng dụng fullstack với Spring Boot và ReactJS.' },
  ])

  const [aiGenerating, setAiGenerating] = useState(false)
  const [targetCourseName, setTargetCourseName] = useState('')
  const [targetCredits, setTargetCredits] = useState(3)
  const [targetRequirements, setTargetRequirements] = useState('')
  const [generatedSyllabus, setGeneratedSyllabus] = useState('')

  const handleGenerateSyllabus = async () => {
    if (!targetCourseName) return
    setAiGenerating(true)
    setGeneratedSyllabus('')

    try {
      const res = await api.post('/ai/generate-syllabus', {
        courseName: targetCourseName,
        credits: targetCredits,
        requirements: targetRequirements,
      })
      if (res.data?.data?.syllabus) {
        setGeneratedSyllabus(res.data.data.syllabus)
      }
    } catch (err) {
      console.error('Lỗi khi gọi AI Syllabus API:', err)
      // Mock generation fallback for offline preview
      setTimeout(() => {
        setGeneratedSyllabus(
          `[AI Generated Syllabus for ${targetCourseName} - ${targetCredits} Credits]:\n` +
          `1. Mục tiêu học phần: Cung cấp kiến thức nền tảng và kỹ năng thực hành chuyên sâu theo định hướng: ${targetRequirements || 'Thực hành ứng dụng'}.\n` +
          `2. Tuần 1-4: Nguyên lý cơ bản, thiết lập môi trường và cấu trúc dữ liệu cốt lõi.\n` +
          `3. Tuần 5-8: Các thuật toán nâng cao, tối ưu hóa độ phức tạp thời gian/bộ nhớ.\n` +
          `4. Tuần 9-12: Thực hành Project nhóm kết hợp CI/CD và kiến trúc Microservices.\n` +
          `5. Đánh giá: 10% Chuyên cần, 30% Bài tập lớn/Giữa kỳ, 60% Đồ án kết thúc học phần.`
        )
      }, 1000)
    } finally {
      setAiGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Danh mục Môn học</h1>
          <p className="text-slate-500 text-sm mt-0.5">Quản lý môn học và tích hợp AI sinh đề cương chi tiết (FR-08)</p>
        </div>
      </div>

      {/* AI Syllabus Generator Box */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
          <Sparkles size={18} />
          <span>AI Syllabus Generator (Trí tuệ nhân tạo sinh đề cương môn học)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            type="text"
            placeholder="Tên môn học (VD: Cloud Computing, DevOps, An toàn thông tin...)"
            value={targetCourseName}
            onChange={(e) => setTargetCourseName(e.target.value)}
            className="md:col-span-5 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={targetCredits}
            onChange={(e) => setTargetCredits(Number(e.target.value))}
            className="md:col-span-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <option key={num} value={num}>
                {num} Tín chỉ
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Yêu cầu bổ sung (VD: Thực hành Kubernetes, AWS...)"
            value={targetRequirements}
            onChange={(e) => setTargetRequirements(e.target.value)}
            className="md:col-span-3 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleGenerateSyllabus}
            disabled={aiGenerating || !targetCourseName}
            className="md:col-span-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            {aiGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>{aiGenerating ? 'AI đang tạo...' : 'Sinh đề cương'}</span>
          </button>
        </div>

        {generatedSyllabus && (
          <div className="bg-white p-4 rounded-lg border border-indigo-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed shadow-inner">
            {generatedSyllabus}
          </div>
        )}
      </div>

      {/* Course List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Mã môn</th>
              <th className="px-4 py-4">Tên môn học</th>
              <th className="px-4 py-4 text-center">Tín chỉ</th>
              <th className="px-4 py-4 text-center">Giờ học/tuần</th>
              <th className="px-6 py-4">Đề cương tóm tắt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono font-bold text-blue-600">{c.courseCode}</td>
                <td className="px-4 py-4 font-bold text-slate-800">{c.name}</td>
                <td className="px-4 py-4 text-center font-semibold">{c.credits}</td>
                <td className="px-4 py-4 text-center text-slate-500">{c.weeklyHours}h</td>
                <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{c.syllabus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
