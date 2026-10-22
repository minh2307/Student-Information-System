package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.dto.GenerateSyllabusRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SyllabusPromptBuilderTest {

    private SyllabusPromptBuilder promptBuilder;

    @BeforeEach
    void setUp() {
        promptBuilder = new SyllabusPromptBuilder();
    }

    @Test
    @DisplayName("System prompt should contain OBE, Bloom taxonomy, and 10-30-60 assessment rules")
    void buildSystemPrompt_shouldContainRequiredStandards() {
        String systemPrompt = promptBuilder.buildSystemPrompt();

        assertNotNull(systemPrompt);
        assertTrue(systemPrompt.contains("OBE") || systemPrompt.contains("Outcome-Based Education"));
        assertTrue(systemPrompt.contains("Bloom"));
        assertTrue(systemPrompt.contains("10%"));
        assertTrue(systemPrompt.contains("30%"));
        assertTrue(systemPrompt.contains("60%"));
        assertTrue(systemPrompt.contains("JSON"));
    }

    @Test
    @DisplayName("User prompt should incorporate course name, credits, requirements, and JSON schema")
    void buildUserPrompt_shouldIncorporateCourseDetails() {
        GenerateSyllabusRequest request = new GenerateSyllabusRequest(
                "Lập trình Đám mây (Cloud Computing)",
                4,
                "Tập trung vào AWS, Kubernetes và CI/CD pipeline"
        );

        String userPrompt = promptBuilder.buildUserPrompt(request);

        assertNotNull(userPrompt);
        assertTrue(userPrompt.contains("Lập trình Đám mây (Cloud Computing)"));
        assertTrue(userPrompt.contains("4 tín chỉ"));
        assertTrue(userPrompt.contains("AWS, Kubernetes và CI/CD pipeline"));
        assertTrue(userPrompt.contains("learningOutcomes"));
        assertTrue(userPrompt.contains("weeklyTopics"));
        assertTrue(userPrompt.contains("assessmentScheme"));
    }
}
