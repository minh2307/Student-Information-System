package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.dto.AcademicAdvisorRequest;
import com.rikkei.eduportal.ai.dto.AcademicAdvisorResponse;

public interface AcademicAdvisorService {

    /**
     * Provides academic advising consultation for students using Spring AI ChatClient.
     * Covers credit regulations, prerequisite constraints, schedule conflict resolution,
     * and personalized study roadmaps with resilient timeout & error fallback.
     *
     * @param request the student's question and context
     * @return the structured response with markdown advice and follow-up suggestions
     */
    AcademicAdvisorResponse advise(AcademicAdvisorRequest request);
}
