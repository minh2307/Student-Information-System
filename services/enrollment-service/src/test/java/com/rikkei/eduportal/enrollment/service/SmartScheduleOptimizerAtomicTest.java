package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.config.ScheduleOptimizerProperties;
import com.rikkei.eduportal.enrollment.dto.*;
import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.exception.BatchReservationException;
import com.rikkei.eduportal.enrollment.exception.BusinessException;
import com.rikkei.eduportal.enrollment.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test Suite: Atomic Batch Reservation (SmartScheduleOptimizerService)")
class SmartScheduleOptimizerAtomicTest {

    @Mock
    private ClassSectionRepository classSectionRepository;

    @Mock
    private RealtimeSeatService realtimeSeatService;

    @Mock
    private SlotReservationRepository slotReservationRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private StudentDashboardService dashboardService;

    @Mock
    private ScheduleOptimizerProperties properties;

    @InjectMocks
    private SmartScheduleOptimizerService optimizerService;

    private StudentProfile student;
    private Course course1;
    private Course course2;
    private Course course3;
    private Course course4;
    private ClassSection section1;
    private ClassSection section2;
    private ClassSection section3;
    private ClassSection section4;

    @BeforeEach
    void setUp() {
        student = new StudentProfile();
        student.setId(1L);
        student.setStudentCode("SV2024001");

        course1 = createCourse(101L, "CS101", "Nhập môn Lập trình");
        course2 = createCourse(102L, "CS102", "Cấu trúc dữ liệu");
        course3 = createCourse(103L, "CS103", "Cơ sở dữ liệu");
        course4 = createCourse(104L, "CS104", "Digital Signal Processing");

        section1 = createSection(1L, "CS101-01", course1, 40, 10, "OPEN");
        section2 = createSection(2L, "CS102-01", course2, 40, 15, "OPEN");
        section3 = createSection(3L, "CS103-01", course3, 40, 20, "OPEN");
        section4 = createSection(4L, "CS104-01", course4, 40, 40, "OPEN"); // Đầy chỗ
    }

    private Course createCourse(Long id, String code, String name) {
        Course c = new Course();
        c.setId(id);
        c.setCourseCode(code);
        c.setName(name);
        c.setCredits(3);
        c.setWeeklyHours(3);
        return c;
    }

    private ClassSection createSection(Long id, String sectionCode, Course course, int capacity, int enrolled, String status) {
        ClassSection cs = new ClassSection();
        cs.setId(id);
        cs.setSectionCode(sectionCode);
        cs.setCourse(course);
        cs.setMaxCapacity(capacity);
        cs.setCurrentEnrolled(enrolled);
        cs.setStatus(status);
        cs.setSemesterName("2024-25_SEM2");
        cs.setDayOfWeek("MON");
        cs.setStartTime(LocalTime.of(8, 0));
        cs.setEndTime(LocalTime.of(10, 30));
        cs.setRoomName("A101");
        return cs;
    }

    @Test
    @DisplayName("Test 1 — Successful Batch Reservation: Combo 4 môn đều còn chỗ -> Thành công và tạo đủ 4 reservation")
    void testSuccessfulBatchReservation_4Courses() {
        // Section 4 còn 5 chỗ trống (35/40)
        section4.setCurrentEnrolled(35);

        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(1L)).thenReturn(Optional.of(section1));
        when(classSectionRepository.findByIdWithLock(2L)).thenReturn(Optional.of(section2));
        when(classSectionRepository.findByIdWithLock(3L)).thenReturn(Optional.of(section3));
        when(classSectionRepository.findByIdWithLock(4L)).thenReturn(Optional.of(section4));

        when(slotReservationRepository.countActiveReservations(anyLong(), any(LocalDateTime.class))).thenReturn(0L);
        when(enrollmentRepository.findByStudentIdAndClassSectionId(eq(1L), anyLong())).thenReturn(Optional.empty());
        when(enrollmentRepository.findAllByStudentId(1L)).thenReturn(Collections.emptyList());

        when(slotReservationRepository.save(any(SlotReservation.class))).thenAnswer(invocation -> {
            SlotReservation r = invocation.getArgument(0);
            r.setId(new Random().nextLong(1000, 9999));
            return r;
        });

        BatchReserveRequest request = new BatchReserveRequest(Arrays.asList(1L, 2L, 3L, 4L));
        BatchReserveResponse response = optimizerService.batchReserveSlots("SV2024001", request);

