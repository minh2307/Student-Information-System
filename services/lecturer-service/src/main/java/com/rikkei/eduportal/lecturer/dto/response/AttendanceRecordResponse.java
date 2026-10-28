package com.rikkei.eduportal.lecturer.dto.response;

import java.time.LocalDateTime;

public record AttendanceRecordResponse(
        Long recordId,
        String studentCode,
        String studentName,
        LocalDateTime checkInTime,
        String deviceInfo
) {}
