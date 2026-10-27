package com.rikkei.eduportal.auth.service;

import com.rikkei.eduportal.auth.dto.AuditLogResponse;
import com.rikkei.eduportal.auth.entity.AuditLog;
import com.rikkei.eduportal.auth.exception.ResourceNotFoundException;
import com.rikkei.eduportal.auth.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Ghi nhận một sự kiện nhật ký kiểm toán (bất biến / append-only).
     * Chạy với REQUIRES_NEW để đảm bảo audit log được lưu lại ngay cả khi transaction bên ngoài xử lý tiếp.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog recordLog(String action, String actorUsername, String actorRole,
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

    private AuditLogResponse toResponse(AuditLog a) {
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
