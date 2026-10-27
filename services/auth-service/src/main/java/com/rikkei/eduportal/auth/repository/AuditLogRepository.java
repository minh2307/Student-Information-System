package com.rikkei.eduportal.auth.repository;

import com.rikkei.eduportal.auth.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:action IS NULL OR a.action = :action)
          AND (:actorUsername IS NULL OR a.actorUsername = :actorUsername)
          AND (:targetEntity IS NULL OR a.targetEntity = :targetEntity)
        ORDER BY a.createdAt DESC
        """)
    List<AuditLog> filterLogs(
            @Param("action") String action,
            @Param("actorUsername") String actorUsername,
            @Param("targetEntity") String targetEntity);

    List<AuditLog> findAllByOrderByCreatedAtDesc();

    List<AuditLog> findByTargetEntityAndTargetIdOrderByCreatedAtDesc(String targetEntity, String targetId);
}
