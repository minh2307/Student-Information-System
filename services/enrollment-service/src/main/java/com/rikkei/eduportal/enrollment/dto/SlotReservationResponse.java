package com.rikkei.eduportal.enrollment.dto;

import java.time.LocalDateTime;

public record SlotReservationResponse(
        Long reservationId,
        Long classSectionId,
        String sectionCode,
        String courseName,
        LocalDateTime reservedAt,
        LocalDateTime expiresAt,
        long remainingSeconds,
        String status,
        String message
) {}
