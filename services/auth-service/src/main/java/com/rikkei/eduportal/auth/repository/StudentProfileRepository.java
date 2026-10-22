package com.rikkei.eduportal.auth.repository;

import com.rikkei.eduportal.auth.entity.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {

    Optional<StudentProfile> findByUserId(Long userId);

    Optional<StudentProfile> findByStudentCode(String studentCode);

    boolean existsByStudentCode(String studentCode);

    void deleteByUserId(Long userId);
}
