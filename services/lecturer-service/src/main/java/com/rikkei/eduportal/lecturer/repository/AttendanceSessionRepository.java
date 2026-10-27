package com.rikkei.eduportal.lecturer.repository;

import com.rikkei.eduportal.lecturer.entity.AttendanceSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {

    Optional<AttendanceSession> findFirstByClassSectionIdAndStatusOrderByCreatedAtDesc(Long sectionId, String status);

    List<AttendanceSession> findByClassSectionIdOrderByCreatedAtDesc(Long sectionId);
}
