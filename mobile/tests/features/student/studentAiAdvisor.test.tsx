/**
 * Student AI Academic Advisor Unit & Integration Tests (TASK ST-07)
 * Validates conversational chat interface, suggested prompts,
 * course recommendation cards, fallback mode badge, and thinking indicators.
 */

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import AiAdvisorScreen from '@/app/(student)/ai-advisor';
import { useAcademicAdvisor } from '@/features/student/hooks/useAcademicAdvisor';
import { ChatMessage } from '@/features/student/types';

jest.mock('@/features/student/hooks/useAcademicAdvisor', () => {
  const actual = jest.requireActual('@/features/student/hooks/useAcademicAdvisor');
  return {
    ...actual,
    useAcademicAdvisor: jest.fn(),
  };
});

describe('Student AI Academic Advisor Subsystem (TASK ST-07)', () => {
  const mockInitialMessages: ChatMessage[] = [
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Xin chào! Tôi là Cố vấn Học vụ AI của Rikkei EduPortal. Tôi có thể hỗ trợ bạn lên kế hoạch học tập, tư vấn đăng ký học phần, giải thích quy chế đào tạo và gợi ý xử lý trùng thời khóa biểu.',
      timestamp: '2026-11-19T10:00:00Z',
      suggestions: [
        'Tư vấn chọn môn cho học kỳ tới',
        'Quy chế giới hạn tối đa 24 tín chỉ',
      ],
    },
  ];

  const mockConversationMessages: ChatMessage[] = [
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: 'Xin chào! Tôi là Cố vấn Học vụ AI của Rikkei EduPortal.',
      timestamp: '2026-11-19T10:00:00Z',
    },
    {
      id: 'user-1',
      role: 'user',
      content: 'Em muốn hỏi về quy chế trùng thời khóa biểu?',
      timestamp: '2026-11-19T10:01:00Z',
    },
    {
      id: 'ai-1',
      role: 'assistant',
      content:
        'Theo Quy chế đào tạo Rikkei Academy (Điều 14), sinh viên được phép đăng ký các lớp học phần có thời khóa biểu trùng lặp một phần nếu được giảng viên phụ trách chấp thuận.',
      timestamp: '2026-11-19T10:01:05Z',
      fallbackUsed: true, // Rule-based fallback engine
      recommendations: [
        {
          courseCode: 'CS301',
          courseName: 'Lập trình Web chuyên sâu',
          credits: 3,
          priority: 'HIGH',
          reason: 'Môn tiên quyết cho Đồ án tốt nghiệp kỳ sau.',
        },
      ],
      suggestions: ['Làm sao để xin xác nhận của giảng viên?'],
    },
  ];

  const defaultMockHook = {
    messages: mockInitialMessages,
    isThinking: false,
    error: null,
    sendMessage: jest.fn(),
    resetChat: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAcademicAdvisor as jest.Mock).mockReturnValue(defaultMockHook);
  });

  test('TC-ST07-01: Renders AI header with title, status, and reset button', () => {
    const html = renderToStaticMarkup(<AiAdvisorScreen />);

    expect(html).toContain('Cố vấn Học vụ AI');
    expect(html).toContain('Trực tuyến • Gemini 2.5 Flash');
    expect(html).toContain('reset-chat-button');
  });

  test('TC-ST07-02: Renders initial welcome message and starter prompt suggestions', () => {
    const html = renderToStaticMarkup(<AiAdvisorScreen />);

    expect(html).toContain('Xin chào! Tôi là Cố vấn Học vụ AI của Rikkei EduPortal');
    expect(html).toContain('Tư vấn chọn môn cho học kỳ tới');
    expect(html).toContain('Quy chế giới hạn tối đa 24 tín chỉ');
  });

  test('TC-ST07-03: Renders user question and AI response bubble', () => {
    (useAcademicAdvisor as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      messages: mockConversationMessages,
    });

    const html = renderToStaticMarkup(<AiAdvisorScreen />);

    expect(html).toContain('Em muốn hỏi về quy chế trùng thời khóa biểu?');
    expect(html).toContain('Theo Quy chế đào tạo Rikkei Academy');
  });

  test('TC-ST07-04: Displays fallback mode badge when rule-based engine is engaged', () => {
    (useAcademicAdvisor as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      messages: mockConversationMessages,
    });

    const html = renderToStaticMarkup(<AiAdvisorScreen />);

    expect(html).toContain('Quy chế dự phòng');
  });

  test('TC-ST07-05: Renders course recommendations card inside AI message', () => {
    (useAcademicAdvisor as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      messages: mockConversationMessages,
    });

    const html = renderToStaticMarkup(<AiAdvisorScreen />);

    expect(html).toContain('Môn học khuyến nghị:');
    expect(html).toContain('CS301');
    expect(html).toContain('Lập trình Web chuyên sâu');
    expect(html).toContain('3 Tín chỉ');
    expect(html).toContain('Ưu tiên cao');
    expect(html).toContain('Môn tiên quyết cho Đồ án tốt nghiệp kỳ sau.');
  });

  test('TC-ST07-06: Renders suggested follow-up questions under AI response', () => {
    (useAcademicAdvisor as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      messages: mockConversationMessages,
    });

    const html = renderToStaticMarkup(<AiAdvisorScreen />);

    expect(html).toContain('Làm sao để xin xác nhận của giảng viên?');
  });

  test('TC-ST07-07: Renders thinking indicator bubble when AI is generating answer', () => {
    (useAcademicAdvisor as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      isThinking: true,
    });

    const html = renderToStaticMarkup(<AiAdvisorScreen />);

    expect(html).toContain('Cố vấn AI đang phân tích dữ liệu học vụ...');
  });

  test('TC-ST07-08: Renders chat input box and send button', () => {
    const html = renderToStaticMarkup(<AiAdvisorScreen />);

    expect(html).toContain('Hỏi quy chế, môn học, trùng lịch...');
    expect(html).toContain('ai-chat-send-btn');
  });
});
