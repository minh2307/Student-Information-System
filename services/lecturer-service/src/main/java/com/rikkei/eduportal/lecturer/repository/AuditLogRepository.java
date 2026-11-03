package com.rikkei.eduportal.lecturer.repository;

import com.rikkei.eduportal.lecturer.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByTargetEntityAndTargetIdOrderByCreatedAtDesc(String targetEntity, String targetId);
    List<AuditLog> findByActionOrderByCreatedAtDesc(String action);
}
