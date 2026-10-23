package com.rikkei.eduportal.course.service;

import com.rikkei.eduportal.course.dto.request.CourseCreateRequest;
import com.rikkei.eduportal.course.dto.request.CourseUpdateRequest;
import com.rikkei.eduportal.course.dto.response.CourseResponse;
import com.rikkei.eduportal.course.entity.Course;
import com.rikkei.eduportal.course.exception.DuplicateResourceException;
import com.rikkei.eduportal.course.exception.InvalidOperationException;
import com.rikkei.eduportal.course.exception.ResourceNotFoundException;
import com.rikkei.eduportal.course.repository.ClassSectionRepository;
import com.rikkei.eduportal.course.repository.CourseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private ClassSectionRepository classSectionRepository;

    @InjectMocks
    private CourseServiceImpl courseService;

    private Course course1;
    private Course course2;

    @BeforeEach
    void setUp() {
        course1 = new Course("CS101", "Intro to Programming", 3, 4, "Syllabus 1", null);
        course1.setId(1L);

        course2 = new Course("CS201", "Data Structures", 3, 4, "Syllabus 2", course1);
        course2.setId(2L);
    }

    @Test
    void testGetAllCourses_Success() {
        when(courseRepository.searchCourses("CS")).thenReturn(List.of(course1, course2));

        List<CourseResponse> result = courseService.getAllCourses("CS");

        assertEquals(2, result.size());
        assertEquals("CS101", result.get(0).getCourseCode());
        assertEquals("CS201", result.get(1).getCourseCode());
        assertEquals("CS101", result.get(1).getPrerequisiteCourseCode());
    }

    @Test
    void testGetCourseById_Found() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course1));

        CourseResponse result = courseService.getCourseById(1L);

        assertNotNull(result);
        assertEquals("CS101", result.getCourseCode());
    }

    @Test
    void testGetCourseById_NotFound() {
        when(courseRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> courseService.getCourseById(99L));
    }

    @Test
    void testCreateCourse_Success() {
        CourseCreateRequest req = new CourseCreateRequest("CS301", "DBMS", 3, 4, "DB Syllabus", 1L);

        when(courseRepository.existsByCourseCode("CS301")).thenReturn(false);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course1));
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> {
            Course c = invocation.getArgument(0);
            c.setId(3L);
            return c;
        });

        CourseResponse created = courseService.createCourse(req);

        assertNotNull(created);
        assertEquals(3L, created.getId());
        assertEquals("CS301", created.getCourseCode());
        assertEquals("CS101", created.getPrerequisiteCourseCode());
        verify(courseRepository, times(1)).save(any(Course.class));
    }

    @Test
    void testCreateCourse_DuplicateCode_ThrowsException() {
        CourseCreateRequest req = new CourseCreateRequest("CS101", "Another Name", 3, 4, null, null);
        when(courseRepository.existsByCourseCode("CS101")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> courseService.createCourse(req));
        verify(courseRepository, never()).save(any(Course.class));
    }

    @Test
    void testUpdateCourse_SelfPrerequisite_ThrowsException() {
        CourseUpdateRequest req = new CourseUpdateRequest("CS101", "New Name", 3, 4, null, 1L);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course1));
        when(courseRepository.existsByCourseCodeAndIdNot("CS101", 1L)).thenReturn(false);

        assertThrows(InvalidOperationException.class, () -> courseService.updateCourse(1L, req));
    }

    @Test
    void testDeleteCourse_HasClassSections_ThrowsException() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course1));
        when(classSectionRepository.existsByCourseId(1L)).thenReturn(true);

        assertThrows(InvalidOperationException.class, () -> courseService.deleteCourse(1L));
        verify(courseRepository, never()).delete(any());
    }

    @Test
    void testDeleteCourse_IsPrerequisiteOfOther_ThrowsException() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course1));
        when(classSectionRepository.existsByCourseId(1L)).thenReturn(false);
        when(courseRepository.existsByPrerequisiteCourseId(1L)).thenReturn(true);

        assertThrows(InvalidOperationException.class, () -> courseService.deleteCourse(1L));
        verify(courseRepository, never()).delete(any());
    }

    @Test
    void testDeleteCourse_Success() {
        when(courseRepository.findById(2L)).thenReturn(Optional.of(course2));
        when(classSectionRepository.existsByCourseId(2L)).thenReturn(false);
        when(courseRepository.existsByPrerequisiteCourseId(2L)).thenReturn(false);

        courseService.deleteCourse(2L);

        verify(courseRepository, times(1)).delete(course2);
    }
}
