package com.rikkei.eduportal.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.ai.config.AiConfig;
import com.rikkei.eduportal.ai.dto.GenerateSyllabusRequest;
import com.rikkei.eduportal.ai.dto.GenerateSyllabusResponse;
import com.rikkei.eduportal.ai.dto.LearningOutcomeDto;
import com.rikkei.eduportal.ai.dto.WeeklyTopicDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.*;

@Service
public class SyllabusServiceImpl implements SyllabusService {

    private static final Logger log = LoggerFactory.getLogger(SyllabusServiceImpl.class);

    private final ChatClient chatClient;
    private final AiConfig aiConfig;
    private final SyllabusPromptBuilder promptBuilder;
    private final SyllabusFallbackService fallbackService;
    private final ObjectMapper objectMapper;
    private final ExecutorService executorService;

    public SyllabusServiceImpl(ChatClient chatClient,
                               AiConfig aiConfig,
                               SyllabusPromptBuilder promptBuilder,
                               SyllabusFallbackService fallbackService,
                               ObjectMapper objectMapper) {
        this.chatClient = chatClient;
        this.aiConfig = aiConfig;
        this.promptBuilder = promptBuilder;
        this.fallbackService = fallbackService;
        this.objectMapper = objectMapper;
        this.executorService = Executors.newVirtualThreadPerTaskExecutor();
    }

    @Override
    public GenerateSyllabusResponse generateSyllabus(GenerateSyllabusRequest request) {
        log.info("Received syllabus generation request: course='{}', credits={}, reqs='{}'",
                request.getCourseName(), request.getCredits(), request.getRequirements());

        // Step 1: Check if live AI credentials are ready
        if (!aiConfig.isConfiguredWithRealKey()) {
            log.warn("AI API key is set to demo/unconfigured. Activating intelligent heuristic fallback.");
            return fallbackService.generateFallback(request, "Chế độ dev/mock (Chưa cấu hình API Key thực)");
        }

        // Step 2: Build prompts
        String systemPrompt = promptBuilder.buildSystemPrompt();
        String userPrompt = promptBuilder.buildUserPrompt(request);

        // Step 3: Execute AI Call with Timeout & Fallback
        int timeout = aiConfig.getTimeoutSeconds();
        try {
            Future<String> future = executorService.submit(() -> {
                log.debug("Dispatching request to Spring AI ChatClient (model={})...", aiConfig.getEffectiveModel());
                return chatClient.prompt()
                        .system(systemPrompt)
                        .user(userPrompt)
                        .call()
                        .content();
            });

            String rawContent = future.get(timeout, TimeUnit.SECONDS);

            if (rawContent == null || rawContent.isBlank()) {
                log.warn("Received empty response from AI model. Triggering fallback.");
                return fallbackService.generateFallback(request, "Mô hình AI trả về nội dung rỗng");
            }

            // Step 4: Parse structured JSON
            String jsonPayload = extractJsonPayload(rawContent);
            GenerateSyllabusResponse response = objectMapper.readValue(jsonPayload, GenerateSyllabusResponse.class);

            // Populate metadata
            if (response.getCourseName() == null || response.getCourseName().isBlank()) {
                response.setCourseName(request.getCourseName());
            }
            if (response.getCredits() == null || response.getCredits() <= 0) {
                response.setCredits(request.getCredits());
            }
            response.setProvider(aiConfig.getProvider());
            response.setModel(aiConfig.getEffectiveModel());
            response.setFallbackUsed(false);
            response.setGeneratedAt(LocalDateTime.now());

            // Ensure formatted syllabus string is present for UI display
            if (response.getSyllabus() == null || response.getSyllabus().isBlank()) {
                response.setSyllabus(formatMarkdownSyllabus(response));
            }

            log.info("Successfully generated AI syllabus for '{}' via {}", response.getCourseName(), aiConfig.getEffectiveModel());
            return response;

        } catch (TimeoutException te) {
            log.error("AI Syllabus generation timed out after {}s for course '{}'. Invoking fallback.",
                    timeout, request.getCourseName());
            return fallbackService.generateFallback(request, "AI timeout sau " + timeout + " giây");
        } catch (Exception ex) {
            log.error("AI Syllabus generation encountered an issue: {}. Invoking fallback.", ex.getMessage(), ex);
            return fallbackService.generateFallback(request, "AI error: " + ex.getMessage());
        }
    }

    private String extractJsonPayload(String raw) {
        String cleaned = raw.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        cleaned = cleaned.trim();

        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        if (start != -1 && end != -1 && end > start) {
            return cleaned.substring(start, end + 1);
        }
        return cleaned;
    }

    private String formatMarkdownSyllabus(GenerateSyllabusResponse res) {
        StringBuilder sb = new StringBuilder();
        sb.append("# ĐỀ CƯƠNG CHI TIẾT HỌC PHẦN (SYLLABUS)\n");
        sb.append("## ").append(res.getCourseCode() != null ? res.getCourseCode() : "CS000")
          .append(" - ").append(res.getCourseName()).append("\n\n");
        sb.append("> **Số tín chỉ**: ").append(res.getCredits()).append(" TC | **Số giờ học/tuần**: ")
          .append(res.getWeeklyHours() != null ? res.getWeeklyHours() : res.getCredits() + 1).append(" giờ\n\n");

        if (res.getOverview() != null) {
            sb.append("### 1. Mô tả Tổng quan Học phần\n").append(res.getOverview()).append("\n\n");
        }

        if (res.getLearningOutcomes() != null && !res.getLearningOutcomes().isEmpty()) {
            sb.append("### 2. Chuẩn đầu ra Học phần (CLOs)\n");
            for (LearningOutcomeDto clo : res.getLearningOutcomes()) {
                sb.append("- **[").append(clo.getCode()).append("]** (").append(clo.getBloomLevel()).append("): ")
                  .append(clo.getDescription()).append("\n");
            }
            sb.append("\n");
        }

        if (res.getAssessmentScheme() != null) {
            sb.append("### 3. Phân bổ Đánh giá Kết quả Học tập\n");
            sb.append("- **Chuyên cần**: ").append(res.getAssessmentScheme().getAttendanceRate()).append("%\n");
            sb.append("- **Giữa kỳ**: ").append(res.getAssessmentScheme().getMidtermRate()).append("%\n");
            sb.append("- **Cuối kỳ**: ").append(res.getAssessmentScheme().getFinalRate()).append("%\n\n");
        }

        if (res.getWeeklyTopics() != null && !res.getWeeklyTopics().isEmpty()) {
            sb.append("### 4. Kế hoạch Giảng dạy và Học tập Từng tuần\n");
            for (WeeklyTopicDto w : res.getWeeklyTopics()) {
                sb.append("**Tuần ").append(w.getWeek()).append(": ").append(w.getTopic()).append("**\n");
                sb.append("- *Nội dung*: ").append(w.getContents()).append("\n");
                sb.append("- *Phương pháp & Đánh giá*: ").append(w.getTeachingMethod()).append(" | ").append(w.getAssessment()).append("\n\n");
            }
        }

        if (res.getTextbooks() != null && !res.getTextbooks().isEmpty()) {
            sb.append("### 5. Giáo trình và Tài liệu Tham khảo\n");
            for (String tb : res.getTextbooks()) {
                sb.append("- ").append(tb).append("\n");
            }
        }

        return sb.toString();
    }
}
