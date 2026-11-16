package com.rikkei.eduportal.enrollment.repository;

import com.rikkei.eduportal.enrollment.entity.Semester;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SemesterRepository extends JpaRepository<Semester, Long> {

    Optional<Semester> findBySemesterCode(String semesterCode);

    Optional<Semester> findBySemesterName(String semesterName);

    Optional<Semester> findFirstBySemesterCodeOrSemesterName(String semesterCode, String semesterName);

    Optional<Semester> findByIsActiveTrue();
}
