package com.rikkei.eduportal.enrollment.repository;

import com.rikkei.eduportal.enrollment.entity.TuitionFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TuitionFeeRepository extends JpaRepository<TuitionFee, Long> {
    Optional<TuitionFee> findByStudentIdAndSemesterName(Long studentId, String semesterName);
    List<TuitionFee> findByStudentIdOrderByCreatedAtDesc(Long studentId);
}
