/**
 * AI Academic Advisor Native Screen (TASK ST-07)
 * Professional, clean chat interface integrating POST /api/v1/ai/academic-advisor.
 * Features:
 * - Rich formatted AI message parsing (Headings, Alert Callouts, Bold, Inline Code, Bullets)
 * - Compact horizontal course recommendation carousel (no vertical card clutter)
 * - Tidy suggestion chips with soft aesthetic tint
 * - Clean header with back navigation and live status dot
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { useAcademicAdvisor, STARTER_PROMPTS } from '@/features/student/hooks/useAcademicAdvisor';
import { ChatMessage, CourseRecommendationItem } from '@/features/student/types';

export default function AiAdvisorScreen() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<any>(null);

  const {
    messages,
    isThinking,
    sendMessage,
    resetChat,
  } = useAcademicAdvisor();

  // Extract active suggestions from the latest AI message or default prompts (Web-Parity)
  const latestAiMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const activeSuggestions =
    latestAiMsg?.suggestions && latestAiMsg.suggestions.length > 0
      ? latestAiMsg.suggestions
      : STARTER_PROMPTS;

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isThinking) return;
    setInputText('');
    sendMessage(text);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSelectSuggestion = (prompt: string) => {
    if (isThinking) return;
    sendMessage(prompt);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screenWrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      testID="ai-advisor-screen"
    >
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.push('/(student)/dashboard'))}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Quay lại Tổng quan"
            testID="ai-advisor-back-btn"
          >
            <Ionicons name="chevron-back" size={20} color={colors.neutral[800]} />
          </Pressable>

          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={17} color="#7C3AED" />
          </View>

          <View>
            <Text style={styles.topBarTitle}>Cố vấn Học vụ AI</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>Trực tuyến • Gemini 2.5 Flash</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          onPress={resetChat}
          accessibilityRole="button"
          accessibilityLabel="Làm mới đoạn hội thoại"
          testID="reset-chat-button"
        >
          <Ionicons name="refresh-outline" size={18} color={colors.neutral[600]} />
        </Pressable>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
          />
        ))}

        {/* Thinking Indicator Bubble */}
        {isThinking ? (
          <View style={styles.thinkingBubble} testID="ai-thinking-indicator">
            <ActivityIndicator size="small" color="#7C3AED" />
            <Text style={styles.thinkingText}>Cố vấn AI đang phân tích dữ liệu học vụ...</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Quick Suggestions Chips Bar (Web-Parity, pinned above input) */}
      {!isThinking && activeSuggestions && activeSuggestions.length > 0 ? (
        <View style={styles.webSuggestionsBar} testID="ai-suggestions-bar">
          <View style={styles.webSuggestionsHeader}>
            <Ionicons name="sparkles" size={13} color="#D97706" />
            <Text style={styles.webSuggestionsLabel}>Gợi ý:</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.webSuggestionsScroll}
          >
            {activeSuggestions.slice(0, 4).map((suggestion, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [
                  styles.webSuggestionPill,
                  pressed && styles.webSuggestionPillPressed,
                ]}
                onPress={() => handleSelectSuggestion(suggestion)}
                accessibilityRole="button"
                accessibilityLabel={`Gợi ý: ${suggestion}`}
              >
                <Text style={styles.webSuggestionText}>{suggestion}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Hỏi quy chế, môn học, trùng lịch..."
          placeholderTextColor={colors.neutral[400]}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          testID="ai-chat-input"
        />

        <Pressable
          style={[
            styles.sendButton,
            (!inputText.trim() || isThinking) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isThinking}
          accessibilityRole="button"
          accessibilityLabel="Gửi câu hỏi"
          testID="ai-chat-send-btn"
        >
          <Ionicons
            name="send"
            size={16}
            color={!inputText.trim() || isThinking ? colors.neutral[400] : colors.neutral[0]}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Message Bubble Component
 */
const MessageBubble: React.FC<{
  message: ChatMessage;
}> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.userBubbleRow : styles.assistantBubbleRow,
      ]}
      testID={`chat-message-${message.id}`}
    >
      {!isUser ? (
        <View style={styles.assistantAvatar}>
          <Ionicons name="sparkles" size={13} color="#7C3AED" />
        </View>
      ) : null}

      <View
        style={[
          styles.bubbleContainer,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {/* Fallback Mode Indicator Badge */}
        {message.fallbackUsed ? (
          <View style={styles.fallbackBadge} testID="fallback-mode-badge">
            <Ionicons name="shield-checkmark-outline" size={11} color="#B45309" />
            <Text style={styles.fallbackBadgeText}>Quy chế dự phòng</Text>
          </View>
        ) : null}

        {/* Message Content with Clean Rich Text Formatting */}
        <FormattedAiMessage content={message.content} isUser={isUser} />

        {/* Course Recommendations Horizontal Carousel */}
        {message.recommendations && message.recommendations.length > 0 ? (
          <CourseRecommendationsSection recommendations={message.recommendations} />
        ) : null}
      </View>
    </View>
  );
};

/**
 * Rich Formatted AI Message Renderer
 * Converts Markdown Headings (###), Alert Blocks (>), Bullet Lists (-),
 * Numbered steps (1.), Bold (**), and Inline Code (`) into clean native styled elements.
 */
const FormattedAiMessage: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (isUser) {
    return <Text style={styles.userText}>{content}</Text>;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      continue;
    }

    // 1. Alert Blockquote (> ℹ️... or > ⚠️...)
    if (trimmed.startsWith('>')) {
      const cleanAlert = trimmed.replace(/^>\s*/, '').replace(/^[ℹ️⚠️💡]+\s*/, '');
      elements.push(
        <View key={`alert-${idx++}`} style={styles.alertCard}>
          <Ionicons name="information-circle" size={16} color="#0284C7" style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertText}>{renderInlineFormatted(cleanAlert)}</Text>
          </View>
        </View>
      );
      continue;
    }

    // 2. Headings (### or ## or #)
    if (trimmed.startsWith('#')) {
      const cleanHeading = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <View key={`heading-${idx++}`} style={styles.headingWrapper}>
          <Text style={styles.headingText}>{renderInlineFormatted(cleanHeading)}</Text>
        </View>
      );
      continue;
    }

    // 3. Bullet points (- or * )
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const cleanBullet = trimmed.substring(2);
      elements.push(
        <View key={`bullet-${idx++}`} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{renderInlineFormatted(cleanBullet)}</Text>
        </View>
      );
      continue;
    }

    // 4. Numbered list items (1. , 2. )
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <View key={`num-${idx++}`} style={styles.numberedRow}>
          <View style={styles.numberBadge}>
            <Text style={styles.numberBadgeText}>{numMatch[1]}</Text>
          </View>
          <Text style={styles.numberedText}>{renderInlineFormatted(numMatch[2])}</Text>
        </View>
      );
      continue;
    }

    // 5. Normal text paragraph
    elements.push(
      <Text key={`p-${idx++}`} style={styles.paragraphText}>
        {renderInlineFormatted(trimmed)}
      </Text>
    );
  }

  return <View style={styles.formattedContainer}>{elements}</View>;
};

