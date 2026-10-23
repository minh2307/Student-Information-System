package com.rikkei.eduportal.enrollment.repository;

import com.rikkei.eduportal.enrollment.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    Optional<Enrollment> findByStudentIdAndClassSectionId(Long studentId, Long classSectionId);

    @Query("SELECT e FROM Enrollment e " +
           "JOIN FETCH e.classSection cs " +
           "JOIN FETCH cs.course c " +
           "JOIN FETCH cs.lecturer lp " +
           "JOIN FETCH lp.user u " +
           "WHERE e.student.id = :studentId " +
           "AND e.status IN ('REGISTERED', 'PENDING')")
    List<Enrollment> findActiveEnrollmentsByStudent(@Param("studentId") Long studentId);

    @Query("SELECT e FROM Enrollment e " +
           "JOIN FETCH e.classSection cs " +
           "JOIN FETCH cs.course c " +
           "WHERE e.student.id = :studentId " +
           "AND cs.semesterName = :semester " +
           "AND e.status IN ('REGISTERED', 'PENDING', 'COMPLETED')")
    List<Enrollment> findActiveEnrollmentsByStudentAndSemester(@Param("studentId") Long studentId, @Param("semester") String semester);

    @Query("SELECT COUNT(e) FROM Enrollment e " +
           "WHERE e.student.id = :studentId " +
           "AND e.status = :status")
    int countByStudentIdAndStatus(@Param("studentId") Long studentId, @Param("status") String status);

    @Query("SELECT COUNT(e) FROM Enrollment e " +
           "WHERE e.student.id = :studentId " +
           "AND e.hasConflict = true " +
           "AND e.status IN ('REGISTERED', 'PENDING')")
    int countActiveConflictsByStudent(@Param("studentId") Long studentId);

    @Query("SELECT e FROM Enrollment e " +
           "JOIN FETCH e.classSection cs " +
           "JOIN FETCH cs.course c " +
           "WHERE e.student.id = :studentId " +
           "ORDER BY e.registeredAt DESC")
    List<Enrollment> findAllByStudentId(@Param("studentId") Long studentId);
}
