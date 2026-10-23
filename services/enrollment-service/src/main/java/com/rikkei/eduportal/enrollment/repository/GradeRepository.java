package com.rikkei.eduportal.enrollment.repository;

import com.rikkei.eduportal.enrollment.entity.Grade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GradeRepository extends JpaRepository<Grade, Long> {

    Optional<Grade> findByEnrollmentId(Long enrollmentId);

    @Query("SELECT g FROM Grade g " +
           "JOIN FETCH g.enrollment e " +
           "JOIN FETCH e.classSection cs " +
           "JOIN FETCH cs.course c " +
           "WHERE e.student.id = :studentId " +
           "ORDER BY cs.semesterName DESC, c.courseCode ASC")
    List<Grade> findByStudentId(@Param("studentId") Long studentId);
}
