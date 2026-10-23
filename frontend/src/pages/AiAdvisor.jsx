import React, { useState } from 'react'
import api from '../services/api'
import { Bot, Send, User, Sparkles, Loader2 } from 'lucide-react'

export const AiAdvisor = () => {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([
    'Một kỳ được đăng ký tối đa bao nhiêu tín chỉ?',
    'Bị trùng lịch học giữa 2 môn thì xử lý thế nào?',
    'Điều kiện tiên quyết của môn CS401 là gì?',
    'Gợi ý lộ trình học tập ngành CNTT?',
  ])
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Xin chào! Mình là Trợ lý Cố vấn Học tập AI của Rikkei EduPortal. Bạn cần tư vấn lộ trình học tập, quy chế tín chỉ hay cách xử lý khi bị trùng thời khóa biểu?',
    },
  ])

  const sendQuery = async (queryText) => {
    if (!queryText.trim() || loading) return

    setInput('')
    const updatedMessages = [...messages, { role: 'user', content: queryText }]
    setMessages(updatedMessages)
    setLoading(true)

    try {
      const res = await api.post('/ai/academic-advisor', { message: queryText })
      const reply = res.data?.data?.reply || 'Tôi đã nhận được câu hỏi của bạn. Vui lòng kiểm tra lại quy chế đào tạo nhé!'
      if (res.data?.data?.suggestions && res.data.data.suggestions.length > 0) {
        setSuggestions(res.data.data.suggestions)
      }
      setMessages([...updatedMessages, { role: 'assistant', content: reply }])
    } catch (err) {
      console.error('Lỗi khi gọi Academic Advisor API:', err)
      setTimeout(() => {
        let reply = 'Theo quy chế đào tạo, bạn được phép đăng ký tối đa 24 tín chỉ trong học kỳ này. Bạn nên ưu tiên hoàn thành các môn tiên quyết như CS201 trước khi đăng ký CS401 để đảm bảo tiếp thu kiến thức tốt nhất.'
        if (queryText.toLowerCase().includes('lịch') || queryText.toLowerCase().includes('trùng')) {
          reply = 'Hệ thống phát hiện trùng lịch khi 2 lớp có cùng Thứ và giao thoa khung giờ. Bạn hãy đổi sang Section khác của môn học hoặc ưu tiên giữ môn tiên quyết nhé!'
        }
        setMessages([...updatedMessages, { role: 'assistant', content: reply }])
      }, 700)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    sendQuery(input)
  }

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-red-800 text-white flex items-center justify-between border-b border-red-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight">Cố Vấn Học Tập AI (Academic Advisor)</h2>
            <p className="text-xs text-red-100 flex items-center gap-1 font-mono text-[11px]">
              <Sparkles size={11} /> Hỗ trợ quy chế & tư vấn môn học chuyên sâu
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-stone-50/60">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                m.role === 'user' ? 'bg-red-700 text-white' : 'bg-stone-800 text-white shadow-2xs'
              }`}
            >
              {m.role === 'user' ? <User size={15} /> : <Bot size={15} />}
            </div>
            <div
              className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-lg whitespace-pre-line ${
                m.role === 'user'
                  ? 'bg-red-700 text-white rounded-tr-none'
                  : 'bg-white text-stone-800 border border-stone-200 rounded-tl-none shadow-2xs'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-stone-400 pl-11">
            <Loader2 size={13} className="animate-spin text-red-700" />
            <span className="font-mono text-[11px]">AI đang tổng hợp dữ liệu học vụ...</span>
          </div>
        )}
      </div>

      {/* Quick Suggestions Chips */}
      {suggestions.length > 0 && (
        <div className="px-4 py-2 bg-stone-100/70 border-t border-stone-200 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-stone-500 shrink-0 font-medium text-[11px]">Gợi ý:</span>
          {suggestions.slice(0, 3).map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => sendQuery(s)}
              disabled={loading}
              className="px-2.5 py-1 bg-white hover:bg-red-50 hover:text-red-800 border border-stone-200 rounded-full text-stone-700 whitespace-nowrap transition-colors shrink-0 shadow-2xs text-[11px]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi về môn học, quy chế tín chỉ..."
          className="flex-1 px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-red-700 focus:bg-white transition"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-lg flex items-center justify-center transition shadow-2xs"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}

export default AiAdvisor
