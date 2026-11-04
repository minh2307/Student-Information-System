package com.rikkei.eduportal.lecturer.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;

/**
 * Phản hồi chi tiết sau khi sinh viên quét mã QR điểm danh thành công.
 * Tuân thủ cấu trúc chuẩn: { success: boolean, message: string, checkedInAt: string, ... }
 */
public record AttendanceCheckInResponse(
        boolean success,
        String message,
        String checkedInAt,
        Long sessionId,
        Long sectionId,
        String sectionCode,
        String courseName,
        String studentCode,
        String studentName,
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime checkInTime
) {
    /**
     * Constructor tương thích ngược cho các service & test case hiện tại.
     */
    public AttendanceCheckInResponse(
            Long sessionId,
            Long sectionId,
            String sectionCode,
            String courseName,
            String studentCode,
            String studentName,
            LocalDateTime checkInTime,
            String message
    ) {
        this(
                true,
                message,
                checkInTime != null ? checkInTime.toString() : LocalDateTime.now().toString(),
                sessionId,
                sectionId,
                sectionCode,
                courseName,
                studentCode,
                studentName,
                checkInTime
        );
    }
}
