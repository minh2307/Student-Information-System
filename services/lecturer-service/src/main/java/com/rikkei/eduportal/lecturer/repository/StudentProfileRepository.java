package com.rikkei.eduportal.lecturer.repository;

import com.rikkei.eduportal.lecturer.entity.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {

    @Query("SELECT s FROM StudentProfile s JOIN FETCH s.user u WHERE u.username = :username")
    Optional<StudentProfile> findByUserUsername(@Param("username") String username);

    @Query("SELECT s FROM StudentProfile s JOIN FETCH s.user u WHERE u.id = :userId")
    Optional<StudentProfile> findByUserId(@Param("userId") Long userId);

    Optional<StudentProfile> findByStudentCode(String studentCode);
}
