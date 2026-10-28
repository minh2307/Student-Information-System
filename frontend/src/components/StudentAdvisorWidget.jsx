import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { confirmDialog } from '../store/confirmStore'
import { toast } from '../store/toastStore'
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
  GripVertical,
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

  // Only show for STUDENT role
  const isStudentPortal = user?.role === 'STUDENT'

  const [isOpen, setIsOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('eduportal_advisor_pos')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return { x: null, y: null }
  })

  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, elemX: 0, elemY: 0 })
  const hasMovedRef = useRef(false)

  const handleDragStart = (e) => {
    if (e.button !== undefined && e.button !== 0 && e.type !== 'touchstart') return
    const clientX = e.clientX ?? e.touches?.[0]?.clientX
    const clientY = e.clientY ?? e.touches?.[0]?.clientY
    if (clientX === undefined || clientY === undefined) return

    isDraggingRef.current = true
    hasMovedRef.current = false

    const currentX = position.x !== null ? position.x : (window.innerWidth - (isOpen ? 440 : 80))
    const currentY = position.y !== null ? position.y : (window.innerHeight - (isOpen ? 580 : 80))

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      elemX: currentX,
      elemY: currentY
    }

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return
      const curX = moveEvent.clientX ?? moveEvent.touches?.[0]?.clientX
      const curY = moveEvent.clientY ?? moveEvent.touches?.[0]?.clientY
      if (curX === undefined || curY === undefined) return

      const deltaX = curX - dragStartRef.current.mouseX
      const deltaY = curY - dragStartRef.current.mouseY

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMovedRef.current = true
      }

      const w = isOpen ? 420 : 60
      const h = isOpen ? 560 : 60
      const maxX = window.innerWidth - w - 12
      const maxY = window.innerHeight - h - 12

      const nextX = Math.max(12, Math.min(maxX, dragStartRef.current.elemX + deltaX))
      const nextY = Math.max(12, Math.min(maxY, dragStartRef.current.elemY + deltaY))

      const newPos = { x: nextX, y: nextY }
      setPosition(newPos)
      try {
        localStorage.setItem('eduportal_advisor_pos', JSON.stringify(newPos))
      } catch (err) {}
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleMouseMove)
      window.removeEventListener('touchend', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleMouseMove)
    window.addEventListener('touchend', handleMouseUp)
  }

  const handleButtonClick = () => {
    if (hasMovedRef.current) return
    setIsOpen(prev => !prev)
  }
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

  const handleClearHistory = async () => {
    const confirmed = await confirmDialog({
      title: 'Làm mới phiên hội thoại AI',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử tư vấn trong phiên hiện tại không?\nHộp thoại sẽ được đặt lại về lời chào ban đầu.',
      confirmText: 'Làm mới hội thoại',
      cancelText: 'Hủy bỏ',
      variant: 'warning',
    })
    if (!confirmed) return

    if (streamTimerRef.current) clearInterval(streamTimerRef.current)
    setIsStreaming(false)
    setStreamingText('')
    setMessages([DEFAULT_GREETING])
    setSuggestions(DEFAULT_SUGGESTIONS)
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    } catch (e) {}
    toast.info('Đã làm mới lịch sử tư vấn AI!')
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

  if (isDismissed) {
    return (
      <div
        onClick={() => setIsDismissed(false)}
        className="fixed right-0 bottom-24 z-50 bg-red-700 hover:bg-red-800 text-white p-2.5 rounded-l-2xl shadow-xl cursor-pointer hover:pl-3.5 transition-all flex items-center gap-1.5 border-y border-l border-red-500/40 group print:hidden select-none"
        title="Mở lại Cố vấn AI"
      >
        <Bot size={18} className="text-white group-hover:scale-110 transition-transform animate-pulse" />
        <span className="text-[11px] font-mono font-bold hidden group-hover:inline-block">AI</span>
      </div>
    )
  }

  const containerStyle =
    position.x !== null && position.y !== null
      ? { left: `${position.x}px`, top: `${position.y}px` }
      : { right: '24px', bottom: '24px' }

  return (
    <div
      style={containerStyle}
      className="fixed z-50 print:hidden font-sans select-none"
    >
      {/* Floating Action Button (Compact Icon-Only FAB with Drag & Hover-Expansion) */}
      {!isOpen && (
        <div className="relative group flex items-center">
          {/* Nút X tắt/ẩn tạm thời */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsDismissed(true)
            }}
            className="absolute -top-1 -left-1 w-4.5 h-4.5 bg-stone-800/90 hover:bg-red-700 text-stone-200 hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-stone-600 text-[10px]"
            title="Ẩn Cố vấn AI"
          >
            <X size={10} />
          </button>

          {/* Nút FAB chính có thể kéo thả */}
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            onClick={handleButtonClick}
            className="flex items-center bg-red-700 hover:bg-red-800 text-white rounded-full shadow-lg shadow-red-900/30 hover:shadow-red-900/50 border border-red-600/50 cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden"
            title="Nhấn để mở • Giữ chuột để kéo di chuyển vị trí"
          >
            {/* Icon tròn nhỏ gọn 48px */}
            <div className="w-12 h-12 flex items-center justify-center shrink-0 relative">
              <Bot size={22} className="animate-pulse" />
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-red-700 rounded-full"></span>
            </div>

            {/* Bung chữ nhẹ nhàng khi rê chuột vào */}
            <div className="max-w-0 group-hover:max-w-xs transition-all duration-300 ease-out overflow-hidden whitespace-nowrap pr-0 group-hover:pr-4">
              <div className="text-xs font-bold font-mono flex items-center gap-1 leading-none">
                <span>Cố vấn AI</span>
                <Sparkles size={11} className="text-amber-300" />
              </div>
              <div className="text-[10px] text-red-200 font-medium leading-none mt-1">
                Kéo thả tùy ý
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Window with Draggable Header */}
      {isOpen && (
        <div className="w-[370px] sm:w-[420px] h-[560px] max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-stone-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header - Kéo thả cửa sổ */}
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className="px-4 py-3 bg-red-800 text-white flex items-center justify-between shrink-0 shadow-sm border-b border-red-900 cursor-grab active:cursor-grabbing select-none"
            title="Giữ chuột vào thanh này để kéo di chuyển cửa sổ"
          >
            <div className="flex items-center gap-2 pointer-events-none">
              <GripVertical size={16} className="text-red-300/70" />
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                <Bot size={17} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight">Cố vấn Học tập AI</h3>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-red-100/90 font-mono">
                  Kéo thả để đổi vị trí
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {position.x !== null && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setPosition({ x: null, y: null })
                    localStorage.removeItem('eduportal_advisor_pos')
                  }}
                  className="px-1.5 py-1 text-red-100 hover:text-white hover:bg-white/10 rounded text-[10px] font-mono transition-colors"
                  title="Đặt lại vị trí mặc định"
                >
                  Reset
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClearHistory()
                }}
                className="p-1.5 text-red-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Xóa lịch sử hội thoại"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                }}
                className="p-1.5 text-red-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Thu nhỏ"
              >
                <Minus size={15} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                  setIsDismissed(true)
                }}
                className="p-1.5 text-red-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Ẩn nút"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto bg-stone-50/60 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-stone-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot size={14} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-red-700 text-white rounded-tr-none'
                      : 'bg-white border border-stone-200/90 text-stone-800 rounded-tl-none'
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
                    className={`text-[9px] mt-1 text-right font-mono ${
                      msg.role === 'user' ? 'text-red-100/80' : 'text-stone-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={13} />
                  </div>
                )}
              </div>
            ))}

            {/* Live Streaming / Typewriter State */}
            {isStreaming && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-stone-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Bot size={14} />
                </div>
                <div className="max-w-[85%] bg-white border border-red-200 text-stone-800 rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-2xs leading-relaxed relative">
                  <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-red-50">
                    <span className="text-[10px] text-red-700 font-semibold flex items-center gap-1 font-mono">
                      <Sparkles size={11} className="animate-spin" />
                      AI đang trả lời...
                    </span>
                    <button
                      onClick={handleSkipTyping}
                      className="text-[10px] text-red-700 hover:text-red-900 font-medium flex items-center gap-0.5 hover:underline"
                      title="Hiện đầy đủ ngay lập tức"
                    >
                      <FastForward size={11} />
                      Bỏ qua hiệu ứng
                    </button>
                  </div>
                  <div className="break-words">
                    {renderMessageContent(streamingText)}
                    <span className="inline-block w-1.5 h-3.5 bg-red-700 ml-0.5 animate-pulse align-middle" />
                  </div>
                </div>
              </div>
            )}

            {/* Loading / Thinking State */}
            {loading && !isStreaming && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-stone-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} />
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-2xs flex items-center gap-2 text-stone-500">
                  <Loader2 size={13} className="animate-spin text-red-700" />
                  <span className="text-[11px] font-mono text-stone-600">
                    Cố vấn AI đang phân tích dữ liệu...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          {!loading && !isStreaming && suggestions.length > 0 && (
            <div className="px-3 py-2 bg-white border-t border-stone-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] text-stone-500 font-medium shrink-0 flex items-center gap-1">
                <Sparkles size={10} className="text-amber-500" />
                Gợi ý:
              </span>
              {suggestions.slice(0, 3).map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(item)}
                  className="px-2.5 py-1 text-[11px] bg-stone-100 hover:bg-red-50 hover:text-red-800 text-stone-700 rounded-lg whitespace-nowrap transition-colors border border-stone-200/80 shrink-0 font-medium"
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
            className="p-3 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0"
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
              className="flex-1 px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:border-red-700 focus:bg-white outline-none transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || isStreaming}
              className="p-2 bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white rounded-lg shadow-2xs transition-all shrink-0 active:scale-95"
              title="Gửi câu hỏi"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
