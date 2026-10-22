package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.dto.GenerateSyllabusRequest;
import com.rikkei.eduportal.ai.dto.GenerateSyllabusResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SyllabusFallbackServiceTest {

    private SyllabusFallbackService fallbackService;

    @BeforeEach
    void setUp() {
        fallbackService = new SyllabusFallbackService();
    }

    @Test
    @DisplayName("Fallback generator should produce structured response with 15 weeks, 5 CLOs, and 10-30-60 assessment")
    void generateFallback_shouldProduceCompleteSyllabus() {
        GenerateSyllabusRequest request = new GenerateSyllabusRequest(
                "Data Structures and Algorithms",
                3,
                "Nhấn mạnh cấu trúc Tree và Graph"
        );

        GenerateSyllabusResponse response = fallbackService.generateFallback(request, "API timeout test");

        assertNotNull(response);
        assertEquals("Data Structures and Algorithms", response.getCourseName());
        assertEquals(3, response.getCredits());
        assertEquals("CS201", response.getCourseCode());
        assertTrue(response.isFallbackUsed());
        assertNotNull(response.getOverview());

        // CLOs
        assertNotNull(response.getLearningOutcomes());
        assertEquals(5, response.getLearningOutcomes().size());
        assertEquals("CLO1", response.getLearningOutcomes().get(0).getCode());

        // 15 weeks
        assertNotNull(response.getWeeklyTopics());
        assertEquals(15, response.getWeeklyTopics().size());

        // Assessment
        assertNotNull(response.getAssessmentScheme());
        assertEquals(10, response.getAssessmentScheme().getAttendanceRate());
        assertEquals(30, response.getAssessmentScheme().getMidtermRate());
        assertEquals(60, response.getAssessmentScheme().getFinalRate());

        // Formatted syllabus string
        assertNotNull(response.getSyllabus());
        assertTrue(response.getSyllabus().contains("ĐỀ CƯƠNG CHI TIẾT HỌC PHẦN"));
        assertTrue(response.getSyllabus().contains("CS201"));
        assertTrue(response.getSyllabus().contains("API timeout test"));
    }
}
