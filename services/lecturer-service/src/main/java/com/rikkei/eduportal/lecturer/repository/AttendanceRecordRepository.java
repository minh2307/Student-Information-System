package com.rikkei.eduportal.lecturer.repository;

import com.rikkei.eduportal.lecturer.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {

    boolean existsBySessionIdAndStudentId(Long sessionId, Long studentId);

    @Query("""
        SELECT r FROM AttendanceRecord r
        JOIN FETCH r.student s
        JOIN FETCH s.user u
        WHERE r.session.id = :sessionId
        ORDER BY r.checkInTime DESC
        """)
    List<AttendanceRecord> findBySessionIdWithStudent(@Param("sessionId") Long sessionId);

    long countBySessionId(Long sessionId);
}
