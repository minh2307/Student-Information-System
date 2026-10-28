package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.SlotReservationResponse;
import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.exception.BusinessException;
import com.rikkei.eduportal.enrollment.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Test Suite: Real-time Live Seat Counter & 5-Minute Slot Reservation (RealtimeSeatService)")
class SlotReservationServiceTest {

    @Mock
    private SlotReservationRepository reservationRepo;

    @Mock
    private ClassSectionRepository classSectionRepo;

    @Mock
    private EnrollmentRepository enrollmentRepo;

    @Mock
    private StudentDashboardService dashboardService;

    @InjectMocks
    private RealtimeSeatService realtimeSeatService;

    private StudentProfile student;
    private Course course;
    private ClassSection section;
    private SlotReservation sampleReservation;

    @BeforeEach
    void setUp() {
        student = new StudentProfile();
        student.setId(1L);
        student.setStudentCode("SV2024001");

        course = new Course();
        course.setId(10L);
        course.setCourseCode("CS201");
        course.setName("Cấu trúc dữ liệu");
        course.setCredits(3);

        section = new ClassSection();
        section.setId(100L);
        section.setSectionCode("CS201-01");
        section.setCourse(course);
        section.setMaxCapacity(40);
        section.setCurrentEnrolled(35);
        section.setStatus("OPEN");

        sampleReservation = new SlotReservation(student, section, 5);
        sampleReservation.setId(500L);
    }

    @Test
    @DisplayName("TC-RES-01: Giữ chỗ thành công trong 5 phút khi lớp còn slot khả dụng")
    void testReserveSlot_success() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepo.findById(100L)).thenReturn(Optional.of(section));
        when(reservationRepo.findFirstByStudentIdAndClassSectionIdAndStatus(1L, 100L, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(enrollmentRepo.findByStudentIdAndClassSectionId(1L, 100L)).thenReturn(Optional.empty());
        when(reservationRepo.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(2L);
        // Occupied: 35 enrolled + 2 reserved = 37 < 40 capacity -> Còn 3 chỗ

        when(reservationRepo.save(any(SlotReservation.class))).thenAnswer(i -> {
            SlotReservation r = i.getArgument(0);
            r.setId(500L);
            return r;
        });

        SlotReservationResponse res = realtimeSeatService.reserveSlot("SV2024001", 100L);

        assertThat(res).isNotNull();
        assertThat(res.reservationId()).isEqualTo(500L);
        assertThat(res.sectionCode()).isEqualTo("CS201-01");
        assertThat(res.remainingSeconds()).isBetween(1L, 300L);
        assertThat(res.status()).isEqualTo("ACTIVE");

        verify(reservationRepo, times(1)).save(any(SlotReservation.class));
    }

    @Test
    @DisplayName("TC-RES-02: Đăng ký nhận luồng SSE live-seats thành công")
    void testSubscribeLiveSeats_success() {
        SseEmitter emitter = realtimeSeatService.subscribeLiveSeats();
        assertThat(emitter).isNotNull();
    }

    @Test
    @DisplayName("TC-RES-03: Từ chối giữ chỗ khi lớp đã kín slot (bao gồm cả các chỗ đang được giữ)")
    void testReserveSlot_classFullWithReservations_throwsBusinessException() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepo.findById(100L)).thenReturn(Optional.of(section));
        when(reservationRepo.findFirstByStudentIdAndClassSectionIdAndStatus(1L, 100L, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(enrollmentRepo.findByStudentIdAndClassSectionId(1L, 100L)).thenReturn(Optional.empty());
        when(reservationRepo.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(5L);
        // Occupied: 35 enrolled + 5 reserved = 40 == 40 capacity -> Hết chỗ

        assertThatThrownBy(() -> realtimeSeatService.reserveSlot("SV2024001", 100L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Lớp học phần đã hết chỗ");

        verify(reservationRepo, never()).save(any());
    }

    @Test
    @DisplayName("TC-RES-04: Trả về phiên giữ chỗ hiện tại nếu sinh viên đã giữ chỗ trước đó")
    void testReserveSlot_alreadyHasActiveReservation_returnsExisting() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepo.findById(100L)).thenReturn(Optional.of(section));
        when(reservationRepo.findFirstByStudentIdAndClassSectionIdAndStatus(1L, 100L, "ACTIVE"))
                .thenReturn(Optional.of(sampleReservation));

        SlotReservationResponse res = realtimeSeatService.reserveSlot("SV2024001", 100L);

        assertThat(res).isNotNull();
        assertThat(res.reservationId()).isEqualTo(500L);
        assertThat(res.message()).contains("Bạn đã có phiên giữ chỗ cho lớp này");
        verify(reservationRepo, never()).save(any());
    }

    @Test
    @DisplayName("TC-RES-05: Từ chối giữ chỗ nếu sinh viên đã đăng ký chính thức lớp này")
    void testReserveSlot_alreadyEnrolled_throwsBusinessException() {
        Enrollment registered = new Enrollment();
        registered.setStatus("REGISTERED");

        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepo.findById(100L)).thenReturn(Optional.of(section));
        when(reservationRepo.findFirstByStudentIdAndClassSectionIdAndStatus(1L, 100L, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(enrollmentRepo.findByStudentIdAndClassSectionId(1L, 100L)).thenReturn(Optional.of(registered));

        assertThatThrownBy(() -> realtimeSeatService.reserveSlot("SV2024001", 100L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Bạn đã đăng ký lớp học phần này rồi");
    }

    @Test
    @DisplayName("TC-RES-06: Hủy giữ chỗ thành công và cập nhật trạng thái CANCELLED")
    void testCancelReservation_success() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(reservationRepo.findFirstByStudentIdAndClassSectionIdAndStatus(1L, 100L, "ACTIVE"))
                .thenReturn(Optional.of(sampleReservation));
        when(classSectionRepo.findById(100L)).thenReturn(Optional.of(section));

        realtimeSeatService.cancelReservation("SV2024001", 100L);

        assertThat(sampleReservation.getStatus()).isEqualTo("CANCELLED");
        verify(reservationRepo, times(1)).save(sampleReservation);
    }

    @Test
    @DisplayName("TC-RES-07: Cleanup tự động các phiên giữ chỗ quá 5 phút và giải phóng slot")
    void testCleanupExpiredReservations_success() {
        when(reservationRepo.findExpiredReservations(any(LocalDateTime.class)))
                .thenReturn(List.of(sampleReservation));
        when(classSectionRepo.findById(100L)).thenReturn(Optional.of(section));

        realtimeSeatService.cleanupExpiredReservations();

        assertThat(sampleReservation.getStatus()).isEqualTo("EXPIRED");
        verify(reservationRepo, times(1)).save(sampleReservation);
    }

    @Test
    @DisplayName("TC-RES-08: Đánh dấu COMMITTED khi sinh viên chính thức đăng ký môn học")
    void testMarkCommitted_success() {
        when(reservationRepo.findFirstByStudentIdAndClassSectionIdAndStatus(1L, 100L, "ACTIVE"))
                .thenReturn(Optional.of(sampleReservation));

        realtimeSeatService.markCommitted(1L, 100L);

        assertThat(sampleReservation.getStatus()).isEqualTo("COMMITTED");
        verify(reservationRepo, times(1)).save(sampleReservation);
    }
}
