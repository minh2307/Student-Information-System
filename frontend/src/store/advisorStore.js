import { create } from 'zustand'
import api from '../services/api.js'
import { subscribeAuth } from './authStore.js'

export const ADVISOR_STORAGE_KEY = 'eduportal_student_advisor_history'

export const DEFAULT_GREETING = {
  id: 'greeting',
  role: 'assistant',
  content:
    'Chào bạn! Mình là **Trợ lý Cố vấn Học tập AI** của Rikkei EduPortal. 🎓\n\nMình có thể hỗ trợ bạn:\n- Giải đáp quy chế đào tạo tín chỉ (tối đa/tối thiểu tín chỉ, điều kiện tốt nghiệp).\n- Tư vấn đăng ký học phần và xử lý khi bị **trùng thời khóa biểu**.\n- Kiểm tra chuỗi môn học tiên quyết và gợi ý lộ trình học tập tối ưu.\n\nBạn có thể chọn nhanh các câu hỏi gợi ý bên dưới hoặc nhắn tin trực tiếp nhé!',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
}

export const DEFAULT_SUGGESTIONS = [
  'Một kỳ được đăng ký tối đa bao nhiêu tín chỉ?',
  'Bị trùng lịch học giữa 2 môn thì xử lý thế nào?',
  'Điều kiện tiên quyết của môn CS401 là gì?',
  'Gợi ý lộ trình học tập ngành CNTT?',
]

/**
 * Tạo khóa lưu trữ riêng biệt theo User ID (hoặc Guest nếu chưa xác thực)
 */
export const getAdvisorStorageKey = (userOrId) => {
  const id = typeof userOrId === 'object' ? userOrId?.id : userOrId
  if (id !== undefined && id !== null && id !== '') {
    return `${ADVISOR_STORAGE_KEY}_${id}`
  }
  return `${ADVISOR_STORAGE_KEY}_guest`
}

/**
 * Trích xuất User ID đã lưu từ phiên đăng nhập
 */
export const getInitialUserId = () => {
  try {
    const raw =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('eduportal_user')
        : null
    if (raw) {
      const u = JSON.parse(raw)
      return u?.id ?? null
    }
  } catch (e) {}
  return null
}

/**
 * Tải lịch sử hội thoại cho một User ID cụ thể từ Storage
 */
export const loadMessagesForUser = (userId) => {
  try {
    const key = getAdvisorStorageKey(userId)
    const saved =
      (typeof localStorage !== 'undefined' && localStorage.getItem(key)) ||
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key))
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.warn('Failed to restore advisor chat history from storage', e)
  }
  return [DEFAULT_GREETING]
}

/**
 * Lưu lịch sử hội thoại của User ID cụ thể vào Storage
 */
export const saveMessagesForUser = (userId, messages) => {
  try {
    const key = getAdvisorStorageKey(userId)
    const serialized = JSON.stringify(messages)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, serialized)
    }
  } catch (e) {
    console.warn('Failed to save advisor chat history to storage', e)
  }
}

let streamInterval = null

const initialUserId = getInitialUserId()

