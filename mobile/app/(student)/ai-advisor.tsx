/**
 * AI Academic Advisor Native Screen (TASK ST-07)
 * Live chat interface integrating POST /api/v1/ai/academic-advisor,
 * suggested prompts, course recommendation cards, and fallback mode indication.
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
            onPress={() => router.canGoBack() ? router.back() : router.push('/(student)/dashboard')}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Quay lại Tổng quan"
            testID="ai-advisor-back-btn"
          >
            <Ionicons name="chevron-back" size={22} color={colors.neutral[800]} />
          </Pressable>
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={18} color={colors.primary[800]} />
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
          style={styles.resetButton}
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
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onSelectSuggestion={handleSelectSuggestion}
          />
        ))}

        {/* Thinking Indicator Bubble */}
        {isThinking ? (
          <View style={styles.thinkingBubble} testID="ai-thinking-indicator">
            <ActivityIndicator size="small" color={colors.primary[800]} />
            <Text style={styles.thinkingText}>Cố vấn AI đang phân tích dữ liệu học vụ...</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Quick Prompts Carousel (when idle) */}
      {!isThinking && messages.length <= 2 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.starterPromptsContainer}
          style={styles.starterPromptsBar}
        >
          {STARTER_PROMPTS.map((prompt, idx) => (
            <Pressable
              key={idx}
              style={styles.starterChip}
              onPress={() => handleSelectSuggestion(prompt)}
              accessibilityRole="button"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.primary[800]} />
              <Text style={styles.starterChipText}>{prompt}</Text>
            </Pressable>
          ))}
        </ScrollView>
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
            size={18}
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
  onSelectSuggestion: (s: string) => void;
}> = ({ message, onSelectSuggestion }) => {
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
          <Ionicons name="sparkles" size={14} color={colors.primary[800]} />
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
            <Ionicons name="shield-outline" size={12} color={colors.warning.dark} />
            <Text style={styles.fallbackBadgeText}>Quy chế dự phòng</Text>
          </View>
        ) : null}

        {/* Message Text Content */}
        <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>

        {/* Course Recommendations */}
        {message.recommendations && message.recommendations.length > 0 ? (
          <View style={styles.recommendationsBox} testID="ai-course-recommendations">
            <Text style={styles.recBoxTitle}>Môn học khuyến nghị:</Text>
            {message.recommendations.map((rec, idx) => (
              <RecommendationCard key={idx} recommendation={rec} />
            ))}
          </View>
        ) : null}

        {/* Suggested Follow-up Questions */}
        {message.suggestions && message.suggestions.length > 0 ? (
          <View style={styles.suggestionsContainer}>
            {message.suggestions.map((s, idx) => (
              <Pressable
                key={idx}
                style={styles.suggestionPill}
                onPress={() => onSelectSuggestion(s)}
                accessibilityRole="button"
              >
                <Ionicons name="arrow-forward" size={11} color={colors.primary[800]} />
                <Text style={styles.suggestionPillText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
};

/**
 * Course Recommendation Sub-Card
 */
const RecommendationCard: React.FC<{ recommendation: CourseRecommendationItem }> = ({
  recommendation,
}) => {
  const isHighPriority = recommendation.priority === 'HIGH';

  return (
    <View style={styles.recCard}>
      <View style={styles.recTopRow}>
        <Text style={styles.recCode}>{recommendation.courseCode}</Text>
        <View
          style={[
            styles.recPriorityBadge,
            isHighPriority ? styles.priorityHigh : styles.priorityMedium,
          ]}
        >
          <Text
            style={[
              styles.recPriorityText,
              isHighPriority ? styles.priorityHighText : styles.priorityMediumText,
            ]}
          >
            {isHighPriority ? 'Ưu tiên cao' : 'Khuyến nghị'}
          </Text>
        </View>
      </View>
      <Text style={styles.recName}>{recommendation.courseName}</Text>
      <Text style={styles.recCredits}>{recommendation.credits} Tín chỉ</Text>
      {recommendation.reason ? (
        <Text style={styles.recReason}>{recommendation.reason}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  topBar: {
    height: 60,
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
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
  backButton: {
    marginRight: 6,
    padding: 4,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success.dark,
  },
  statusText: {
    fontSize: 10,
    color: colors.neutral[500],
  },
  resetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.xs,
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
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubbleContainer: {
    maxWidth: '85%',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  userBubble: {
    backgroundColor: colors.primary[800],
    borderBottomRightRadius: 4,
    ...shadows.sm,
  },
  assistantBubble: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  bubbleText: {
    fontSize: typography.sizes.xs,
    lineHeight: 20,
  },
  userText: {
    color: colors.neutral[0],
  },
  assistantText: {
    color: colors.neutral[800],
  },
  fallbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warning.light,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  fallbackBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.warning.dark,
  },
  recommendationsBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  recBoxTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.neutral[700],
    marginBottom: 4,
  },
  recCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  recTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recCode: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
  },
  recPriorityBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  priorityHigh: {
    backgroundColor: colors.error.light,
  },
  priorityMedium: {
    backgroundColor: colors.primary[50],
  },
  recPriorityText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
  },
  priorityHighText: {
    color: colors.error.dark,
  },
  priorityMediumText: {
    color: colors.primary[800],
  },
  recName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[900],
    marginTop: 2,
  },
  recCredits: {
    fontSize: 10,
    color: colors.neutral[500],
    marginTop: 1,
  },
  recReason: {
    fontSize: 10,
    color: colors.neutral[600],
    marginTop: 2,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    marginTop: spacing.sm,
    gap: 4,
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  suggestionPillText: {
    fontSize: 11,
    color: colors.primary[800],
    fontWeight: typography.weights.medium,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.neutral[0],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignSelf: 'flex-start',
    marginLeft: 36,
  },
  thinkingText: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
  },
  starterPromptsBar: {
    maxHeight: 44,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  starterPromptsContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: spacing.xs,
    alignItems: 'center',
  },
  starterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  starterChipText: {
    fontSize: 11,
    color: colors.neutral[700],
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    gap: spacing.xs,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: typography.sizes.xs,
    color: colors.neutral[900],
    maxHeight: 80,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[800],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.neutral[100],
  },
});
