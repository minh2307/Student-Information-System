package com.rikkei.eduportal.enrollment.repository;

import com.rikkei.eduportal.enrollment.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
}