export const useAdvisorStore = create((set, get) => ({
  currentUserId: initialUserId,
  messages: loadMessagesForUser(initialUserId),
  suggestions: DEFAULT_SUGGESTIONS,
  loading: false,
  isStreaming: false,
  streamingText: '',
  streamingFullText: '',

  getCurrentStorageKey: () => getAdvisorStorageKey(get().currentUserId),

  /**
   * Nạp lại lịch sử hội thoại khi chuyển đổi tài khoản
   */
  loadUserHistory: (userOrId) => {
    if (streamInterval) {
      clearInterval(streamInterval)
      streamInterval = null
    }
    const targetUserId = typeof userOrId === 'object' ? userOrId?.id : userOrId
    const targetId = targetUserId !== undefined ? targetUserId : null
    const loaded = loadMessagesForUser(targetId)
    set({
      currentUserId: targetId,
      messages: loaded,
      suggestions: DEFAULT_SUGGESTIONS,
      loading: false,
      isStreaming: false,
      streamingText: '',
      streamingFullText: '',
    })
  },

  /**
   * Reset in-memory session khi Logout (bảo toàn dữ liệu trong localStorage)
   */
  resetSession: () => {
    if (streamInterval) {
      clearInterval(streamInterval)
      streamInterval = null
    }
    set({
      currentUserId: null,
      messages: [DEFAULT_GREETING],
      suggestions: DEFAULT_SUGGESTIONS,
      loading: false,
      isStreaming: false,
      streamingText: '',
      streamingFullText: '',
    })
  },

  sendMessage: async (queryText, userContext = {}) => {
    const query = (queryText || '').trim()
    const { loading, isStreaming, messages, currentUserId } = get()
    if (!query || loading || isStreaming) return

    const effectiveUserId = userContext?.id ?? currentUserId
    if (effectiveUserId !== currentUserId) {
      set({ currentUserId: effectiveUserId })
    }

    const userMsg = {
      id: String(Date.now()),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const updated = [...messages, userMsg]
    set({ messages: updated, loading: true })
    saveMessagesForUser(get().currentUserId, updated)

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
        studentCode: userContext?.studentCode || userContext?.username || 'STUDENT_PORTAL',
        currentSemester: userContext?.currentSemester || 4,
        major: userContext?.major || 'Công nghệ Thông tin',
      })

      const reply =
        res.data?.data?.reply ||
        'Tôi đã nhận được câu hỏi của bạn. Vui lòng kiểm tra lại quy chế đào tạo nhé!'

      if (res.data?.data?.suggestions && res.data.data.suggestions.length > 0) {
        set({ suggestions: res.data.data.suggestions })
      }

      set({ loading: false })
      get().startTypewriter(reply)
    } catch (err) {
      console.error('Advisor API call error:', err)
      set({ loading: false })

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

      get().startTypewriter(fallbackReply)
    }
  },

  startTypewriter: (fullReply) => {
    if (streamInterval) clearInterval(streamInterval)

    set({
      isStreaming: true,
      streamingText: '',
      streamingFullText: fullReply,
    })

    let index = 0
    const totalLen = fullReply.length
    // Dynamic chunk speed
    const chunkSize = totalLen > 300 ? 4 : 2
    const intervalMs = 20

    streamInterval = setInterval(() => {
      index += chunkSize
      if (index >= totalLen) {
        clearInterval(streamInterval)
        streamInterval = null
        const assistantMsg = {
          id: String(Date.now()),
          role: 'assistant',
          content: fullReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        const newMessages = [...get().messages, assistantMsg]
        set({
          messages: newMessages,
          isStreaming: false,
          streamingText: '',
          streamingFullText: '',
        })
        saveMessagesForUser(get().currentUserId, newMessages)
      } else {
        set({ streamingText: fullReply.slice(0, index) })
      }
    }, intervalMs)
  },

  skipStreaming: () => {
    if (!get().isStreaming) return
    if (streamInterval) {
      clearInterval(streamInterval)
      streamInterval = null
    }
    const full = get().streamingFullText
    const assistantMsg = {
      id: String(Date.now()),
      role: 'assistant',
      content: full,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    const newMessages = [...get().messages, assistantMsg]
    set({
      messages: newMessages,
      isStreaming: false,
      streamingText: '',
      streamingFullText: '',
    })
    saveMessagesForUser(get().currentUserId, newMessages)
  },

  clearHistory: () => {
    if (streamInterval) {
      clearInterval(streamInterval)
      streamInterval = null
    }
    const currentId = get().currentUserId
    const resetMessages = [DEFAULT_GREETING]
    set({
      messages: resetMessages,
      suggestions: DEFAULT_SUGGESTIONS,
      isStreaming: false,
      streamingText: '',
      streamingFullText: '',
      loading: false,
    })
    try {
      const key = getAdvisorStorageKey(currentId)
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key)
    } catch (e) {}
  },
}))

// Cross-tab / Window storage sync cho đúng user đang active
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    const currentKey = getAdvisorStorageKey(useAdvisorStore.getState().currentUserId)
    if (e.key === currentKey) {
      try {
        if (e.newValue) {
          const parsed = JSON.parse(e.newValue)
          if (Array.isArray(parsed) && parsed.length > 0) {
            useAdvisorStore.setState({ messages: parsed })
          }
        } else {
          useAdvisorStore.setState({ messages: [DEFAULT_GREETING] })
        }
      } catch (err) {}
    }
  })
}

// Decoupled Auth Listener: Tự động nạp lịch sử hoặc reset phiên khi đăng nhập/đăng xuất
subscribeAuth((event, data) => {
  if (event === 'LOGIN') {
    useAdvisorStore.getState().loadUserHistory(data?.id)
  } else if (event === 'LOGOUT') {
    useAdvisorStore.getState().resetSession()
  }
})
