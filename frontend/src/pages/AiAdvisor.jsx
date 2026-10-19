import React, { useState } from 'react'
import api from '../services/api'
import { Bot, Send, User, Sparkles, Loader2 } from 'lucide-react'

export const AiAdvisor = () => {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Xin chào! Tôi là Trợ lý Cố vấn Học tập AI của Rikkei EduPortal. Bạn cần tư vấn lộ trình học tập, quy chế tín chỉ hay tra cứu thông tin môn học nào?',
    },
  ])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userText = input.trim()
    setInput('')
    const updatedMessages = [...messages, { role: 'user', content: userText }]
    setMessages(updatedMessages)
    setLoading(true)

    try {
      const res = await api.post('/ai/academic-advisor', { message: userText })
      const reply = res.data?.data?.reply || 'Tôi đã nhận được câu hỏi của bạn. Vui lòng kiểm tra lại quy chế đăng ký tối đa 24 tín chỉ trong kỳ nhé!'
      setMessages([...updatedMessages, { role: 'assistant', content: reply }])
    } catch (err) {
      // Mock advisor response fallback
      setTimeout(() => {
        let reply = 'Theo quy chế đào tạo, bạn được phép đăng ký tối đa 24 tín chỉ trong học kỳ này. Bạn nên ưu tiên hoàn thành các môn tiên quyết như CS201 trước khi đăng ký CS401 để đảm bảo tiếp thu kiến thức tốt nhất.'
        if (userText.toLowerCase().includes('lịch') || userText.toLowerCase().includes('trùng')) {
          reply = 'Hệ thống kiểm tra xung đột sẽ tự động cảnh báo nếu hai lớp học phần có cùng Thứ trong tuần và giao thoa về khung thời gian bắt đầu - kết thúc.'
        }
        setMessages([...updatedMessages, { role: 'assistant', content: reply }])
      }, 700)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="font-bold text-sm">Cố vấn Học tập AI (Academic Advisor)</h2>
            <p className="text-xs text-blue-100 flex items-center gap-1">
              <Sparkles size={12} /> Hỗ trợ quy chế & tư vấn môn học thông minh
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white shadow-sm'
              }`}
            >
              {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div
              className={`p-3.5 rounded-2xl text-sm leading-relaxed max-w-lg ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pl-11">
            <Loader2 size={14} className="animate-spin text-indigo-600" />
            <span>AI đang soạn câu trả lời...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi về môn học, quy chế tín chỉ..."
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
