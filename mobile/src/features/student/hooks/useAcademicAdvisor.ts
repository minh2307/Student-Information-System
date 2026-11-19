/**
 * AI Academic Advisor State Machine Hook (TASK ST-07)
 * Manages conversational state, message history, suggested prompt dispatch,
 * course recommendation unpacking, and fallback indicator tracking.
 */

import { useState, useCallback } from 'react';
import { studentApi } from '../services/studentApi';
import { ChatMessage, AcademicAdvisorResponse } from '../types';

export const STARTER_PROMPTS = [
  'Tư vấn chọn môn cho học kỳ tới',
  'Quy chế giới hạn tối đa 24 tín chỉ',
  'Cách đăng ký môn khi bị trùng lịch học',
  'Điều kiện đạt học bổng học tập',
];

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-msg',
  role: 'assistant',
  content:
    'Xin chào! Tôi là Cố vấn Học vụ AI của Rikkei EduPortal. Tôi có thể hỗ trợ bạn lên kế hoạch học tập, tư vấn đăng ký học phần, giải thích quy chế đào tạo và gợi ý xử lý trùng thời khóa biểu. Bạn cần hỗ trợ gì hôm nay?',
  timestamp: new Date().toISOString(),
  suggestions: STARTER_PROMPTS,
};

export function useAcademicAdvisor() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      // 1. Optimistically append user message
      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);
      setError(null);

      // 2. Format history for backend
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome-msg')
        .slice(-6)
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : m.role,
          content: m.content,
        }));

      try {
        const response: AcademicAdvisorResponse = await studentApi.askAcademicAdvisor({
          message: trimmed,
          history: historyPayload,
        });

        const replyContent =
          response.reply ||
          (response as any).message ||
          'Tôi đã tiếp nhận câu hỏi của bạn nhưng chưa nhận được phản hồi phù hợp.';

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: replyContent,
          timestamp: response.timestamp || new Date().toISOString(),
          mode: response.mode,
          fallbackUsed: response.fallbackUsed,
          suggestions: response.suggestions && response.suggestions.length > 0 ? response.suggestions : undefined,
          recommendations: response.recommendations && response.recommendations.length > 0 ? response.recommendations : undefined,
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message ||
          err?.message ||
          'Không thể kết nối đến dịch vụ Cố vấn AI. Vui lòng thử lại sau.';
        setError(errorMsg);

        const errorBubble: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${errorMsg}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorBubble]);
      } finally {
        setIsThinking(false);
      }
    },
    [isThinking, messages]
  );

  const resetChat = useCallback(() => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setIsThinking(false);
    setError(null);
  }, []);

  return {
    messages,
    isThinking,
    error,
    sendMessage,
    resetChat,
  };
}
