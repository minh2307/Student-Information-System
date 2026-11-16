package com.rikkei.eduportal.auth.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.rikkei.eduportal.auth.dto.AuditLogResponse;
import com.rikkei.eduportal.auth.dto.CreateAuditLogRequest;
import com.rikkei.eduportal.auth.entity.AuditLog;
import com.rikkei.eduportal.auth.exception.ResourceNotFoundException;
import com.rikkei.eduportal.auth.repository.AuditLogRepository;
import com.rikkei.eduportal.common.AuditDeltaPayload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional(readOnly = true)
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    /**
     * Ghi nhận một sự kiện nhật ký kiểm toán (bất biến / append-only).
     * Chạy với REQUIRES_NEW để đảm bảo audit log được lưu lại ngay cả khi transaction bên ngoài xử lý tiếp.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog recordLog(String action, String actorUsername, String actorRole,
                              String targetEntity, String targetId, String summary,
                              String oldValue, String newValue, String ipAddress) {
        return doRecordLog(action, actorUsername, actorRole, targetEntity, targetId, summary, oldValue, newValue, ipAddress);
    }

    /**
     * Ghi nhận kiểm toán kèm cấu trúc JSON Delta chi tiết từng trường (Field-level diff).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog recordDeltaLog(String action, String actorUsername, String actorRole,
                                   String targetEntity, String targetId, String summary,
                                   AuditDeltaPayload deltaPayload, String ipAddress) {
        return doRecordDeltaLog(action, actorUsername, actorRole, targetEntity, targetId, summary, deltaPayload, ipAddress);
    }

    /**
     * Tự động tính toán Field-level Diff giữa 2 trạng thái Object Map và lưu JSON Delta.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog recordDiffLog(String action, String actorUsername, String actorRole,
                                  String targetEntity, String targetId, String summary,
                                  Map<String, Object> oldState, Map<String, Object> newState,
                                  Map<String, Object> metadata, String ipAddress) {
        AuditDeltaPayload payload = buildDiffPayload(targetEntity, targetId, oldState, newState, metadata);
        return doRecordDeltaLog(action, actorUsername, actorRole, targetEntity, targetId, summary, payload, ipAddress);
    }

    /**
     * Ghi nhận từ request DTO (hỗ trợ REST Controller và liên microservice).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog recordFromRequest(CreateAuditLogRequest request, String ipAddress) {
        if (request.getDelta() != null) {
            return doRecordDeltaLog(
                    request.getAction(),
                    request.getActorUsername(),
                    request.getActorRole(),
                    request.getTargetEntity(),
                    request.getTargetId(),
                    request.getSummary(),
                    request.getDelta(),
                    ipAddress
            );
        }

        return doRecordLog(
                request.getAction(),
                request.getActorUsername(),
                request.getActorRole(),
                request.getTargetEntity(),
                request.getTargetId(),
                request.getSummary(),
                request.getOldValue(),
                request.getNewValue(),
                ipAddress
        );
    }

    private AuditLog doRecordLog(String action, String actorUsername, String actorRole,
                                 String targetEntity, String targetId, String summary,
                                 String oldValue, String newValue, String ipAddress) {
        AuditLog auditLog = new AuditLog(
                action,
                actorUsername != null ? actorUsername : "system",
                actorRole != null ? actorRole : "ROLE_ADMIN",
                targetEntity,
                targetId,
                summary,
                oldValue,
                newValue,
                ipAddress
        );

        AuditLog saved = auditLogRepository.save(auditLog);
        log.info("AUDIT_TRAIL [action={}, actor={}, entity={}, targetId={}, summary='{}']",
                action, actorUsername, targetEntity, targetId, summary);
        return saved;
    }

    private AuditLog doRecordDeltaLog(String action, String actorUsername, String actorRole,
                                      String targetEntity, String targetId, String summary,
                                      AuditDeltaPayload deltaPayload, String ipAddress) {
        String deltaJson = null;
        if (deltaPayload != null) {
            try {
                deltaJson = objectMapper.writeValueAsString(deltaPayload);
            } catch (JsonProcessingException e) {
                log.warn("Lỗi serialize AuditDeltaPayload sang JSON: {}", e.getMessage());
                deltaJson = "{}";
            }
        }
        return doRecordLog(action, actorUsername, actorRole, targetEntity, targetId, summary,
                null, deltaJson, ipAddress);
    }

    private AuditDeltaPayload buildDiffPayload(String targetEntity, String targetId,
                                               Map<String, Object> oldState, Map<String, Object> newState,
                                               Map<String, Object> metadata) {
        AuditDeltaPayload payload = new AuditDeltaPayload(targetEntity, targetId);

        Set<String> allKeys = new LinkedHashSet<>();
        if (oldState != null) allKeys.addAll(oldState.keySet());
        if (newState != null) allKeys.addAll(newState.keySet());

        for (String key : allKeys) {
            Object oldVal = oldState != null ? oldState.get(key) : null;
            Object newVal = newState != null ? newState.get(key) : null;

            if (!Objects.equals(oldVal, newVal)) {
                payload.addDiff(key, oldVal, newVal);
            }
        }

        if (metadata != null) {
            metadata.forEach(payload::addMetadata);
        }

        return payload;
    }

    /**
     * Tiện ích bóc tách JSON string thành AuditDeltaPayload cho Frontend / Client.
     */
    public Optional<AuditDeltaPayload> parseDelta(String json) {
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(json, AuditDeltaPayload.class));
        } catch (Exception e) {
            log.debug("Chuỗi không phải JSON Delta hoặc lỗi parse: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Lấy danh sách nhật ký kiểm toán với bộ lọc tuỳ chọn.
     */
    public List<AuditLogResponse> getAuditLogs(String action, String actorUsername, String targetEntity) {
        List<AuditLog> logs;
        if (action == null && actorUsername == null && targetEntity == null) {
            logs = auditLogRepository.findAllByOrderByCreatedAtDesc();
        } else {
            logs = auditLogRepository.filterLogs(
                    (action != null && !action.isBlank()) ? action.trim() : null,
                    (actorUsername != null && !actorUsername.isBlank()) ? actorUsername.trim() : null,
                    (targetEntity != null && !targetEntity.isBlank()) ? targetEntity.trim() : null
            );
        }
        return logs.stream().map(this::toResponse).toList();
    }

    /**
     * Lấy chi tiết một bản ghi nhật ký kiểm toán theo ID.
     */
    public AuditLogResponse getAuditLogById(Long id) {
        AuditLog auditLog = auditLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bản ghi nhật ký kiểm toán với ID: " + id));
        return toResponse(auditLog);
    }

    /**
     * Lấy lịch sử biến động của một đối tượng cụ thể.
     */
    public List<AuditLogResponse> getEntityHistory(String targetEntity, String targetId) {
        return auditLogRepository.findByTargetEntityAndTargetIdOrderByCreatedAtDesc(targetEntity, targetId)
                .stream().map(this::toResponse).toList();
    }

    public AuditLogResponse toResponse(AuditLog a) {
        return new AuditLogResponse(
                a.getId(),
                a.getAction(),
                a.getActorUsername(),
                a.getActorRole(),
                a.getTargetEntity(),
                a.getTargetId(),
                a.getSummary(),
                a.getOldValue(),
                a.getNewValue(),
                a.getIpAddress(),
                a.getCreatedAt()
        );
    }
}
