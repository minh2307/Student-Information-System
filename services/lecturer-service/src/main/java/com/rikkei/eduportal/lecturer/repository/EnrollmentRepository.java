package com.rikkei.eduportal.lecturer.repository;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.lecturer.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    /**
     * Lấy danh sách enrollment REGISTERED của một lớp.
     * JOIN FETCH student + user để tránh N+1 khi render danh sách SV.
     */
    @Query("""
        SELECT e FROM Enrollment e
        JOIN FETCH e.student sp
        JOIN FETCH sp.user u
        WHERE e.classSection.id = :sectionId
          AND e.status = :status
        ORDER BY u.fullName
        """)
    List<Enrollment> findBySectionIdAndStatus(
            @Param("sectionId") Long sectionId,
            @Param("status") EnrollmentStatus status);

    /**
     * Lấy tất cả enrollment REGISTERED của lớp (dùng khi lock-grades).
     */
    @Query("""
        SELECT e FROM Enrollment e
        WHERE e.classSection.id = :sectionId
          AND e.status = 'REGISTERED'
        """)
    List<Enrollment> findRegisteredBySectionId(@Param("sectionId") Long sectionId);

    /**
     * Lấy tất cả enrollment đã có total_score của một SV
     * (dùng để tính lại CGPA).
     */
    @Query("""
        SELECT e FROM Enrollment e
        JOIN FETCH e.classSection cs
        JOIN FETCH cs.course c
        WHERE e.student.id = :studentId
          AND e.status = 'REGISTERED'
        """)
    List<Enrollment> findRegisteredByStudentId(@Param("studentId") Long studentId);

    Optional<Enrollment> findById(Long id);

    Optional<Enrollment> findByClassSectionIdAndStudentId(Long classSectionId, Long studentId);
}
