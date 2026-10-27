package com.rikkei.eduportal.lecturer.dto.response;

public record DynamicQrResponse(
        Long sessionId,
        Long sectionId,
        String qrToken,
        int stepSeconds,
        long remainingSeconds,
        long expiresAtEpochMs
) {}
