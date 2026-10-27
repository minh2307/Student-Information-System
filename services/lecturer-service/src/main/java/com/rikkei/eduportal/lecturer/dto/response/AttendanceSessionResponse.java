package com.rikkei.eduportal.lecturer.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record AttendanceSessionResponse(
        Long sessionId,
        Long sectionId,
        String sectionCode,
        String courseName,
        String sessionName,
        String status,
        Integer stepSeconds,
        Integer totalAttendees,
        LocalDateTime createdAt,
        LocalDateTime closedAt,
        List<AttendanceRecordResponse> records
) {}
