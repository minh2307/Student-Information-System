package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.dto.AcademicAdvisorRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AdvisorPromptBuilderTest {

    private AdvisorPromptBuilder promptBuilder;

    @BeforeEach
    void setUp() {
        AcademicKnowledgeBase knowledgeBase = new AcademicKnowledgeBase();
        promptBuilder = new AdvisorPromptBuilder(knowledgeBase);
    }

    @Test
    @DisplayName("System prompt should contain core academic regulations and guidelines")
    void buildSystemPrompt_shouldContainRegulations() {
        String systemPrompt = promptBuilder.buildSystemPrompt();

        assertNotNull(systemPrompt);
        assertTrue(systemPrompt.contains("24 tín chỉ"));
        assertTrue(systemPrompt.contains("12 tín chỉ"));
        assertTrue(systemPrompt.contains("160 tín chỉ"));
        assertTrue(systemPrompt.contains("80%"));
        assertTrue(systemPrompt.contains("has_conflict"));
    }

    @Test
    @DisplayName("User prompt should include student context and query")
    void buildUserPrompt_shouldIncludeStudentContext() {
        AcademicAdvisorRequest request = new AcademicAdvisorRequest("Mình bị trùng lịch học môn CS201 và CS301");
        request.setStudentCode("SV2024001");
        request.setCurrentSemester(4);
        request.setMajor("B.Tech Computer Science");
        request.setCreditsEarned(54);
        request.setCurrentCgpa(8.5);
        request.setConflictingSections(List.of("CS201-2025-01", "CS301-2025-01"));

        String userPrompt = promptBuilder.buildUserPrompt(request);

        assertNotNull(userPrompt);
        assertTrue(userPrompt.contains("SV2024001"));
        assertTrue(userPrompt.contains("Kỳ 4"));
        assertTrue(userPrompt.contains("54/160"));
        assertTrue(userPrompt.contains("CS201-2025-01"));
        assertTrue(userPrompt.contains("Mình bị trùng lịch học môn CS201 và CS301"));
    }
}
