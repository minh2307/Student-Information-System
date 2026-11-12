package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.client.EnrollmentServiceClient;
import com.rikkei.eduportal.ai.config.AiConfig;
import com.rikkei.eduportal.ai.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.*;

@Service
public class AcademicAdvisorServiceImpl implements AcademicAdvisorService {

    private static final Logger log = LoggerFactory.getLogger(AcademicAdvisorServiceImpl.class);

    private final ChatClient chatClient;
    private final AiConfig aiConfig;
    private final AdvisorPromptBuilder promptBuilder;
    private final AdvisorFallbackService fallbackService;
    private final AcademicKnowledgeBase knowledgeBase;
    private final EnrollmentServiceClient enrollmentClient;
    private final ExecutorService executorService;

    @Autowired
    public AcademicAdvisorServiceImpl(ChatClient chatClient,
                                      AiConfig aiConfig,
                                      AdvisorPromptBuilder promptBuilder,
                                      AdvisorFallbackService fallbackService,
                                      AcademicKnowledgeBase knowledgeBase,
                                      EnrollmentServiceClient enrollmentClient) {
        this(chatClient, aiConfig, promptBuilder, fallbackService, knowledgeBase, enrollmentClient,
                Executors.newVirtualThreadPerTaskExecutor());
    }

    AcademicAdvisorServiceImpl(ChatClient chatClient,
                               AiConfig aiConfig,
                               AdvisorPromptBuilder promptBuilder,
                               AdvisorFallbackService fallbackService,
                               AcademicKnowledgeBase knowledgeBase,
                               EnrollmentServiceClient enrollmentClient,
                               ExecutorService executorService) {
        this.chatClient = chatClient;
        this.aiConfig = aiConfig;
        this.promptBuilder = promptBuilder;
        this.fallbackService = fallbackService;
        this.knowledgeBase = knowledgeBase;
        this.enrollmentClient = enrollmentClient;
        this.executorService = executorService;
    }

    @Override
    public AcademicAdvisorResponse advise(AcademicAdvisorRequest request) {
        return advise(request, request.getStudentCode(), null);
    }

    @Override
    public AcademicAdvisorResponse advise(AcademicAdvisorRequest request, String authenticatedStudent, String authToken) {
        long startTime = System.currentTimeMillis();

        // 1. Resolve student identity from security context
        String studentIdentifier = (authenticatedStudent != null && !authenticatedStudent.isBlank())
                ? authenticatedStudent.trim()
                : (request.getStudentCode() != null && !request.getStudentCode().isBlank()
                    ? request.getStudentCode().trim() : "sv2024001");

        // Force request studentCode to match authenticated identity to prevent spoofing
        request.setStudentCode(studentIdentifier);

        log.info("Received Academic Advisor request for student='{}': '{}'",
                studentIdentifier, request.getMessage());

        // 2. Fetch real academic records from enrollment-service
        Optional<StudentAcademicContextDto> contextOpt = enrollmentClient.fetchAcademicContext(authToken, studentIdentifier);
        StudentAcademicContextDto context = contextOpt.orElse(null);

        boolean enrollmentAvailable = (context != null);
        boolean geminiConfigured = aiConfig.isConfiguredWithRealKey();

        log.info("Advisor diagnostic: student='{}', enrollmentAvailable={}, geminiConfigured={}",
                studentIdentifier, enrollmentAvailable, geminiConfigured);

        // 3. Check live Gemini credentials
        if (!geminiConfigured) {
            log.warn("GEMINI_FALLBACK: Gemini API key not configured or set to demo-key. Activating deterministic advisor fallback.");
            return fallbackService.generateFallback(request, context, "Chế độ dev/mock: Chưa cấu hình GEMINI_API_KEY thực");
        }

        // 4. Build Prompts with Real Student Academic Data
        String systemPrompt = promptBuilder.buildSystemPrompt();
        String userPrompt = promptBuilder.buildUserPrompt(request, context);

        // 5. Execute Gemini AI Call with Timeout & Bounded Fallback
        int timeout = aiConfig.getTimeoutSeconds();
        Future<String> future = null;
        try {
            future = executorService.submit(() -> {
                log.debug("Dispatching academic question to Gemini (model={}, baseUrl={})...",
                        aiConfig.getEffectiveModel(), aiConfig.getEffectiveBaseUrl());
                return chatClient.prompt()
                        .system(systemPrompt)
                        .user(userPrompt)
                        .call()
                        .content();
            });

            String reply = future.get(timeout, TimeUnit.SECONDS);

            if (reply == null || reply.isBlank()) {
                log.warn("GEMINI_FALLBACK: Received empty response from Gemini model. Triggering fallback.");
                return fallbackService.generateFallback(request, context, "Gemini phản hồi nội dung rỗng");
            }

            AcademicAdvisorResponse response = new AcademicAdvisorResponse();
            response.setReply(reply.trim());
            response.setCategory(fallbackService.detectCategory(request.getMessage()));
            response.setMode(enrollmentAvailable ? "GEMINI" : "LIMITED");
            response.setSuggestions(knowledgeBase.getDefaultSuggestions());
            response.setProvider(aiConfig.getProvider());
            response.setModel(aiConfig.getEffectiveModel());
            response.setFallbackUsed(false);
            response.setTimestamp(LocalDateTime.now());

            if (context != null) {
                response.setAcademicSummary(context.toSummary());
                response.setRecommendations(buildCourseRecommendations(context));
            } else {
                response.setLimitations(List.of("Không thể kết nối đến Enrollment Service để truy xuất hồ sơ học tập cá nhân."));
            }

            long latencyMs = System.currentTimeMillis() - startTime;
            log.info("GEMINI_SUCCESS: Successfully generated academic advice for student='{}' via {} in {}ms",
                    studentIdentifier, aiConfig.getEffectiveModel(), latencyMs);
            return response;

        } catch (TimeoutException te) {
            if (future != null) {
                future.cancel(true);
            }
            long latencyMs = System.currentTimeMillis() - startTime;
            log.error("GEMINI_FALLBACK: Academic Advisor call timed out after {}ms (limit: {}s). Invoking fallback.",
                    latencyMs, timeout);
            return fallbackService.generateFallback(request, context, "Gemini timeout sau " + timeout + " giây");
        } catch (InterruptedException ie) {
            if (future != null) {
                future.cancel(true);
            }
            Thread.currentThread().interrupt();
            long latencyMs = System.currentTimeMillis() - startTime;
            log.error("GEMINI_FALLBACK: Academic Advisor call was interrupted after {}ms: {}. Invoking fallback.",
                    latencyMs, ie.getMessage());
            return fallbackService.generateFallback(request, context, "Gemini call bị gián đoạn: " + ie.getMessage());
        } catch (Exception ex) {
            long latencyMs = System.currentTimeMillis() - startTime;
            log.error("GEMINI_FALLBACK: Gemini call encountered error after {}ms: {}. Invoking fallback.",
                    latencyMs, ex.getMessage());
            return fallbackService.generateFallback(request, context, "Gemini error: " + ex.getMessage());
        }
    }