/**
 * Inline Tokenizer for **bold** and `code`
 */
function renderInlineFormatted(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <Text key={pIdx} style={styles.boldText}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <Text key={pIdx} style={styles.inlineCode}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return part;
  });
}

/**
 * Course Recommendations Horizontal Carousel
 */
const CourseRecommendationsSection: React.FC<{
  recommendations: CourseRecommendationItem[];
}> = ({ recommendations }) => {
  return (
    <View style={styles.recSection} testID="ai-course-recommendations">
      <View style={styles.recHeaderRow}>
        <Ionicons name="school" size={14} color="#7C3AED" />
        <Text style={styles.recHeaderTitle}>Môn học khuyến nghị:</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recCarouselContainer}
      >
        {recommendations.map((rec, idx) => (
          <RecommendationCompactCard key={idx} recommendation={rec} />
        ))}
      </ScrollView>
    </View>
  );
};

/**
 * Compact Recommendation Card
 */
const RecommendationCompactCard: React.FC<{ recommendation: CourseRecommendationItem }> = ({
  recommendation,
}) => {
  const isHighPriority = recommendation.priority === 'HIGH';

  return (
    <View style={styles.compactRecCard}>
      <View style={styles.compactRecTop}>
        <Text style={styles.compactRecCode}>{recommendation.courseCode}</Text>
        <View
          style={[
            styles.priorityBadge,
            isHighPriority ? styles.priorityBadgeHigh : styles.priorityBadgeMedium,
          ]}
        >
          <Text
            style={[
              styles.priorityText,
              isHighPriority ? styles.priorityTextHigh : styles.priorityTextMedium,
            ]}
          >
            {isHighPriority ? 'Ưu tiên cao' : 'Khuyến nghị'}
          </Text>
        </View>
      </View>

      <Text style={styles.compactRecName} numberOfLines={2}>
        {recommendation.courseName}
      </Text>

      <View style={styles.compactRecBottom}>
        <Text style={styles.compactRecCredits}>{recommendation.credits} Tín chỉ</Text>
      </View>

      {recommendation.reason ? (
        <Text style={styles.compactRecReason} numberOfLines={2}>
          {recommendation.reason}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  iconBtnPressed: {
    backgroundColor: '#E2E8F0',
  },
  aiAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    gap: 8,
  },
  userBubbleRow: {
    justifyContent: 'flex-end',
  },
  assistantBubbleRow: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubbleContainer: {
    maxWidth: '86%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: '#881337',
    borderBottomRightRadius: 4,
    ...shadows.sm,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  userText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  formattedContainer: {
    gap: 6,
  },
  paragraphText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1E293B',
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  inlineCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#7C3AED',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
    padding: 8,
    borderRadius: 6,
    marginVertical: 4,
  },
  alertText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#0369A1',
  },
  headingWrapper: {
    marginTop: 8,
    marginBottom: 2,
  },
  headingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 2,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#7C3AED',
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
  },
  numberedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 2,
  },
  numberBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  numberBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },
  numberedText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
  },
  fallbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  fallbackBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  recSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  recHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  recCarouselContainer: {
    gap: 8,
    paddingRight: 8,
  },
  compactRecCard: {
    width: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  compactRecTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactRecCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  priorityBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  priorityBadgeHigh: {
    backgroundColor: '#FEE2E2',
  },
  priorityBadgeMedium: {
    backgroundColor: '#E0E7FF',
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '700',
  },
  priorityTextHigh: {
    color: '#B91C1C',
  },
  priorityTextMedium: {
    color: '#3730A3',
  },
  compactRecName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
    lineHeight: 15,
  },
  compactRecBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactRecCredits: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  compactRecReason: {
    fontSize: 9,
    color: '#64748B',
    lineHeight: 13,
  },
  suggestionsContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  suggestionsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  webSuggestionsBar: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  webSuggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 4,
  },
  webSuggestionsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  webSuggestionsScroll: {
    gap: 6,
    paddingRight: 10,
    alignItems: 'center',
  },
  webSuggestionPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    ...shadows.sm,
  },
  webSuggestionPillPressed: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  webSuggestionText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
    marginLeft: 36,
    ...shadows.sm,
  },
  thinkingText: {
    fontSize: 11,
    color: '#64748B',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    maxHeight: 90,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#881337',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
});
