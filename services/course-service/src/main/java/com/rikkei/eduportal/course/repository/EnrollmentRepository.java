package com.rikkei.eduportal.course.repository;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.course.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    @Query("SELECT e FROM Enrollment e " +
           "JOIN FETCH e.student sp " +
           "JOIN FETCH sp.user u " +
           "JOIN FETCH e.classSection cs " +
           "JOIN FETCH cs.course c " +
           "JOIN FETCH cs.lecturer lp " +
           "JOIN FETCH lp.user lu " +
           "WHERE e.status = :status " +
           "ORDER BY e.registeredAt DESC")
    List<Enrollment> findByStatusWithDetails(@Param("status") EnrollmentStatus status);

    long countByClassSectionIdAndStatusIn(Long classSectionId, Collection<EnrollmentStatus> statuses);

    boolean existsByClassSectionId(Long classSectionId);
}