        assertThat(response).isNotNull();
        assertThat(response.getSuccessCount()).isEqualTo(4);
        assertThat(response.getFailedCount()).isEqualTo(0);
        assertThat(response.getReservations()).hasSize(4);
        verify(slotReservationRepository, times(4)).save(any(SlotReservation.class));
    }

    @Test
    @DisplayName("Test 2 — Last Course Full: Môn thứ 4 hết chỗ -> Ném BatchReservationException và xác định đúng môn thứ 4")
    void testLastCourseFull_ThrowsBatchReservationException() {
        // Section 1, 2, 3 còn chỗ. Section 4 đã đầy (40/40)
        section4.setCurrentEnrolled(40);

        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(1L)).thenReturn(Optional.of(section1));
        when(classSectionRepository.findByIdWithLock(2L)).thenReturn(Optional.of(section2));
        when(classSectionRepository.findByIdWithLock(3L)).thenReturn(Optional.of(section3));
        when(classSectionRepository.findByIdWithLock(4L)).thenReturn(Optional.of(section4));

        when(slotReservationRepository.countActiveReservations(anyLong(), any(LocalDateTime.class))).thenReturn(0L);
        when(enrollmentRepository.findByStudentIdAndClassSectionId(eq(1L), anyLong())).thenReturn(Optional.empty());
        when(enrollmentRepository.findAllByStudentId(1L)).thenReturn(Collections.emptyList());

        BatchReserveRequest request = new BatchReserveRequest(Arrays.asList(1L, 2L, 3L, 4L));

        assertThatThrownBy(() -> optimizerService.batchReserveSlots("SV2024001", request))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertThat(bre.getCode()).isEqualTo("BATCH_RESERVATION_FAILED");
                    assertThat(bre.getDetails()).isNotNull();
                    assertThat(bre.getDetails().getFailedCourseId()).isEqualTo("CS104");
                    assertThat(bre.getDetails().getFailedCourseName()).isEqualTo("Digital Signal Processing");
                    assertThat(bre.getDetails().getReason()).isEqualTo("NO_AVAILABLE_SLOTS");
                    assertThat(bre.getDetails().getMessage()).isEqualTo("Học phần đã hết chỗ.");
                });

        // Tuyệt đối không lưu reservation nào khi môn thứ 4 hết chỗ
        verify(slotReservationRepository, never()).save(any(SlotReservation.class));
    }

    @Test
    @DisplayName("Test 3 — Middle Course Full: Môn thứ 2 hết chỗ -> Ném exception ngay tại môn thứ 2, môn 3 và 4 không được xử lý")
    void testMiddleCourseFull_ThrowsExceptionAtMiddleCourse() {
        section2.setCurrentEnrolled(40); // Môn 2 hết chỗ

        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(1L)).thenReturn(Optional.of(section1));
        when(classSectionRepository.findByIdWithLock(2L)).thenReturn(Optional.of(section2));
        when(classSectionRepository.findByIdWithLock(3L)).thenReturn(Optional.of(section3));
        when(classSectionRepository.findByIdWithLock(4L)).thenReturn(Optional.of(section4));

        when(slotReservationRepository.countActiveReservations(eq(1L), any(LocalDateTime.class))).thenReturn(0L);
        when(slotReservationRepository.countActiveReservations(eq(2L), any(LocalDateTime.class))).thenReturn(0L);
        when(enrollmentRepository.findByStudentIdAndClassSectionId(eq(1L), anyLong())).thenReturn(Optional.empty());
        when(enrollmentRepository.findAllByStudentId(1L)).thenReturn(Collections.emptyList());

        BatchReserveRequest request = new BatchReserveRequest(Arrays.asList(1L, 2L, 3L, 4L));

        assertThatThrownBy(() -> optimizerService.batchReserveSlots("SV2024001", request))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertThat(bre.getDetails().getFailedCourseId()).isEqualTo("CS102");
                    assertThat(bre.getDetails().getReason()).isEqualTo("NO_AVAILABLE_SLOTS");
                });

        verify(slotReservationRepository, never()).save(any(SlotReservation.class));
    }

    @Test
    @DisplayName("Test 5 — Duplicate Course: Request chứa cùng một mã lớp nhiều lần -> Từ chối và không tạo reservation")
    void testDuplicateCourse_SameSectionId() {
        BatchReserveRequest request = new BatchReserveRequest(Arrays.asList(1L, 2L, 1L));

        assertThatThrownBy(() -> optimizerService.batchReserveSlots("SV2024001", request))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertThat(bre.getDetails().getReason()).isEqualTo("DUPLICATE_COURSE");
                });

        verify(slotReservationRepository, never()).save(any(SlotReservation.class));
    }

    @Test
    @DisplayName("Test 5b — Duplicate Course: Combo chứa 2 lớp khác nhau nhưng cùng thuộc một môn học -> Từ chối")
    void testDuplicateCourse_DifferentSectionsSameCourse() {
        ClassSection section1Duplicate = createSection(11L, "CS101-02", course1, 40, 10, "OPEN");

        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(1L)).thenReturn(Optional.of(section1));
        when(classSectionRepository.findByIdWithLock(11L)).thenReturn(Optional.of(section1Duplicate));

        BatchReserveRequest request = new BatchReserveRequest(Arrays.asList(1L, 11L));

        assertThatThrownBy(() -> optimizerService.batchReserveSlots("SV2024001", request))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertThat(bre.getDetails().getReason()).isEqualTo("DUPLICATE_COURSE");
                    assertThat(bre.getDetails().getFailedCourseId()).isEqualTo("CS101");
                });

        verify(slotReservationRepository, never()).save(any(SlotReservation.class));
    }

    @Test
    @DisplayName("Test 7 — Existing Enrollment Conflict: Sinh viên đã đăng ký một môn trong combo -> Từ chối toàn bộ combo")
    void testExistingEnrollmentConflict_StudentAlreadyEnrolled() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(1L)).thenReturn(Optional.of(section1));
        when(classSectionRepository.findByIdWithLock(2L)).thenReturn(Optional.of(section2));

        // Sinh viên đã đăng ký chính thức lớp 1
        Enrollment enrollment = new Enrollment();
        enrollment.setId(99L);
        enrollment.setStudent(student);
        enrollment.setClassSection(section1);
        enrollment.setStatus("REGISTERED");

        when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 1L)).thenReturn(Optional.of(enrollment));

        BatchReserveRequest request = new BatchReserveRequest(Arrays.asList(1L, 2L));

        assertThatThrownBy(() -> optimizerService.batchReserveSlots("SV2024001", request))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertThat(bre.getDetails().getReason()).isEqualTo("ALREADY_ENROLLED");
                    assertThat(bre.getDetails().getFailedCourseId()).isEqualTo("CS101");
                });

        verify(slotReservationRepository, never()).save(any(SlotReservation.class));
    }

    @Test
    @DisplayName("Validation: Request rỗng hoặc null -> Ném BusinessException 400")
    void testValidation_EmptyRequest() {
        assertThatThrownBy(() -> optimizerService.batchReserveSlots("SV2024001", null))
                .isInstanceOf(BusinessException.class);

        assertThatThrownBy(() -> optimizerService.batchReserveSlots("SV2024001", new BatchReserveRequest(Collections.emptyList())))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("Validation: Request vượt quá 4 môn học -> Ném MAX_LIMIT_EXCEEDED")
    void testValidation_MaxLimitExceeded() {
        BatchReserveRequest request = new BatchReserveRequest(Arrays.asList(1L, 2L, 3L, 4L, 5L));

        assertThatThrownBy(() -> optimizerService.batchReserveSlots("SV2024001", request))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertThat(bre.getDetails().getReason()).isEqualTo("MAX_LIMIT_EXCEEDED");
                });
    }

    @Test
    @DisplayName("Validation: Lớp học phần ở trạng thái CLOSED -> Báo lỗi SECTION_CLOSED")
    void testSectionClosed_ThrowsException() {
        section2.setStatus("CLOSED");

        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(1L)).thenReturn(Optional.of(section1));
        when(classSectionRepository.findByIdWithLock(2L)).thenReturn(Optional.of(section2));

        BatchReserveRequest request = new BatchReserveRequest(Arrays.asList(1L, 2L));

        assertThatThrownBy(() -> optimizerService.batchReserveSlots("SV2024001", request))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertThat(bre.getDetails().getReason()).isEqualTo("SECTION_CLOSED");
                });
    }
}
