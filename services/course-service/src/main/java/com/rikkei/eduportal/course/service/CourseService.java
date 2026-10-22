package com.rikkei.eduportal.course.service;

import com.rikkei.eduportal.course.dto.request.CourseCreateRequest;
import com.rikkei.eduportal.course.dto.request.CourseUpdateRequest;
import com.rikkei.eduportal.course.dto.response.CourseResponse;

import java.util.List;

public interface CourseService {

    List<CourseResponse> getAllCourses(String keyword);

    CourseResponse getCourseById(Long id);

    CourseResponse createCourse(CourseCreateRequest request);

    CourseResponse updateCourse(Long id, CourseUpdateRequest request);

    void deleteCourse(Long id);
}
