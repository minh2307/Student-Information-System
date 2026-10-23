package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.config.AiConfig;
import com.rikkei.eduportal.ai.dto.AcademicAdvisorRequest;
import com.rikkei.eduportal.ai.dto.AcademicAdvisorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.*;

@Service
public class AcademicAdvisorServiceImpl implements AcademicAdvisorService {

    private static final Logger log = LoggerFactory.getLogger(AcademicAdvisorServiceImpl.class);

    private final ChatClient chatClient;
    private final AiConfig aiConfig;
    private final AdvisorPromptBuilder promptBuilder;
    private final AdvisorFallbackService fallbackService;
    private final AcademicKnowledgeBase knowledgeBase;
    private final ExecutorService executorService;

    public AcademicAdvisorServiceImpl(ChatClient chatClient,
                                      AiConfig aiConfig,
                                      AdvisorPromptBuilder promptBuilder,
                                      AdvisorFallbackService fallbackService,
                                      AcademicKnowledgeBase knowledgeBase) {
        this.chatClient = chatClient;
        this.aiConfig = aiConfig;
        this.promptBuilder = promptBuilder;
        this.fallbackService = fallbackService;
        this.knowledgeBase = knowledgeBase;
        this.executorService = Executors.newVirtualThreadPerTaskExecutor();
    }

    @Override
    public AcademicAdvisorResponse advise(AcademicAdvisorRequest request) {
        log.info("Received Academic Advisor question from student={}: '{}'",
                request.getStudentCode(), request.getMessage());

        // Step 1: Check live AI credentials
        if (!aiConfig.isConfiguredWithRealKey()) {
            log.warn("AI API key is set to demo/unconfigured. Activating rule-based advisor fallback.");
            return fallbackService.generateFallback(request, "Chế độ dev/mock (Chưa cấu hình API Key thực)");
        }

        // Step 2: Build prompts
        String systemPrompt = promptBuilder.buildSystemPrompt();
        String userPrompt = promptBuilder.buildUserPrompt(request);

        // Step 3: Execute AI Call with Timeout & Fallback
        int timeout = aiConfig.getTimeoutSeconds();
        try {
            Future<String> future = executorService.submit(() -> {
                log.debug("Dispatching question to Spring AI ChatClient (model={})...", aiConfig.getEffectiveModel());
                return chatClient.prompt()
                        .system(systemPrompt)
                        .user(userPrompt)
                        .call()
                        .content();
            });

            String reply = future.get(timeout, TimeUnit.SECONDS);

            if (reply == null || reply.isBlank()) {
                log.warn("Received empty response from AI model. Triggering fallback.");
                return fallbackService.generateFallback(request, "Mô hình AI phản hồi rỗng");
            }

            AcademicAdvisorResponse response = new AcademicAdvisorResponse();
            response.setReply(reply.trim());
            response.setCategory("AI_ADVISOR");
            response.setSuggestions(knowledgeBase.getDefaultSuggestions());
            response.setProvider(aiConfig.getProvider());
            response.setModel(aiConfig.getEffectiveModel());
            response.setFallbackUsed(false);
            response.setTimestamp(LocalDateTime.now());

            log.info("Successfully generated academic advice via {}", aiConfig.getEffectiveModel());
            return response;

        } catch (TimeoutException te) {
            log.error("Academic Advisor call timed out after {}s. Invoking fallback.", timeout);
            return fallbackService.generateFallback(request, "AI timeout sau " + timeout + " giây");
        } catch (Exception ex) {
            log.error("Academic Advisor call encountered error: {}. Invoking fallback.", ex.getMessage(), ex);
            return fallbackService.generateFallback(request, "AI error: " + ex.getMessage());
        }
    }
}
