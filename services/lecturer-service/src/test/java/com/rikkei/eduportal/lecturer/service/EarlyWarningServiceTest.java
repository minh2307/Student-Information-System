package com.rikkei.eduportal.lecturer.service;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.lecturer.dto.request.DispatchWarningRequest;
import com.rikkei.eduportal.lecturer.dto.response.DispatchWarningResponse;
import com.rikkei.eduportal.lecturer.dto.response.EarlyWarningSummaryResponse;
import com.rikkei.eduportal.lecturer.dto.response.StudentRiskDto;
import com.rikkei.eduportal.lecturer.entity.*;
import com.rikkei.eduportal.lecturer.exception.AccessDeniedException;
import com.rikkei.eduportal.lecturer.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EarlyWarningServiceTest {

    @Mock
    private ClassSectionRepository classSectionRepo;

    @Mock
    private EnrollmentRepository enrollmentRepo;

    @Mock
    private AttendanceSessionRepository attendanceSessionRepo;

    @Mock
    private AttendanceRecordRepository attendanceRecordRepo;

    @Mock
    private GradeRepository gradeRepo;

    @Mock
    private StudentProfileRepository studentProfileRepo;

    @Mock
    private LecturerProfileRepository lecturerProfileRepo;

    @InjectMocks
    private EarlyWarningService earlyWarningService;

    private ClassSection section;
    private LecturerProfile lecturer;
    private StudentProfile student1;
    private StudentProfile student2;
    private Enrollment enrollment1;
    private Enrollment enrollment2;

    @BeforeEach
    void setUp() {
        lecturer = new LecturerProfile();
        lecturer.setId(10L);

        Course course = new Course();
        course.setId(1L);
        course.setCourseCode("CS101");
        course.setName("Lập trình Cơ bản");

        section = new ClassSection();
        section.setId(100L);
        section.setSectionCode("CS101-01");
        section.setCourse(course);
        section.setLecturer(lecturer);

        User user1 = new User();
        user1.setId(1L);
        user1.setFullName("Nguyen Van A");
        user1.setEmail("vana@rikkei.edu.vn");

        student1 = new StudentProfile();
        student1.setId(101L);
        student1.setStudentCode("SV001");
        student1.setUser(user1);

        User user2 = new User();
        user2.setId(2L);
        user2.setFullName("Tran Thi B");
        user2.setEmail("thib@rikkei.edu.vn");

        student2 = new StudentProfile();
        student2.setId(102L);
        student2.setStudentCode("SV002");
        student2.setUser(user2);

        enrollment1 = new Enrollment();
        enrollment1.setId(501L);
        enrollment1.setClassSection(section);
        enrollment1.setStudent(student1);
        enrollment1.setStatus(EnrollmentStatus.REGISTERED);

        enrollment2 = new Enrollment();
        enrollment2.setId(502L);
        enrollment2.setClassSection(section);
        enrollment2.setStudent(student2);
        enrollment2.setStatus(EnrollmentStatus.REGISTERED);
    }

    @Test
    @DisplayName("TC-EWS-01: Phát hiện sinh viên vắng > 20% gán nhãn CRITICAL (Nguy cơ cấm thi)")
    void testEvaluateSectionRisks_AbsenceOver20Percent_FlagsCritical() {
        when(classSectionRepo.findById(100L)).thenReturn(Optional.of(section));
        when(enrollmentRepo.findBySectionIdAndStatus(100L, EnrollmentStatus.REGISTERED))
                .thenReturn(List.of(enrollment1));

        // 5 buổi điểm danh đã diễn ra
        List<AttendanceSession> sessions = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            AttendanceSession s = new AttendanceSession();
            s.setId((long) (i + 1));
            sessions.add(s);
        }
        when(attendanceSessionRepo.findByClassSectionIdOrderByCreatedAtDesc(100L)).thenReturn(sessions);

        // Sinh viên 1 chỉ đi học 2 buổi -> vắng 3/5 buổi (60% vắng)
        AttendanceRecord r1 = new AttendanceRecord();
        r1.setStudent(student1);
        AttendanceRecord r2 = new AttendanceRecord();
        r2.setStudent(student1);
        when(attendanceRecordRepo.findByClassSectionId(100L)).thenReturn(List.of(r1, r2));

        when(gradeRepo.findBySectionId(100L)).thenReturn(Collections.emptyList());

        EarlyWarningSummaryResponse summary = earlyWarningService.evaluateSectionRisks(10L, 100L, false);

        assertNotNull(summary);
        assertEquals(1, summary.getTotalStudents());
        assertEquals(1, summary.getCriticalCount());
        assertEquals(1, summary.getAttendanceRiskCount());

        StudentRiskDto studentRisk = summary.getStudents().get(0);
        assertEquals("CRITICAL", studentRisk.getRiskLevel());
        assertEquals(3, studentRisk.getAbsentSessions());
        assertEquals(0.6, studentRisk.getAbsenceRate());
        assertTrue(studentRisk.getRiskReasons().stream().anyMatch(r -> r.contains("Vượt ngưỡng cấm thi")));
    }

    @Test
    @DisplayName("TC-EWS-02: Phát hiện sinh viên có điểm giữa kỳ < 4.0 gán nhãn cảnh báo học vụ")
    void testEvaluateSectionRisks_LowMidtermScore_FlagsWarning() {
        when(classSectionRepo.findById(100L)).thenReturn(Optional.of(section));
        when(enrollmentRepo.findBySectionIdAndStatus(100L, EnrollmentStatus.REGISTERED))
                .thenReturn(List.of(enrollment2));

        // Không có buổi vắng nào
        when(attendanceSessionRepo.findByClassSectionIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());
        when(attendanceRecordRepo.findByClassSectionId(100L)).thenReturn(Collections.emptyList());

        // Điểm giữa kỳ = 3.5 (< 4.0)
        Grade grade = new Grade();
        grade.setId(99L);
        grade.setEnrollment(enrollment2);
        grade.setMidtermScore(BigDecimal.valueOf(3.5));
        when(gradeRepo.findBySectionId(100L)).thenReturn(List.of(grade));

        EarlyWarningSummaryResponse summary = earlyWarningService.evaluateSectionRisks(10L, 100L, false);

        assertNotNull(summary);
        assertEquals(1, summary.getTotalStudents());
        assertEquals(1, summary.getWarningCount());
        assertEquals(1, summary.getGradeRiskCount());

        StudentRiskDto studentRisk = summary.getStudents().get(0);
        assertEquals("WARNING", studentRisk.getRiskLevel());
        assertTrue(studentRisk.getRiskReasons().stream().anyMatch(r -> r.contains("dưới chuẩn đạt")));
    }

    @Test
    @DisplayName("TC-EWS-03: Kiểm tra phân quyền giảng viên - Không thể xem lớp của giảng viên khác")
    void testEvaluateSectionRisks_UnauthorizedLecturer_ThrowsException() {
        when(classSectionRepo.findById(100L)).thenReturn(Optional.of(section));

        // Giảng viên có ID 999 cố xem lớp của giảng viên 10
        assertThrows(AccessDeniedException.class, () ->
                earlyWarningService.evaluateSectionRisks(999L, 100L, false));
    }

    @Test
    @DisplayName("TC-EWS-04: Bắn cảnh báo 1-chạm (1-Click Dispatch) thành công tới sinh viên nguy cơ")
    void testDispatchWarnings_Success() {
        when(classSectionRepo.findById(100L)).thenReturn(Optional.of(section));
        when(enrollmentRepo.findBySectionIdAndStatus(100L, EnrollmentStatus.REGISTERED))
                .thenReturn(List.of(enrollment1));

        // Giả lập student1 vắng nhiều
        List<AttendanceSession> sessions = List.of(new AttendanceSession(), new AttendanceSession(), new AttendanceSession());
        when(attendanceSessionRepo.findByClassSectionIdOrderByCreatedAtDesc(100L)).thenReturn(sessions);
        when(attendanceRecordRepo.findByClassSectionId(100L)).thenReturn(Collections.emptyList()); // Vắng 100%

        DispatchWarningRequest req = new DispatchWarningRequest();
        req.setSectionId(100L);

        DispatchWarningResponse res = earlyWarningService.dispatchWarnings(10L, req, false);

        assertNotNull(res);
        assertEquals("SENT", res.getStatus());
        assertEquals(1, res.getSentCount());
        assertTrue(res.getRecipientNames().get(0).contains("Nguyen Van A"));
    }
}
