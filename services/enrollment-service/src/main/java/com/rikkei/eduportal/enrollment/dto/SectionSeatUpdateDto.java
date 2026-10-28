package com.rikkei.eduportal.enrollment.dto;

import java.time.LocalDateTime;

public record SectionSeatUpdateDto(
        Long sectionId,
        String sectionCode,
        int currentEnrolled,
        int maxCapacity,
        int reservedCount,
        int availableSeats,
        String status,
        LocalDateTime updatedAt
) {}
