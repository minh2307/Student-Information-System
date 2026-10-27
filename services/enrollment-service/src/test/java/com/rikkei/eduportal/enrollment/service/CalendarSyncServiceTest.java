package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.repository.EnrollmentRepository;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CalendarSyncServiceTest {

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private ExamScheduleRepository examScheduleRepository;

    @Mock
    private StudentDashboardService dashboardService;

    @InjectMocks
    private CalendarSyncService calendarSyncService;

    private StudentProfile sampleStudent;
    private Enrollment sampleEnrollment;
    private ExamSchedule sampleExam;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(1L);
        user.setFullName("Nguyen Van A");
        user.setEmail("nguyenvana@rikkei.edu.vn");

        sampleStudent = new StudentProfile();
        sampleStudent.setId(10L);
        sampleStudent.setStudentCode("SV2024001");
        sampleStudent.setUser(user);

        Course course = new Course();
        course.setId(100L);
        course.setCourseCode("CS101");
        course.setName("Lap trinh Java");
        course.setCredits(3);

        ClassSection section = new ClassSection();
        section.setId(500L);
        section.setSectionCode("CS101-01");
        section.setCourse(course);
        section.setDayOfWeek("MON");
        section.setStartTime(LocalTime.of(9, 0));
        section.setEndTime(LocalTime.of(10, 30));
        section.setRoomName("Room A-204");
        section.setSemesterName("2024-25_SEM2");

        sampleEnrollment = new Enrollment();
        sampleEnrollment.setId(1000L);
        sampleEnrollment.setStudent(sampleStudent);
        sampleEnrollment.setClassSection(section);
        sampleEnrollment.setStatus("REGISTERED");

        sampleExam = new ExamSchedule();
        sampleExam.setId(2000L);
        sampleExam.setClassSection(section);
        sampleExam.setExamDate(LocalDate.of(2026, 12, 15));
        sampleExam.setStartTime(LocalTime.of(8, 0));
        sampleExam.setEndTime(LocalTime.of(9, 30));
        sampleExam.setRoomName("Room Exam-B1");
        sampleExam.setExamType("Thi Cuối Kỳ");
        sampleExam.setNotes("Có mặt trước 15 phút");
    }

    @Test
    @DisplayName("TC-CAL-01: Sinh token đồng bộ Calendar hợp lệ theo mã sinh viên")
    void testGenerateCalendarFeedToken_ReturnsValidToken() {
        String token1 = calendarSyncService.generateCalendarFeedToken("SV2024001");
        String token2 = calendarSyncService.generateCalendarFeedToken("SV2024001");

        assertNotNull(token1);
        assertFalse(token1.trim().isEmpty());
        assertEquals(token1, token2, "Token phải có tính xác định (deterministic) cho cùng mã SV");
    }

    @Test
    @DisplayName("TC-CAL-02: Xác thực token hợp lệ và từ chối token sai")
    void testValidateCalendarFeedToken() {
        String validToken = calendarSyncService.generateCalendarFeedToken("SV2024001");

        assertTrue(calendarSyncService.validateCalendarFeedToken("SV2024001", validToken));
        assertFalse(calendarSyncService.validateCalendarFeedToken("SV2024001", "wrong_token_123"));
        assertFalse(calendarSyncService.validateCalendarFeedToken("SV2024001", null));
        assertFalse(calendarSyncService.validateCalendarFeedToken("SV2024002", validToken));
    }

    @Test
    @DisplayName("TC-CAL-03: Tạo chuỗi .ics chuẩn RFC 5545 chứa cả lịch học định kỳ và lịch thi")
    void testGenerateIcsCalendar_WithClassesAndExams() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudent(10L)).thenReturn(List.of(sampleEnrollment));
        when(examScheduleRepository.findExamSchedulesByStudent(10L, null)).thenReturn(List.of(sampleExam));

        String ics = calendarSyncService.generateIcsCalendar("SV2024001", null);

        assertNotNull(ics);
        assertTrue(ics.startsWith("BEGIN:VCALENDAR\r\n"));
        assertTrue(ics.endsWith("END:VCALENDAR\r\n"));

        // Header metadata
        assertTrue(ics.contains("PRODID:-//Rikkei Academy//Rikkei EduPortal SIS//VI"));
        assertTrue(ics.contains("X-WR-TIMEZONE:Asia/Ho_Chi_Minh"));
        assertTrue(ics.contains("X-WR-CALNAME:Lịch Học & Thi - Nguyen Van A (SV2024001)"));

        // Class Section VEVENT
        assertTrue(ics.contains("SUMMARY:CS101 - Lap trinh Java (CS101-01)"));
        assertTrue(ics.contains("RRULE:FREQ=WEEKLY;COUNT=15"));
        assertTrue(ics.contains("LOCATION:Room A-204\\, Rikkei Academy"));
        assertTrue(ics.contains("STATUS:CONFIRMED"));

        // Exam VEVENT
        assertTrue(ics.contains("SUMMARY:[LỊCH THI] CS101 - Thi Cuối Kỳ"));
        assertTrue(ics.contains("LOCATION:Room Exam-B1"));
        assertTrue(ics.contains("Ghi chú: Có mặt trước 15 phút"));
    }

    @Test
    @DisplayName("TC-CAL-04: Tạo file .ics rỗng nếu sinh viên chưa đăng ký môn nào")
    void testGenerateIcsCalendar_EmptyEnrollments() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudent(10L)).thenReturn(Collections.emptyList());
        when(examScheduleRepository.findExamSchedulesByStudent(10L, null)).thenReturn(Collections.emptyList());

        String ics = calendarSyncService.generateIcsCalendar("SV2024001", null);

        assertNotNull(ics);
        assertTrue(ics.startsWith("BEGIN:VCALENDAR"));
        assertTrue(ics.endsWith("END:VCALENDAR\r\n"));
        assertFalse(ics.contains("BEGIN:VEVENT"), "Không có lớp học hay kỳ thi thì không có khối VEVENT");
    }
}
