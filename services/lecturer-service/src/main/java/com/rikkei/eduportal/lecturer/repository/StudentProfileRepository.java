package com.rikkei.eduportal.lecturer.repository;

import com.rikkei.eduportal.lecturer.entity.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {
}
