package com.rikkei.eduportal.lecturer.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request body cho PUT /api/v1/lecturer/enrollments/{enrollmentId}/attendance
 */
public record AttendanceUpdateRequest(
        @NotNull(message = "attendanceRate không được null")
        @DecimalMin(value = "0.0", message = "attendanceRate tối thiểu 0")
        @DecimalMax(value = "100.0", message = "attendanceRate tối đa 100")
        BigDecimal attendanceRate
) {}
