package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.dto.GenerateSyllabusRequest;
import com.rikkei.eduportal.ai.dto.GenerateSyllabusResponse;

public interface SyllabusService {

    /**
     * Generates an outcome-based academic course syllabus using Spring AI ChatClient.
     * Features prompt engineering, timeout handling, and resilient fallback generation.
     *
     * @param request the syllabus generation request containing course name, credits, and requirements
     * @return the structured and formatted syllabus response
     */
    GenerateSyllabusResponse generateSyllabus(GenerateSyllabusRequest request);
}
