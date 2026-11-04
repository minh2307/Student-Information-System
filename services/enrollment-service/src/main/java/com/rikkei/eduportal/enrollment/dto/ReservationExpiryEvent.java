package com.rikkei.eduportal.enrollment.dto;

import java.time.LocalDateTime;

/**
 * Sự kiện đẩy về client SSE khi phiên giữ chỗ sắp hết hạn hoặc đã hết hạn.
 *
 * @param reservationId   ID phiên giữ chỗ
 * @param classSectionId  ID lớp học phần
 * @param sectionCode     Mã lớp học phần
 * @param courseName      Tên môn học
 * @param expiresAt       Thời điểm hết hạn (UTC)
 * @param remainingSeconds Số giây còn lại (0 nếu đã hết hạn)
 * @param eventType       "EXPIRING_SOON" (cảnh báo 60 s cuối) | "EXPIRED" (đã thu hồi)
 */
public record ReservationExpiryEvent(
        Long reservationId,
        Long classSectionId,
        String sectionCode,
        String courseName,
        LocalDateTime expiresAt,
        long remainingSeconds,
        String eventType
) {}
