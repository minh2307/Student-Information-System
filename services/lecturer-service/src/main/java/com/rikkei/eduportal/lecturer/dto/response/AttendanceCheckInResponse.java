package com.rikkei.eduportal.lecturer.dto.response;

import java.time.LocalDateTime;

public record AttendanceCheckInResponse(
        Long sessionId,
        Long sectionId,
        String sectionCode,
        String courseName,
        String studentCode,
        String studentName,
        LocalDateTime checkInTime,
        String message
) {}
