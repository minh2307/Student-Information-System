import React, { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useAdvisorStore } from '../store/advisorStore'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { confirmDialog } from '../store/confirmStore'
import { toast } from '../store/toastStore'
import {
  Bot,
  Send,
  User,
  Sparkles,
  Loader2,
  RotateCcw,
  FastForward,
} from 'lucide-react'

export const AiAdvisor = () => {
  const { user } = useAuthStore()
  const {
    messages,
    suggestions,
    loading,
    isStreaming,
    streamingText,
    sendMessage,
    skipStreaming,
    clearHistory,
    loadUserHistory,
    currentUserId,
  } = useAdvisorStore()

  // Tự động đồng bộ đúng lịch sử chat theo User ID
  useEffect(() => {
    if (user?.id !== undefined && user?.id !== currentUserId) {
      loadUserHistory(user.id)
    }
  }, [user?.id, currentUserId, loadUserHistory])

  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText, loading])

  // Focus input when ready
  useEffect(() => {
    if (!loading && !isStreaming && inputRef.current) {
      inputRef.current.focus()
    }
  }, [loading, isStreaming])

  const handleSend = (e) => {
    e?.preventDefault()
    if (!input.trim() || loading || isStreaming) return
    const text = input
    setInput('')
    sendMessage(text, user)
  }

  const handleSuggestionClick = (suggestion) => {
    if (loading || isStreaming) return
    sendMessage(suggestion, user)
  }

  const handleClear = async () => {
    const confirmed = await confirmDialog({
      title: 'Làm mới phiên hội thoại AI',
      message:
        'Bạn có chắc chắn muốn xóa toàn bộ lịch sử tư vấn trong phiên hiện tại không?\nHộp thoại sẽ được đặt lại về lời chào ban đầu.',
      confirmText: 'Làm mới hội thoại',
      cancelText: 'Hủy bỏ',
      variant: 'warning',
    })
    if (!confirmed) return

    clearHistory()
    toast.info('Đã làm mới lịch sử tư vấn AI!')
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-7.5rem)] flex flex-col bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden font-sans">
      {/* Header */}
      <div className="p-4 bg-red-800 text-white flex items-center justify-between border-b border-red-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <Bot size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm tracking-tight">
                Cố Vấn Học Tập AI (Academic Advisor)
              </h2>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Trực tuyến 24/7
              </span>
            </div>
            <p className="text-xs text-red-100 flex items-center gap-1 font-mono text-[11px] mt-0.5">
              <Sparkles size={11} className="text-amber-300" />
              Tư vấn quy chế tín chỉ, lộ trình môn học & xử lý trùng lịch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/10 font-medium cursor-pointer"
            title="Xóa toàn bộ lịch sử hội thoại"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Làm mới hội thoại</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-stone-50/60">
        {messages.map((m) => (
          <div
            key={m.id || m.content}
            className={`flex items-start gap-3 ${
              m.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${
                m.role === 'user'
                  ? 'bg-red-700 text-white'
                  : 'bg-stone-800 text-white border border-stone-700'
              }`}
            >
              {m.role === 'user' ? <User size={15} /> : <Bot size={16} />}
            </div>

            <div
              className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed max-w-[85%] sm:max-w-2xl break-words ${
                m.role === 'user'
                  ? 'bg-red-700 text-white rounded-tr-none shadow-2xs'
                  : 'bg-white text-stone-800 border border-stone-200/90 rounded-tl-none shadow-2xs'
              }`}
            >
              {m.role === 'assistant' ? (
                <MarkdownRenderer content={m.content} />
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}

              {m.timestamp && (
                <div
                  className={`text-[9px] mt-1.5 text-right font-mono ${
                    m.role === 'user' ? 'text-red-100/80' : 'text-stone-400'
                  }`}
                >
                  {m.timestamp}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Streaming / Typewriter State */}
        {isStreaming && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-stone-800 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5 border border-stone-700">
              <Bot size={16} />
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl rounded-tl-none text-xs sm:text-[13px] leading-relaxed max-w-[85%] sm:max-w-2xl break-words bg-white text-stone-800 border border-red-200 shadow-2xs relative">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-red-50">
                <span className="text-[11px] text-red-700 font-semibold flex items-center gap-1 font-mono">
                  <Sparkles size={11} className="animate-spin text-amber-500" />
                  Cố vấn AI đang phản hồi...
                </span>
                <button
                  type="button"
                  onClick={skipStreaming}
                  className="text-[11px] text-red-700 hover:text-red-900 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                  title="Hiện toàn bộ câu trả lời ngay lập tức"
                >
                  <FastForward size={12} />
                  Bỏ qua hiệu ứng
                </button>
              </div>

              <div>
                <MarkdownRenderer content={streamingText} />
                <span className="inline-block w-1.5 h-3.5 bg-red-700 ml-1 animate-pulse align-middle" />
              </div>
            </div>
          </div>
        )}

        {/* Loading / Thinking State */}
        {loading && !isStreaming && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-stone-800 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              <Bot size={16} />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-white border border-stone-200 text-stone-600 shadow-2xs flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-red-700" />
              <span className="font-mono text-xs text-stone-600">
                Cố vấn AI đang phân tích dữ liệu học vụ...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Chips */}
      {!loading && !isStreaming && suggestions.length > 0 && (
        <div className="px-4 py-2 bg-stone-100/70 border-t border-stone-200 flex items-center gap-2 overflow-x-auto text-xs shrink-0 no-scrollbar">
          <span className="text-stone-500 shrink-0 font-medium text-[11px] flex items-center gap-1">
            <Sparkles size={11} className="text-amber-500" /> Gợi ý:
          </span>
          {suggestions.slice(0, 4).map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(s)}
              disabled={loading || isStreaming}
              className="px-3 py-1 bg-white hover:bg-red-50 hover:text-red-800 border border-stone-200/90 rounded-full text-stone-700 whitespace-nowrap transition-colors shrink-0 shadow-2xs text-xs font-medium cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-white border-t border-stone-200 flex gap-2 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || isStreaming}
          placeholder={
            isStreaming
              ? 'AI đang nhập câu trả lời...'
              : 'Nhập câu hỏi về môn học, quy chế tín chỉ, trùng lịch...'
          }
          className="flex-1 px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-red-700 focus:bg-white transition disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading || isStreaming}
          className="px-4.5 bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition shadow-2xs shrink-0 active:scale-95 cursor-pointer"
          title="Gửi câu hỏi"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}

export default AiAdvisor
