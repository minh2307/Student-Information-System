package com.rikkei.eduportal.lecturer.dto.response;

import java.time.LocalTime;

/**
 * Response DTO cho GET /api/v1/lecturer/classes
 */
public record ClassSectionResponse(
        Long sectionId,
        String sectionCode,
        String courseName,
        String courseCode,
        Integer credits,
        String semesterName,
        String dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        String roomName,
        Integer currentEnrolled,
        Integer maxCapacity,
        String status
) {}
