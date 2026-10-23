package com.rikkei.eduportal.lecturer.repository;

import com.rikkei.eduportal.lecturer.entity.Grade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GradeRepository extends JpaRepository<Grade, Long> {

    Optional<Grade> findByEnrollmentId(Long enrollmentId);

    /**
     * Lấy tất cả grade của các enrollment thuộc lớp học phần.
     * JOIN FETCH enrollment để tránh N+1.
     */
    @Query("""
        SELECT g FROM Grade g
        JOIN FETCH g.enrollment e
        WHERE e.classSection.id = :sectionId
        """)
    List<Grade> findBySectionId(@Param("sectionId") Long sectionId);

    /**
     * Lấy tất cả grade của SV đã có total_score để tính CGPA.
     */
    @Query("""
        SELECT g FROM Grade g
        JOIN FETCH g.enrollment e
        JOIN FETCH e.classSection cs
        JOIN FETCH cs.course c
        WHERE e.student.id = :studentId
          AND g.totalScore IS NOT NULL
        """)
    List<Grade> findGradesWithTotalByStudentId(@Param("studentId") Long studentId);

    /**
     * Lock tất cả grade của lớp trong một lần update (bulk).
     */
    @Modifying
    @Query("""
        UPDATE Grade g SET g.isLocked = true
        WHERE g.enrollment.classSection.id = :sectionId
        """)
    int lockAllBySectionId(@Param("sectionId") Long sectionId);
}
