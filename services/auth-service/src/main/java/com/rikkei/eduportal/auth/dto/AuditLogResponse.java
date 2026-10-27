package com.rikkei.eduportal.auth.dto;

import java.time.LocalDateTime;

public record AuditLogResponse(
        Long id,
        String action,
        String actorUsername,
        String actorRole,
        String targetEntity,
        String targetId,
        String summary,
        String oldValue,
        String newValue,
        String ipAddress,
        LocalDateTime createdAt
) {}
