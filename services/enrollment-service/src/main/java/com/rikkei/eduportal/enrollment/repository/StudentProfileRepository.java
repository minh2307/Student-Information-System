package com.rikkei.eduportal.enrollment.repository;

import com.rikkei.eduportal.enrollment.entity.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
    Optional<StudentProfile> findByStudentCode(String studentCode);
    Optional<StudentProfile> findByUserId(Long userId);

    @Query("SELECT sp FROM StudentProfile sp JOIN sp.user u WHERE LOWER(u.username) = LOWER(:identifier) OR LOWER(sp.studentCode) = LOWER(:identifier)")
    Optional<StudentProfile> findByUsernameOrStudentCode(@Param("identifier") String identifier);
}
