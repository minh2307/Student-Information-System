package com.rikkei.eduportal.lecturer.dto.response;

import java.time.LocalDateTime;

public record StudentAttendanceRecordDto(
        Long recordId,
        Long sessionId,
        String sessionName,
        Long sectionId,
        String sectionCode,
        String courseCode,
        String courseName,
        String semesterName,
        String roomName,
        String dayOfWeek,
        String slotTime,
        LocalDateTime checkInTime,
        String status,
        String deviceInfo
) {}