    private List<CourseRecommendationDto> buildCourseRecommendations(StudentAcademicContextDto context) {
        List<CourseRecommendationDto> recommendations = new ArrayList<>();
        if (context == null) return recommendations;

        // 1. Highest priority: Retake failed courses to avoid prerequisite chain blocking and restore C-GPA
        if (context.getFailedCourses() != null) {
            for (FailedCourseDto failed : context.getFailedCourses()) {
                recommendations.add(new CourseRecommendationDto(
                        failed.getCourseCode(),
                        failed.getCourseName(),
                        failed.getCredits(),
                        "Môn học bị nợ/trượt (Điểm F). Cần ưu tiên đăng ký học lại sớm nhất để cải thiện điểm C-GPA và mở khóa môn tiên quyết.",
                        true,
                        true,
                        "HIGH"
                ));
            }
        }

        // 2. Eligible open courses matching prerequisite criteria
        if (context.getAvailableCourses() != null) {
            for (AvailableCourseDto av : context.getAvailableCourses()) {
                // Avoid duplicating if already added from failed list
                boolean alreadyAdded = recommendations.stream()
                        .anyMatch(r -> r.getCourseCode().equalsIgnoreCase(av.getCourseCode()));
                if (alreadyAdded) continue;

                if (Boolean.TRUE.equals(av.getPrerequisiteSatisfied())
                        && !Boolean.TRUE.equals(av.getAlreadyCompleted())
                        && !Boolean.TRUE.equals(av.getCurrentlyEnrolled())) {

                    String priority = Boolean.TRUE.equals(av.getHasScheduleConflict()) ? "MEDIUM" : "HIGH";
                    String reason;
                    if (av.getPrerequisiteCourseCode() != null) {
                        reason = "Đã hoàn thành môn tiên quyết " + av.getPrerequisiteCourseCode()
                                + " (" + (av.getPrerequisiteCourseName() != null ? av.getPrerequisiteCourseName() : "") + "). Môn mở lớp trong kỳ và phù hợp lộ trình ngành " + context.getMajor() + ".";
                    } else {
                        reason = "Môn học nền tảng không yêu cầu tiên quyết, phù hợp tích lũy trong học kỳ tiếp theo.";
                    }

                    if (Boolean.TRUE.equals(av.getHasScheduleConflict())) {
                        reason += " [Lưu ý: Có Section trùng lịch học hiện tại, hãy chọn Section khác].";
                    }

                    recommendations.add(new CourseRecommendationDto(
                            av.getCourseCode(),
                            av.getCourseName(),
                            av.getCredits(),
                            reason,
                            true,
                            true,
                            priority
                    ));
                }
            }
        }
        return recommendations;
    }
}
