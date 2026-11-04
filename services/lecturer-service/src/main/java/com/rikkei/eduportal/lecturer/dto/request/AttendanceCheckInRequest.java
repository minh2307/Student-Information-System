package com.rikkei.eduportal.lecturer.dto.request;

import jakarta.validation.constraints.NotBlank;

public record AttendanceCheckInRequest(
        @NotBlank(message = "Mã token điểm danh không được để trống")
        String qrToken,
        String deviceInfo,
        Long clientTimestampMs
) {
    public AttendanceCheckInRequest(String qrToken, String deviceInfo) {
        this(qrToken, deviceInfo, null);
    }
}
