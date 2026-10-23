package com.rikkei.eduportal.lecturer.dto.response;

import java.math.BigDecimal;

/**
 * Response DTO cho GET /api/v1/lecturer/classes/{sectionId}/students
 */
public record StudentGradeResponse(
        Long enrollmentId,
        String studentCode,
        String fullName,
        BigDecimal attendanceRate,
        BigDecimal attendanceScore,
        BigDecimal midtermScore,
        BigDecimal finalScore,
        BigDecimal totalScore,
        String letterGrade,
        Boolean isLocked
) {
    public StudentGradeResponse(
            Long enrollmentId,
            String studentCode,
            String fullName,
            BigDecimal attendanceRate,
            BigDecimal midtermScore,
            BigDecimal finalScore,
            BigDecimal totalScore,
            String letterGrade,
            Boolean isLocked
    ) {
        this(enrollmentId, studentCode, fullName, attendanceRate, null, midtermScore, finalScore, totalScore, letterGrade, isLocked);
    }
}
