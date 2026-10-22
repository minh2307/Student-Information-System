package com.rikkei.eduportal.course.service;

import com.rikkei.eduportal.common.Role;
import com.rikkei.eduportal.common.SectionStatus;
import com.rikkei.eduportal.course.dto.request.ClassSectionCreateRequest;
import com.rikkei.eduportal.course.dto.request.ClassSectionUpdateRequest;
import com.rikkei.eduportal.course.dto.response.ClassSectionResponse;
import com.rikkei.eduportal.course.entity.ClassSection;
import com.rikkei.eduportal.course.entity.Course;
import com.rikkei.eduportal.course.entity.LecturerProfile;
import com.rikkei.eduportal.course.entity.User;
import com.rikkei.eduportal.course.exception.*;
import com.rikkei.eduportal.course.repository.ClassSectionRepository;
import com.rikkei.eduportal.course.repository.CourseRepository;
import com.rikkei.eduportal.course.repository.EnrollmentRepository;
import com.rikkei.eduportal.course.repository.LecturerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClassSectionServiceTest {

    @Mock
    private ClassSectionRepository classSectionRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private LecturerProfileRepository lecturerProfileRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @InjectMocks
    private ClassSectionServiceImpl classSectionService;

    private Course course;
    private LecturerProfile lecturer;
    private ClassSection section;

    @BeforeEach
    void setUp() {
        course = new Course("CS201", "Data Structures", 3, 4, "Syllabus", null);
        course.setId(2L);

        User user = new User();
        user.setId(2L);
        user.setFullName("TS. Nguyen Van A");
        user.setRole(Role.LECTURER);

        lecturer = new LecturerProfile();
        lecturer.setId(1L);
        lecturer.setUser(user);
        lecturer.setLecturerCode("GV001");
        lecturer.setDepartment("CNTT");

        section = new ClassSection();
        section.setId(10L);
        section.setSectionCode("CS201-2025-01");
        section.setCourse(course);
        section.setLecturer(lecturer);
        section.setSemesterName("2024-25_SEM2");
        section.setDayOfWeek("MON");
        section.setStartTime(LocalTime.of(9, 0));
        section.setEndTime(LocalTime.of(10, 30));
        section.setRoomName("Room A-204");
        section.setMaxCapacity(40);
        section.setCurrentEnrolled(0);
        section.setStatus(SectionStatus.OPEN);
    }

    @Test
    void testCreateSection_Success() {
        ClassSectionCreateRequest req = new ClassSectionCreateRequest();
        req.setSectionCode("CS201-2025-02");
        req.setCourseId(2L);
        req.setLecturerId(1L);
        req.setSemesterName("2024-25_SEM2");
        req.setDayOfWeek("TUE");
        req.setStartTime(LocalTime.of(8, 0));
        req.setEndTime(LocalTime.of(9, 30));
        req.setRoomName("Room B-101");
        req.setMaxCapacity(35);

        when(classSectionRepository.existsBySectionCode("CS201-2025-02")).thenReturn(false);
        when(courseRepository.findById(2L)).thenReturn(Optional.of(course));
        when(lecturerProfileRepository.findById(1L)).thenReturn(Optional.of(lecturer));
        when(classSectionRepository.findRoomConflicts(any(), any(), any(), any(), any(), isNull()))
                .thenReturn(Collections.emptyList());
        when(classSectionRepository.findLecturerConflicts(any(), any(), any(), any(), any(), isNull()))
                .thenReturn(Collections.emptyList());
        when(classSectionRepository.save(any(ClassSection.class))).thenAnswer(inv -> {
            ClassSection cs = inv.getArgument(0);
            cs.setId(11L);
            return cs;
        });

        ClassSectionResponse resp = classSectionService.createSection(req);

        assertNotNull(resp);
        assertEquals("CS201-2025-02", resp.getSectionCode());
        assertEquals("Room B-101", resp.getRoomName());
        assertEquals(35, resp.getMaxCapacity());
        verify(classSectionRepository, times(1)).save(any(ClassSection.class));
    }

    @Test
    void testCreateSection_RoomConflict_ThrowsException() {
        ClassSectionCreateRequest req = new ClassSectionCreateRequest();
        req.setSectionCode("CS301-2025-01");
        req.setCourseId(2L);
        req.setLecturerId(1L);
        req.setSemesterName("2024-25_SEM2");
        req.setDayOfWeek("MON");
        req.setStartTime(LocalTime.of(9, 30));
        req.setEndTime(LocalTime.of(11, 0));
        req.setRoomName("Room A-204");
        req.setMaxCapacity(40);

        when(classSectionRepository.existsBySectionCode("CS301-2025-01")).thenReturn(false);
        when(courseRepository.findById(2L)).thenReturn(Optional.of(course));
        when(lecturerProfileRepository.findById(1L)).thenReturn(Optional.of(lecturer));
        when(classSectionRepository.findRoomConflicts(any(), any(), any(), any(), any(), isNull()))
                .thenReturn(List.of(section));

        assertThrows(RoomConflictException.class, () -> classSectionService.createSection(req));
        verify(classSectionRepository, never()).save(any());
    }

    @Test
    void testCreateSection_LecturerConflict_ThrowsException() {
        ClassSectionCreateRequest req = new ClassSectionCreateRequest();
        req.setSectionCode("CS301-2025-01");
        req.setCourseId(2L);
        req.setLecturerId(1L);
        req.setSemesterName("2024-25_SEM2");
        req.setDayOfWeek("MON");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(10, 30));
        req.setRoomName("Different-Room");
        req.setMaxCapacity(40);

        when(classSectionRepository.existsBySectionCode("CS301-2025-01")).thenReturn(false);
        when(courseRepository.findById(2L)).thenReturn(Optional.of(course));
        when(lecturerProfileRepository.findById(1L)).thenReturn(Optional.of(lecturer));
        when(classSectionRepository.findRoomConflicts(any(), any(), any(), any(), any(), isNull()))
                .thenReturn(Collections.emptyList());
        when(classSectionRepository.findLecturerConflicts(any(), any(), any(), any(), any(), isNull()))
                .thenReturn(List.of(section));

        assertThrows(LecturerConflictException.class, () -> classSectionService.createSection(req));
        verify(classSectionRepository, never()).save(any());
    }

    @Test
    void testCreateSection_InvalidTime_ThrowsException() {
        ClassSectionCreateRequest req = new ClassSectionCreateRequest();
        req.setSectionCode("CS201-2025-03");
        req.setStartTime(LocalTime.of(11, 0));
        req.setEndTime(LocalTime.of(9, 0)); // Start after end

        when(classSectionRepository.existsBySectionCode("CS201-2025-03")).thenReturn(false);

        assertThrows(InvalidOperationException.class, () -> classSectionService.createSection(req));
    }

    @Test
    void testDeleteSection_HasEnrolled_ThrowsException() {
        section.setCurrentEnrolled(5);
        when(classSectionRepository.findById(10L)).thenReturn(Optional.of(section));

        assertThrows(InvalidOperationException.class, () -> classSectionService.deleteSection(10L));
        verify(classSectionRepository, never()).delete(any());
    }

    @Test
    void testDeleteSection_Success() {
        section.setCurrentEnrolled(0);
        when(classSectionRepository.findById(10L)).thenReturn(Optional.of(section));
        when(enrollmentRepository.existsByClassSectionId(10L)).thenReturn(false);

        classSectionService.deleteSection(10L);

        verify(classSectionRepository, times(1)).delete(section);
    }
}
