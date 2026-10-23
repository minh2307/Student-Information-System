import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import {
  Bot,
  Sparkles,
  Send,
  X,
  Minus,
  RotateCcw,
  User,
  Loader2,
  ChevronRight,
  MessageSquare,
  FastForward,
} from 'lucide-react'

const SESSION_STORAGE_KEY = 'eduportal_student_advisor_history'

const DEFAULT_GREETING = {
  id: 'greeting',
  role: 'assistant',
  content:
    'Chào bạn! Mình là **Trợ lý Cố vấn Học tập AI** của Rikkei EduPortal. 🎓\n\nMình có thể hỗ trợ bạn:\n- Giải đáp quy chế đào tạo tín chỉ (tối đa/tối thiểu tín chỉ, điều kiện tốt nghiệp).\n- Tư vấn đăng ký học phần và xử lý khi bị **trùng thời khóa biểu**.\n- Kiểm tra chuỗi môn học tiên quyết và gợi ý lộ trình học tập tối ưu.\n\nBạn có thể chọn nhanh các câu hỏi gợi ý bên dưới hoặc nhắn tin trực tiếp nhé!',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
}

const DEFAULT_SUGGESTIONS = [
  'Một kỳ được đăng ký tối đa bao nhiêu tín chỉ?',
  'Bị trùng lịch học giữa 2 môn thì xử lý thế nào?',
  'Điều kiện tiên quyết của môn CS401 là gì?',
  'Gợi ý lộ trình học tập ngành CNTT?',
]

