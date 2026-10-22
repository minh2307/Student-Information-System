package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.dto.AcademicAdvisorRequest;
import com.rikkei.eduportal.ai.dto.AcademicAdvisorResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AdvisorFallbackServiceTest {

    private AdvisorFallbackService fallbackService;

    @BeforeEach
    void setUp() {
        AcademicKnowledgeBase knowledgeBase = new AcademicKnowledgeBase();
        fallbackService = new AdvisorFallbackService(knowledgeBase);
    }

    @Test
    @DisplayName("Should detect SCHEDULE_CONFLICT and provide conflict resolution steps")
    void generateFallback_scheduleConflict() {
        AcademicAdvisorRequest req = new AcademicAdvisorRequest("Thời khóa biểu của mình bị trùng giờ học thứ hai");
        AcademicAdvisorResponse res = fallbackService.generateFallback(req, "test");

        assertEquals("SCHEDULE_CONFLICT", res.getCategory());
        assertTrue(res.isFallbackUsed());
        assertNotNull(res.getReply());
        assertTrue(res.getReply().contains("Trùng thời khóa biểu"));
        assertTrue(res.getReply().contains("Đổi sang lớp học phần"));
        assertTrue(res.getReply().contains("has_conflict"));
        assertFalse(res.getSuggestions().isEmpty());
    }

    @Test
    @DisplayName("Should detect CREDITS_LIMIT and explain max/min credits")
    void generateFallback_creditsLimit() {
        AcademicAdvisorRequest req = new AcademicAdvisorRequest("Kỳ này mình được đăng ký tối đa bao nhiêu tín chỉ?");
        AcademicAdvisorResponse res = fallbackService.generateFallback(req, "test");

        assertEquals("CREDITS_LIMIT", res.getCategory());
        assertTrue(res.getReply().contains("24 tín chỉ"));
        assertTrue(res.getReply().contains("12 tín chỉ"));
        assertTrue(res.getReply().contains("160 tín chỉ"));
    }

    @Test
    @DisplayName("Should detect PREREQUISITES and explain course dependencies")
    void generateFallback_prerequisites() {
        AcademicAdvisorRequest req = new AcademicAdvisorRequest("Môn CS401 có điều kiện tiên quyết là gì?");
        AcademicAdvisorResponse res = fallbackService.generateFallback(req, "test");

        assertEquals("PREREQUISITES", res.getCategory());
        assertTrue(res.getReply().contains("CS201"));
        assertTrue(res.getReply().contains("CS401"));
    }

    @Test
    @DisplayName("Should detect GRADES_AND_GPA and explain attendance & grading scheme")
    void generateFallback_gradesAndGpa() {
        AcademicAdvisorRequest req = new AcademicAdvisorRequest("Quy chế điểm chuyên cần và tỷ lệ bao nhiêu %?");
        AcademicAdvisorResponse res = fallbackService.generateFallback(req, "test");

        assertEquals("GRADES_AND_GPA", res.getCategory());
        assertTrue(res.getReply().contains("10%"));
        assertTrue(res.getReply().contains("30%"));
        assertTrue(res.getReply().contains("60%"));
        assertTrue(res.getReply().contains("80%"));
    }

    @Test
    @DisplayName("Should detect ROADMAP and provide multi-semester guidance")
    void generateFallback_roadmap() {
        AcademicAdvisorRequest req = new AcademicAdvisorRequest("Gợi ý cho mình lộ trình học tập ngành CNTT");
        AcademicAdvisorResponse res = fallbackService.generateFallback(req, "test");

        assertEquals("ROADMAP", res.getCategory());
        assertTrue(res.getReply().contains("Năm 1"));
        assertTrue(res.getReply().contains("Năm 2"));
        assertTrue(res.getReply().contains("Năm 3"));
        assertTrue(res.getReply().contains("Năm 4"));
    }
}
