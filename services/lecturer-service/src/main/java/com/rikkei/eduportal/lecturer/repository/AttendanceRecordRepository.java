package com.rikkei.eduportal.lecturer.repository;

import com.rikkei.eduportal.lecturer.entity.AttendanceRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    @Query("""
        SELECT r FROM AttendanceRecord r
        JOIN FETCH r.student s
        JOIN FETCH s.user u
        WHERE r.session.classSection.id = :sectionId
        """)
    List<AttendanceRecord> findByClassSectionId(@Param("sectionId") Long sectionId);

    @Query("""
        SELECT r FROM AttendanceRecord r
        JOIN FETCH r.session ses
        JOIN FETCH ses.classSection cs
        JOIN FETCH cs.course c
        WHERE r.student.id = :studentId
        ORDER BY r.checkInTime DESC
        """)
    List<AttendanceRecord> findByStudentId(@Param("studentId") Long studentId);

    @Query(value = """
        SELECT r FROM AttendanceRecord r
        JOIN FETCH r.session ses
        JOIN FETCH ses.classSection cs
        JOIN FETCH cs.course c
        WHERE r.student.id = :studentId
          AND (:sectionId IS NULL OR cs.id = :sectionId)
          AND (:semesterName IS NULL OR cs.semesterName = :semesterName)
        ORDER BY r.checkInTime DESC
        """,
        countQuery = """
        SELECT COUNT(r) FROM AttendanceRecord r
        WHERE r.student.id = :studentId
          AND (:sectionId IS NULL OR r.session.classSection.id = :sectionId)
          AND (:semesterName IS NULL OR r.session.classSection.semesterName = :semesterName)
        """)
    Page<AttendanceRecord> findStudentAttendanceHistory(
            @Param("studentId") Long studentId,
            @Param("sectionId") Long sectionId,
            @Param("semesterName") String semesterName,
            Pageable pageable);

    long countBySessionId(Long sessionId);
}
