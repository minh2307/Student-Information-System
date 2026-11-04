package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.dto.AcademicAdvisorRequest;
import com.rikkei.eduportal.ai.dto.AcademicAdvisorResponse;

public interface AcademicAdvisorService {

    /**
     * Provides academic advising consultation for students using Gemini AI / fallback engine.
     *
     * @param request the student's question and context
     * @return the structured response with markdown advice and follow-up suggestions
     */
    AcademicAdvisorResponse advise(AcademicAdvisorRequest request);

    /**
     * Provides personalized academic advising using real enrollment data for the authenticated student.
     *
     * @param request the student's question and conversation history
     * @param authenticatedStudent the authenticated student identifier
     * @param authToken the JWT token for secure downstream microservice propagation
     * @return the structured response with recommendations, academic summary, and advice
     */
    AcademicAdvisorResponse advise(AcademicAdvisorRequest request, String authenticatedStudent, String authToken);
}
