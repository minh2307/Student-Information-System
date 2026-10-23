package com.rikkei.eduportal.lecturer.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

/**
 * Request body cho PUT /api/v1/lecturer/grades/{enrollmentId}
 * Tất cả field là optional — chỉ set những field được gửi lên (null = giữ nguyên).
 */
public record GradeUpdateRequest(

        @DecimalMin(value = "0.0", message = "attendanceScore tối thiểu 0")
        @DecimalMax(value = "10.0", message = "attendanceScore tối đa 10")
        BigDecimal attendanceScore,

        @DecimalMin(value = "0.0", message = "midtermScore tối thiểu 0")
        @DecimalMax(value = "10.0", message = "midtermScore tối đa 10")
        BigDecimal midtermScore,

        @DecimalMin(value = "0.0", message = "finalScore tối thiểu 0")
        @DecimalMax(value = "10.0", message = "finalScore tối đa 10")
        BigDecimal finalScore
) {}
