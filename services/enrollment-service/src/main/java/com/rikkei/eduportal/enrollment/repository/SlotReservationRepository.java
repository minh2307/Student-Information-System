package com.rikkei.eduportal.enrollment.repository;

import com.rikkei.eduportal.enrollment.entity.SlotReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SlotReservationRepository extends JpaRepository<SlotReservation, Long> {

    Optional<SlotReservation> findFirstByStudentIdAndClassSectionIdAndStatus(Long studentId, Long classSectionId, String status);

    @Query("""
        SELECT COUNT(r) FROM SlotReservation r
        WHERE r.classSection.id = :sectionId
          AND r.status = 'ACTIVE'
          AND r.expiresAt > :now
        """)
    long countActiveReservations(@Param("sectionId") Long sectionId, @Param("now") LocalDateTime now);

    @Query("""
        SELECT r FROM SlotReservation r
        JOIN FETCH r.classSection cs
        JOIN FETCH cs.course c
        WHERE r.student.id = :studentId
          AND r.status = 'ACTIVE'
          AND r.expiresAt > :now
        ORDER BY r.expiresAt ASC
        """)
    List<SlotReservation> findActiveByStudentId(@Param("studentId") Long studentId, @Param("now") LocalDateTime now);

    @Query("""
        SELECT r FROM SlotReservation r
        WHERE r.status = 'ACTIVE'
          AND r.expiresAt <= :now
        """)
    List<SlotReservation> findExpiredReservations(@Param("now") LocalDateTime now);
}
