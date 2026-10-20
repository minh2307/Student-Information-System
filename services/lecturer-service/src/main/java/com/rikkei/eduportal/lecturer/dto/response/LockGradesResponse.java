package com.rikkei.eduportal.lecturer.dto.response;

import java.util.List;

/**
 * Response DTO cho POST /api/v1/lecturer/classes/{sectionId}/lock-grades
 */
public record LockGradesResponse(
        Long sectionId,
        int lockedCount,
        String message
) {}