export const StudentAdvisorWidget = () => {
  const { user } = useAuthStore()
  const location = useLocation()

  // Only show on student portal or if current user is STUDENT
  const isStudentPortal =
    user?.role === 'STUDENT' ||
    location.pathname.startsWith('/student') ||
    location.pathname === '/'

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.warn('Failed to restore advisor chat history from session', e)
    }
    return [DEFAULT_GREETING]
  })

  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  // Typing / streaming simulation state
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const streamingFullRef = useRef('')
  const streamTimerRef = useRef(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Persist messages to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages))
    } catch (e) {
      console.warn('Failed to save advisor chat history to session', e)
    }
  }, [messages])

  // Scroll to bottom when messages or streaming text change
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, streamingText, isOpen, loading])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isStreaming && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, isStreaming])

  // Clean up streaming timer on unmount
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current)
    }
  }, [])

  if (!isStudentPortal) {
    return null
  }

  // Typewriter / Streaming animation
  const startTypewriter = (fullReply, onComplete) => {
    setIsStreaming(true)
    setStreamingText('')
    streamingFullRef.current = fullReply

    let index = 0
    const totalLen = fullReply.length
    // Dynamic chunk speed
    const chunkSize = totalLen > 300 ? 4 : 2
    const intervalMs = 20

    if (streamTimerRef.current) clearInterval(streamTimerRef.current)

    streamTimerRef.current = setInterval(() => {
      index += chunkSize
      if (index >= totalLen) {
        setStreamingText(fullReply)
        setIsStreaming(false)
        clearInterval(streamTimerRef.current)
        streamTimerRef.current = null
        if (onComplete) onComplete()
      } else {
        setStreamingText(fullReply.slice(0, index))
      }
    }, intervalMs)
  }

  // Skip typing effect immediately
  const handleSkipTyping = () => {
    if (!isStreaming) return
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current)
      streamTimerRef.current = null
    }
    const full = streamingFullRef.current
    setIsStreaming(false)
    setStreamingText('')
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        role: 'assistant',
        content: full,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim()
    if (!query || loading || isStreaming) return

    setInput('')

    const userMsg = {
      id: String(Date.now()),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)

    // Build history payload (last 6 turns)
    const historyPayload = updated
      .filter((m) => m.id !== 'greeting')
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }))

    try {
      const res = await api.post('/ai/academic-advisor', {
        message: query,
        history: historyPayload,
        studentCode: user?.studentCode || user?.username || 'STUDENT_PORTAL',
        currentSemester: user?.currentSemester || 4,
        major: user?.major || 'Công nghệ Thông tin',
      })

      const reply =
        res.data?.data?.reply ||
        'Tôi đã nhận được câu hỏi của bạn. Vui lòng kiểm tra lại quy chế đào tạo nhé!'

      if (res.data?.data?.suggestions && res.data.data.suggestions.length > 0) {
        setSuggestions(res.data.data.suggestions)
      }

      setLoading(false)

      // Start typewriter streaming effect for the assistant reply
      startTypewriter(reply, () => {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            role: 'assistant',
            content: reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
        setStreamingText('')
      })
    } catch (err) {
      console.error('Advisor widget API call error:', err)
      setLoading(false)

      let fallbackReply =
        'Theo quy chế đào tạo tín chỉ, bạn được phép đăng ký tối đa 24 tín chỉ trong một học kỳ chính và tối thiểu 12 tín chỉ. Bạn nên ưu tiên hoàn thành các môn tiên quyết để đảm bảo lộ trình chuẩn nhé!'

      const lower = query.toLowerCase()
      if (lower.includes('trùng') || lower.includes('lịch') || lower.includes('conflict')) {
        fallbackReply =
          '**Xử lý trùng thời khóa biểu:**\n1. Kiểm tra và chuyển sang Section khác của môn học mở ở thứ/khung giờ khác.\n2. Ưu tiên giữ môn học tiên quyết trước.\n3. Đổi sang môn tự chọn tương đương hoặc hoãn sang kỳ tiếp theo/kỳ hè.'
      } else if (lower.includes('tiên quyết') || lower.includes('cs401')) {
        fallbackReply =
          'Môn `CS401 (Phát triển ứng dụng Web)` yêu cầu điều kiện tiên quyết là phải tích lũy và đạt môn `CS201 (Cấu trúc dữ liệu và giải thuật)` (điểm >= D / 4.0).'
      }

      startTypewriter(fallbackReply, () => {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            role: 'assistant',
            content: fallbackReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
        setStreamingText('')
      })
    }
  }

  const handleClearHistory = () => {
    if (window.confirm('Bạn có muốn xóa toàn bộ lịch sử tư vấn trong phiên này?')) {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current)
      setIsStreaming(false)
      setStreamingText('')
      setMessages([DEFAULT_GREETING])
      setSuggestions(DEFAULT_SUGGESTIONS)
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
      } catch (e) {}
    }
  }

  // Format content with basic markdown (bold, lists, code)
  const renderMessageContent = (text) => {
    if (!text) return null
    return text.split('\n').map((line, idx) => {
      // Heading 3
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-slate-900 mt-2 mb-1 text-xs">
            {line.replace('### ', '')}
          </h4>
        )
      }
      // Blockquote
      if (line.startsWith('> ')) {
        return (
          <blockquote
            key={idx}
            className="border-l-2 border-indigo-400 pl-2.5 my-1 text-slate-600 italic bg-indigo-50/40 py-1 rounded-r text-[11px]"
          >
            {line.replace('> ', '')}
          </blockquote>
        )
      }
      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={idx} className="flex items-start gap-1.5 my-0.5 pl-1">
            <span className="text-indigo-500 font-bold">•</span>
            <span className="flex-1">{parseInlineStyles(line.slice(2))}</span>
          </div>
        )
      }
      // Numbered list
      const numMatch = line.match(/^(\d+)\.\s+(.*)$/)
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-1.5 my-0.5 pl-1">
            <span className="text-indigo-600 font-semibold text-[11px]">{numMatch[1]}.</span>
            <span className="flex-1">{parseInlineStyles(numMatch[2])}</span>
          </div>
        )
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />
      }
      return (
        <p key={idx} className="my-0.5">
          {parseInlineStyles(line)}
        </p>
      )
    })
  }

  const parseInlineStyles = (str) => {
    // Regex for bold **text** and code `code`
    const parts = []
    let lastIdx = 0
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
    let match

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIdx) {
        parts.push(str.substring(lastIdx, match.index))
      }
      const token = match[0]
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-semibold text-slate-900">
            {token.slice(2, -2)}
          </strong>
        )
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            className="px-1 py-0.5 bg-slate-200/70 text-indigo-700 font-mono text-[11px] rounded"
          >
            {token.slice(1, -1)}
          </code>
        )
      }
      lastIdx = regex.lastIndex
    }

    if (lastIdx < str.length) {
      parts.push(str.substring(lastIdx))
    }

    return parts.length > 0 ? parts : str
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden font-sans">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
          title="Mở Cố vấn Học tập AI"
        >
          <div className="relative">
            <Bot size={22} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full"></span>
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold leading-none flex items-center gap-1">
              <span>Cố vấn AI</span>
              <Sparkles size={11} className="text-amber-300" />
            </div>
            <div className="text-[10px] text-blue-100 font-medium leading-none mt-1">
              Tư vấn môn học & quy chế
            </div>
          </div>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="w-[370px] sm:w-[420px] h-[560px] max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
                <Bot size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight">Cố vấn Học tập AI</h3>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/90">
                  Rikkei EduPortal • Spring AI Advisor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Xóa lịch sử hội thoại"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Thu nhỏ"
              >
                <Minus size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Đóng widget"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto bg-slate-50/60 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot size={15} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-none'
                  }`}
                >
                  <div className="break-words">
                    {msg.role === 'assistant' ? (
                      renderMessageContent(msg.content)
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  <div
                    className={`text-[9px] mt-1 text-right ${
                      msg.role === 'user' ? 'text-blue-100/80' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {/* Live Streaming / Typewriter State */}
            {isStreaming && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Bot size={15} />
                </div>
                <div className="max-w-[85%] bg-white border border-indigo-200 text-slate-800 rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-md leading-relaxed relative">
                  <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-indigo-50">
                    <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                      <Sparkles size={11} className="animate-spin" />
                      AI đang trả lời...
                    </span>
                    <button
                      onClick={handleSkipTyping}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5 hover:underline"
                      title="Hiện đầy đủ ngay lập tức"
                    >
                      <FastForward size={11} />
                      Bỏ qua hiệu ứng
                    </button>
                  </div>
                  <div className="break-words">
                    {renderMessageContent(streamingText)}
                    <span className="inline-block w-1.5 h-3.5 bg-indigo-600 ml-0.5 animate-pulse align-middle" />
                  </div>
                </div>
              </div>
            )}

            {/* Loading / Thinking State */}
            {loading && !isStreaming && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={15} />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm flex items-center gap-2 text-slate-500">
                  <Loader2 size={14} className="animate-spin text-indigo-600" />
                  <span className="text-[11px] font-medium text-slate-600">
                    Cố vấn AI đang phân tích dữ liệu...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          {!loading && !isStreaming && suggestions.length > 0 && (
            <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                <Sparkles size={10} className="text-amber-500" />
                Gợi ý:
              </span>
              {suggestions.slice(0, 3).map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(item)}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg whitespace-nowrap transition-colors border border-slate-200/60 shrink-0 font-medium"
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || isStreaming}
              placeholder={
                isStreaming
                  ? 'AI đang tạo câu trả lời...'
                  : 'Hỏi về quy chế, trùng lịch, môn tiên quyết...'
              }
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || isStreaming}
              className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-sm transition-all shrink-0 active:scale-95"
              title="Gửi câu hỏi"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
