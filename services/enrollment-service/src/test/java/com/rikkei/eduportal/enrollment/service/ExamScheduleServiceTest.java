package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.ExamScheduleDto;
import com.rikkei.eduportal.enrollment.dto.ExamScheduleRequest;
import com.rikkei.eduportal.enrollment.entity.ClassSection;
import com.rikkei.eduportal.enrollment.entity.Course;
import com.rikkei.eduportal.enrollment.entity.ExamSchedule;
import com.rikkei.eduportal.enrollment.entity.LecturerProfile;
import com.rikkei.eduportal.enrollment.entity.StudentProfile;
import com.rikkei.eduportal.enrollment.entity.User;
import com.rikkei.eduportal.enrollment.exception.BusinessException;
import com.rikkei.eduportal.enrollment.exception.ResourceNotFoundException;
import com.rikkei.eduportal.enrollment.repository.ClassSectionRepository;
import com.rikkei.eduportal.enrollment.repository.ExamScheduleRepository;
import com.rikkei.eduportal.enrollment.repository.StudentProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExamScheduleServiceTest {

    @Mock
    private ExamScheduleRepository examScheduleRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private StudentDashboardService dashboardService;

    @Mock
    private ClassSectionRepository classSectionRepository;

    @InjectMocks
    private ExamScheduleService examScheduleService;

    private ClassSection section;
    private Course course;
    private ExamSchedule exam;

    @BeforeEach
    void setUp() {
        course = new Course();
        course.setId(101L);
        course.setCourseCode("CS101");
        course.setName("Cấu trúc Dữ liệu & Giải thuật");
        course.setCredits(3);

        User lecturerUser = new User();
        lecturerUser.setId(5L);
        lecturerUser.setFullName("Nguyen Van B");

        LecturerProfile lecturer = new LecturerProfile();
        lecturer.setId(2L);
        lecturer.setUser(lecturerUser);
        lecturer.setDegree("TS");

        section = new ClassSection();
        section.setId(10L);
        section.setSectionCode("CS101-01");
        section.setCourse(course);
        section.setLecturer(lecturer);
        section.setSemesterName("2024-25_SEM2");
        section.setRoomName("LAB-301");
        section.setCurrentEnrolled(35);
        section.setMaxCapacity(40);

        exam = new ExamSchedule();
        exam.setId(1L);
        exam.setClassSection(section);
        exam.setExamDate(LocalDate.of(2025, 6, 20));
        exam.setStartTime(LocalTime.of(8, 0));
        exam.setEndTime(LocalTime.of(9, 30));
        exam.setRoomName("LAB-301");
        exam.setExamType("THI MÁY");
        exam.setNotes("Có mặt trước 15 phút");
    }

    @Test
    @DisplayName("Admin: Tra cứu toàn bộ lịch thi có hỗ trợ lọc")
    void testGetAllAdminExams() {
        when(examScheduleRepository.findAllWithDetails("2024-25_SEM2")).thenReturn(List.of(exam));

        List<ExamScheduleDto> results = examScheduleService.getAllAdminExams("2024-25_SEM2", "CS101");

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("CS101", results.get(0).getCourseCode());
        assertEquals("CS101-01", results.get(0).getSectionCode());
        assertEquals("THI MÁY", results.get(0).getExamType());
        assertEquals(35, results.get(0).getCurrentEnrolled());
    }

    @Test
    @DisplayName("Admin: Tạo lịch thi mới thành công")
    void testCreateExamSchedule_Success() {
        ExamScheduleRequest req = new ExamScheduleRequest();
        req.setClassSectionId(10L);
        req.setExamDate(LocalDate.of(2025, 6, 25));
        req.setStartTime(LocalTime.of(10, 0));
        req.setEndTime(LocalTime.of(11, 30));
        req.setRoomName("P-402");
        req.setExamType("TỰ LUẬN");
        req.setNotes("Không sử dụng tài liệu");

        when(classSectionRepository.findById(10L)).thenReturn(Optional.of(section));
        when(examScheduleRepository.save(any(ExamSchedule.class))).thenAnswer(inv -> {
            ExamSchedule saved = inv.getArgument(0);
            saved.setId(99L);
            return saved;
        });

        ExamScheduleDto dto = examScheduleService.createExamSchedule(req);

        assertNotNull(dto);
        assertEquals(99L, dto.getId());
        assertEquals("P-402", dto.getRoomName());
        assertEquals("TỰ LUẬN", dto.getExamType());
        verify(examScheduleRepository, times(1)).save(any(ExamSchedule.class));
    }

    @Test
    @DisplayName("Admin: Tạo lịch thi thất bại khi giờ bắt đầu sau giờ kết thúc")
    void testCreateExamSchedule_InvalidTime() {
        ExamScheduleRequest req = new ExamScheduleRequest();
        req.setClassSectionId(10L);
        req.setExamDate(LocalDate.of(2025, 6, 25));
        req.setStartTime(LocalTime.of(11, 30));
        req.setEndTime(LocalTime.of(10, 0));
        req.setRoomName("P-402");

        assertThrows(BusinessException.class, () -> examScheduleService.createExamSchedule(req));
        verify(examScheduleRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin: Tạo lịch thi thất bại khi lớp học phần không tồn tại")
    void testCreateExamSchedule_SectionNotFound() {
        ExamScheduleRequest req = new ExamScheduleRequest();
        req.setClassSectionId(999L);
        req.setExamDate(LocalDate.of(2025, 6, 25));
        req.setStartTime(LocalTime.of(10, 0));
        req.setEndTime(LocalTime.of(11, 30));
        req.setRoomName("P-402");

        when(classSectionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> examScheduleService.createExamSchedule(req));
    }

    @Test
    @DisplayName("Admin: Cập nhật lịch thi thành công")
    void testUpdateExamSchedule_Success() {
        ExamScheduleRequest req = new ExamScheduleRequest();
        req.setRoomName("HALL-A");
        req.setExamDate(LocalDate.of(2025, 6, 28));

        when(examScheduleRepository.findById(1L)).thenReturn(Optional.of(exam));
        when(examScheduleRepository.save(any(ExamSchedule.class))).thenAnswer(inv -> inv.getArgument(0));

        ExamScheduleDto updated = examScheduleService.updateExamSchedule(1L, req);

        assertNotNull(updated);
        assertEquals("HALL-A", updated.getRoomName());
        assertEquals(LocalDate.of(2025, 6, 28), updated.getExamDate());
    }

    @Test
    @DisplayName("Admin: Xóa lịch thi thành công")
    void testDeleteExamSchedule_Success() {
        when(examScheduleRepository.findById(1L)).thenReturn(Optional.of(exam));

        assertDoesNotThrow(() -> examScheduleService.deleteExamSchedule(1L));
        verify(examScheduleRepository, times(1)).delete(exam);
    }

    @Test
    @DisplayName("Admin: Tự động khởi tạo lịch thi dự thảo cho học kỳ")
    void testAutoGenerateExamSchedules() {
        when(classSectionRepository.findBySemester("2024-25_SEM2")).thenReturn(List.of(section));
        when(examScheduleRepository.existsByClassSectionId(10L)).thenReturn(false);

        int count = examScheduleService.autoGenerateExamSchedules("2024-25_SEM2");

        assertEquals(1, count);
        verify(examScheduleRepository, times(1)).save(any(ExamSchedule.class));
    }

    @Test
    @DisplayName("Admin: Lấy chi tiết lịch thi theo ID thành công")
    void testGetExamScheduleById_Success() {
        when(examScheduleRepository.findById(1L)).thenReturn(Optional.of(exam));

        ExamScheduleDto dto = examScheduleService.getExamScheduleById(1L);

        assertNotNull(dto);
        assertEquals(1L, dto.getId());
        assertEquals("CS101", dto.getCourseCode());
        assertEquals("LAB-301", dto.getRoomName());
        verify(examScheduleRepository, times(1)).findById(1L);
    }

    @Test
    @DisplayName("Admin: Lấy chi tiết lịch thi theo ID ném ResourceNotFoundException nếu không tìm thấy")
    void testGetExamScheduleById_NotFound() {
        when(examScheduleRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> examScheduleService.getExamScheduleById(999L));
    }
}
