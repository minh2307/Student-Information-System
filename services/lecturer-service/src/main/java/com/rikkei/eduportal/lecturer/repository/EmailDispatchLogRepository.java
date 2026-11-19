package com.rikkei.eduportal.lecturer.repository;

import com.rikkei.eduportal.lecturer.entity.EmailDispatchLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmailDispatchLogRepository extends JpaRepository<EmailDispatchLog, Long> {
    List<EmailDispatchLog> findByRecipientEmailOrderByCreatedAtDesc(String recipientEmail);
    List<EmailDispatchLog> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<EmailDispatchLog> findTop50ByOrderByCreatedAtDesc();
}
