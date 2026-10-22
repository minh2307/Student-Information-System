package com.rikkei.eduportal.enrollment.repository;

import com.rikkei.eduportal.enrollment.entity.ClassSection;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassSectionRepository extends JpaRepository<ClassSection, Long> {

    @Query("SELECT cs FROM ClassSection cs " +
           "JOIN FETCH cs.course c " +
           "JOIN FETCH cs.lecturer lp " +
           "JOIN FETCH lp.user u " +
           "WHERE (:semester IS NULL OR cs.semesterName = :semester) " +
           "AND (:keyword IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(c.courseCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(cs.sectionCode) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY c.courseCode ASC, cs.sectionCode ASC")
    List<ClassSection> searchSections(@Param("semester") String semester, @Param("keyword") String keyword);

    /**
     * Pessimistic locking for registration concurrency (NFR-03: Race condition prevention).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT cs FROM ClassSection cs WHERE cs.id = :id")
    Optional<ClassSection> findByIdWithLock(@Param("id") Long id);
}
