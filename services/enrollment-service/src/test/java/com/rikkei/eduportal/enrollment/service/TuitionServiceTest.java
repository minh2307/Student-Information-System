package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.TuitionDto;
import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.repository.EnrollmentRepository;
import com.rikkei.eduportal.enrollment.repository.NotificationRepository;
import com.rikkei.eduportal.enrollment.repository.StudentProfileRepository;
import com.rikkei.eduportal.enrollment.repository.TuitionFeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TuitionServiceTest {

    @Mock
    private TuitionFeeRepository tuitionFeeRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private StudentDashboardService dashboardService;

    @InjectMocks
    private TuitionService tuitionService;

    private StudentProfile sampleStudent;
    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = new User();
        sampleUser.setId(10L);
        sampleUser.setUsername("sv2024001");
        sampleUser.setFullName("Nguyen Van A");

        sampleStudent = new StudentProfile();
        sampleStudent.setId(1L);
        sampleStudent.setStudentCode("SV2024001");
        sampleStudent.setUser(sampleUser);
    }

    @Test
    @DisplayName("STT 1 & 9: Chưa đăng ký môn hoặc học kỳ tương lai chưa đăng ký => Không phát sinh học phí & Không lưu hóa đơn DB")
    void testZeroCredits_ZeroTuition() {
        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2025-26_SEM1"))
                .thenReturn(Collections.emptyList());
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2025-26_SEM1"))
                .thenReturn(Optional.empty());

        TuitionDto result = tuitionService.getStudentTuition("sv2024001", "2025-26_SEM1");

        assertNotNull(result);
        assertEquals(0, result.getTotalCredits());
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getFacilityFee()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getTotalAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getPaidAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getRemainingAmount()));
        assertEquals("NOT_ENROLLED", result.getStatus());
        assertEquals("SV2024001", result.getStudentCode());
        assertEquals("Nguyen Van A", result.getStudentName());
        assertTrue(result.getCourses().isEmpty());
        assertNull(result.getVietQrPayload());
        assertTrue(result.getSupportedBanks().isEmpty());

        // Đảm bảo không tự động sinh bản ghi hóa đơn rỗng trong CSDL
        verify(tuitionFeeRepository, never()).save(any(TuitionFee.class));
    }

    @Test
    @DisplayName("STT 2: Đăng ký 3 TC, đơn giá 450.000đ => Học phí học phần 1.350.000đ + Phí CSVC 300.000đ = 1.650.000đ")
    void testRegister3Credits_CalculatesCorrectFormula() {
        Course course = new Course();
        course.setId(10L);
        course.setCourseCode("CS101");
        course.setName("Lap trinh can ban");
        course.setCredits(3);

        ClassSection sec = new ClassSection();
        sec.setCourse(course);

        Enrollment e = new Enrollment();
        e.setClassSection(sec);
        e.setStatus("REGISTERED");

        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(List.of(e));
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2024-25_SEM2"))
                .thenReturn(Optional.empty());
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> inv.getArgument(0));

        TuitionDto result = tuitionService.getStudentTuition("sv2024001", "2024-25_SEM2");

        assertNotNull(result);
        assertEquals(3, result.getTotalCredits());
        // 3 * 450.000 = 1.350.000 đ; Phí CSVC: 300.000 đ; Tổng: 1.650.000 đ
        assertEquals(0, BigDecimal.valueOf(1650000.00).compareTo(result.getTotalAmount()));
        assertEquals(0, BigDecimal.valueOf(300000.00).compareTo(result.getFacilityFee()));
        assertEquals(0, BigDecimal.valueOf(1650000.00).compareTo(result.getRemainingAmount()));
        assertEquals("UNPAID", result.getStatus());
        assertEquals(1, result.getCourses().size());
        assertEquals("CS101", result.getCourses().get(0).getCourseCode());
        assertEquals(0, BigDecimal.valueOf(1350000.00).compareTo(result.getCourses().get(0).getFee()));
    }

    @Test
    @DisplayName("STT 3: Đăng ký 12 TC => Học phí học phần 5.400.000đ + Phí CSVC 300.000đ = 5.700.000đ")
    void testRegister12Credits_CalculatesCorrectFormula() {
        Course c1 = new Course(); c1.setId(1L); c1.setCourseCode("CS201"); c1.setCredits(3);
        Course c2 = new Course(); c2.setId(2L); c2.setCourseCode("CS301"); c2.setCredits(3);
        Course c3 = new Course(); c3.setId(3L); c3.setCourseCode("CS302"); c3.setCredits(3);
        Course c4 = new Course(); c4.setId(4L); c4.setCourseCode("SEC201"); c4.setCredits(3);

        ClassSection s1 = new ClassSection(); s1.setCourse(c1);
        ClassSection s2 = new ClassSection(); s2.setCourse(c2);
        ClassSection s3 = new ClassSection(); s3.setCourse(c3);
        ClassSection s4 = new ClassSection(); s4.setCourse(c4);

        Enrollment e1 = new Enrollment(); e1.setClassSection(s1);
        Enrollment e2 = new Enrollment(); e2.setClassSection(s2);
        Enrollment e3 = new Enrollment(); e3.setClassSection(s3);
        Enrollment e4 = new Enrollment(); e4.setClassSection(s4);

        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM1"))
                .thenReturn(List.of(e1, e2, e3, e4));
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2024-25_SEM1"))
                .thenReturn(Optional.empty());
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> inv.getArgument(0));

        TuitionDto result = tuitionService.getStudentTuition("sv2024001", "2024-25_SEM1");

        assertNotNull(result);
        assertEquals(12, result.getTotalCredits());
        // 12 * 450.000 + 300.000 = 5.700.000 đ
        assertEquals(0, BigDecimal.valueOf(5700000.00).compareTo(result.getTotalAmount()));
        assertEquals(0, BigDecimal.valueOf(5700000.00).compareTo(result.getRemainingAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getPaidAmount()));
        assertEquals("UNPAID", result.getStatus());
        assertEquals(4, result.getCourses().size());
    }

    @Test
    @DisplayName("STT 4: Đã thanh toán đủ => Công nợ còn lại bằng 0đ, trạng thái PAID")
    void testPaidInFull_ZeroRemainingDebt() {
        TuitionFee existing = new TuitionFee();
        existing.setId(10L);
        existing.setSemesterName("2024-25_SEM2");
        existing.setTotalCredits(12);
        existing.setTotalAmount(BigDecimal.valueOf(5700000.00));
        existing.setPaidAmount(BigDecimal.valueOf(5700000.00));
        existing.setStatus("PAID");
        existing.setTransactionCode("SIM-PAYOS-1793861851549");

        Course c1 = new Course(); c1.setId(1L); c1.setCredits(12);
        ClassSection s1 = new ClassSection(); s1.setCourse(c1);
        Enrollment e1 = new Enrollment(); e1.setClassSection(s1);

        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(List.of(e1));
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2024-25_SEM2"))
                .thenReturn(Optional.of(existing));
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> inv.getArgument(0));

        TuitionDto result = tuitionService.getStudentTuition("sv2024001", "2024-25_SEM2");

        assertEquals(0, BigDecimal.valueOf(5700000.00).compareTo(result.getTotalAmount()));
        assertEquals(0, BigDecimal.valueOf(5700000.00).compareTo(result.getPaidAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getRemainingAmount()));
        assertEquals("PAID", result.getStatus());
        assertEquals("SIM-PAYOS-1793861851549", result.getTransactionCode());
    }

    @Test
    @DisplayName("STT 5: Chưa thanh toán => Công nợ bằng đúng tổng học phí, trạng thái UNPAID")
    void testUnpaid_RemainingEqualsTotal() {
        Course c1 = new Course(); c1.setId(1L); c1.setCredits(6);
        ClassSection s1 = new ClassSection(); s1.setCourse(c1);
        Enrollment e1 = new Enrollment(); e1.setClassSection(s1);

        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(List.of(e1));
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2024-25_SEM2"))
                .thenReturn(Optional.empty());
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> inv.getArgument(0));

        TuitionDto result = tuitionService.getStudentTuition("sv2024001", "2024-25_SEM2");

        // 6 * 450.000 + 300.000 = 3.000.000 đ
        BigDecimal expected = BigDecimal.valueOf(3000000.00);
        assertEquals(0, expected.compareTo(result.getTotalAmount()));
        assertEquals(0, expected.compareTo(result.getRemainingAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getPaidAmount()));
        assertEquals("UNPAID", result.getStatus());
    }

    @Test
    @DisplayName("STT 6: Thanh toán một phần => Công nợ bằng tổng học phí trừ số tiền đã thanh toán, trạng thái PARTIAL")
    void testPartialPayment_RemainingDebtIsAccurate() {
        TuitionFee existing = new TuitionFee();
        existing.setId(20L);
        existing.setSemesterName("2024-25_SEM2");
        existing.setTotalCredits(10);
        existing.setTotalAmount(BigDecimal.valueOf(4800000.00));
        existing.setPaidAmount(BigDecimal.valueOf(2000000.00)); // Đã thanh toán 2.000.000 đ
        existing.setStatus("PARTIAL");

        Course c1 = new Course(); c1.setId(1L); c1.setCredits(10);
        ClassSection s1 = new ClassSection(); s1.setCourse(c1);
        Enrollment e1 = new Enrollment(); e1.setClassSection(s1);

        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(List.of(e1));
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2024-25_SEM2"))
                .thenReturn(Optional.of(existing));
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> inv.getArgument(0));

        TuitionDto result = tuitionService.getStudentTuition("sv2024001", "2024-25_SEM2");

        assertEquals(0, BigDecimal.valueOf(4800000.00).compareTo(result.getTotalAmount()));
        assertEquals(0, BigDecimal.valueOf(2000000.00).compareTo(result.getPaidAmount()));
        // Còn phải nộp: 4.800.000 - 2.000.000 = 2.800.000 đ
        assertEquals(0, BigDecimal.valueOf(2800000.00).compareTo(result.getRemainingAmount()));
        assertEquals("PARTIAL", result.getStatus());
    }

    @Test
    @DisplayName("Bổ sung & Deduplicate: Truy vấn chứa 2 bản ghi cùng 1 môn học => Tự động deduplicate, không cộng trùng học phí")
    void testDeduplicateCourseInSameSemester() {
        Course c1 = new Course(); c1.setId(101L); c1.setCourseCode("AI101"); c1.setName("AI Basics"); c1.setCredits(3);

        ClassSection s1 = new ClassSection(); s1.setId(1L); s1.setCourse(c1);
        ClassSection s2 = new ClassSection(); s2.setId(2L); s2.setCourse(c1); // Khác lớp nhưng cùng môn AI101

        Enrollment e1 = new Enrollment(); e1.setClassSection(s1);
        Enrollment e2 = new Enrollment(); e2.setClassSection(s2);

        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(List.of(e1, e2));
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2024-25_SEM2"))
                .thenReturn(Optional.empty());
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> inv.getArgument(0));

        TuitionDto result = tuitionService.getStudentTuition("sv2024001", "2024-25_SEM2");

        // AI101 chỉ được tính 1 lần (3 TC, không phải 6 TC)
        assertEquals(3, result.getTotalCredits());
        assertEquals(1, result.getCourses().size());
        assertEquals(0, BigDecimal.valueOf(1650000.00).compareTo(result.getTotalAmount()));
    }

    @Test
    @DisplayName("Đăng ký bổ sung học phần sau khi đã thanh toán => Chuyển sang PARTIAL với số tiền nợ tăng thêm")
    void testAddMoreCoursesAfterPayment_BecomesPartial() {
        // Hóa đơn cũ: 6 TC đã thanh toán đủ 3.000.000 đ
        TuitionFee existing = new TuitionFee();
        existing.setId(30L);
        existing.setSemesterName("2024-25_SEM2");
        existing.setTotalCredits(6);
        existing.setTotalAmount(BigDecimal.valueOf(3000000.00));
        existing.setPaidAmount(BigDecimal.valueOf(3000000.00));
        existing.setStatus("PAID");

        // Hiện tại: Sinh viên đăng ký thêm 3 TC => Tổng 9 TC
        Course c1 = new Course(); c1.setId(1L); c1.setCredits(6);
        Course c2 = new Course(); c2.setId(2L); c2.setCredits(3);
        ClassSection s1 = new ClassSection(); s1.setCourse(c1);
        ClassSection s2 = new ClassSection(); s2.setCourse(c2);
        Enrollment e1 = new Enrollment(); e1.setClassSection(s1);
        Enrollment e2 = new Enrollment(); e2.setClassSection(s2);

        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(List.of(e1, e2));
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2024-25_SEM2"))
                .thenReturn(Optional.of(existing));
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> inv.getArgument(0));

        TuitionDto result = tuitionService.getStudentTuition("sv2024001", "2024-25_SEM2");

        // 9 TC * 450.000 + 300.000 = 4.350.000 đ
        assertEquals(9, result.getTotalCredits());
        assertEquals(0, BigDecimal.valueOf(4350000.00).compareTo(result.getTotalAmount()));
        assertEquals(0, BigDecimal.valueOf(3000000.00).compareTo(result.getPaidAmount()));
        // Nợ thêm: 4.350.000 - 3.000.000 = 1.350.000 đ
        assertEquals(0, BigDecimal.valueOf(1350000.00).compareTo(result.getRemainingAmount()));
        assertEquals("PARTIAL", result.getStatus());
    }

    @Test
    @DisplayName("Hủy bớt học phần sau khi đã thanh toán => Vẫn giữ trạng thái PAID và công nợ 0đ")
    void testDropCourseAfterPayment_KeepsPaidAndZeroRemaining() {
        // Hóa đơn cũ: 9 TC đã nộp 4.350.000 đ
        TuitionFee existing = new TuitionFee();
        existing.setId(40L);
        existing.setSemesterName("2024-25_SEM2");
        existing.setTotalCredits(9);
        existing.setTotalAmount(BigDecimal.valueOf(4350000.00));
        existing.setPaidAmount(BigDecimal.valueOf(4350000.00));
        existing.setStatus("PAID");

        // Hiện tại hủy bớt 3 TC còn 6 TC => Học phí mới là 3.000.000 đ
        Course c1 = new Course(); c1.setId(1L); c1.setCredits(6);
        ClassSection s1 = new ClassSection(); s1.setCourse(c1);
        Enrollment e1 = new Enrollment(); e1.setClassSection(s1);

        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(List.of(e1));
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2024-25_SEM2"))
                .thenReturn(Optional.of(existing));
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> inv.getArgument(0));

        TuitionDto result = tuitionService.getStudentTuition("sv2024001", "2024-25_SEM2");

        assertEquals(6, result.getTotalCredits());
        assertEquals(0, BigDecimal.valueOf(3000000.00).compareTo(result.getTotalAmount()));
        assertEquals(0, BigDecimal.valueOf(4350000.00).compareTo(result.getPaidAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getRemainingAmount()));
        assertEquals(0, BigDecimal.valueOf(1350000.00).compareTo(result.getExcessAmount()));
        assertEquals("PAID", result.getStatus());
    }

    @Test
    @DisplayName("Hủy toàn bộ học phần sau khi đã nộp tiền => Giữ nguyên lịch sử, công nợ 0đ, toàn bộ tiền được ghi nhận excessAmount")
    void testDropAllCoursesAfterPayment_PreservesPaidAndRecordsFullExcess() {
        // Hóa đơn cũ: 9 TC đã nộp 4.350.000 đ, có transaction_code
        TuitionFee existing = new TuitionFee();
        existing.setId(45L);
        existing.setSemesterName("2024-25_SEM2");
        existing.setTotalCredits(9);
        existing.setTotalAmount(BigDecimal.valueOf(4350000.00));
        existing.setPaidAmount(BigDecimal.valueOf(4350000.00));
        existing.setStatus("PAID");
        existing.setTransactionCode("PAYOS-REF-998877");

        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(Collections.emptyList());
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2024-25_SEM2"))
                .thenReturn(Optional.of(existing));
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> inv.getArgument(0));

        TuitionDto result = tuitionService.getStudentTuition("sv2024001", "2024-25_SEM2");

        assertEquals(0, result.getTotalCredits());
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getTotalAmount()));
        assertEquals(0, BigDecimal.valueOf(4350000.00).compareTo(result.getPaidAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getRemainingAmount()));
        assertEquals(0, BigDecimal.valueOf(4350000.00).compareTo(result.getExcessAmount()));
        assertEquals("PAID", result.getStatus());
        assertEquals("PAYOS-REF-998877", result.getTransactionCode());
    }

    @Test
    @DisplayName("Thanh toán học phí khi chưa đăng ký môn nào => Ném ngoại lệ IllegalStateException")
    void testPayTuitionWhenNoCredits_ThrowsException() {
        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2025-26_SEM1"))
                .thenReturn(Optional.empty());
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2025-26_SEM1"))
                .thenReturn(Collections.emptyList());

        assertThrows(IllegalStateException.class, () -> {
            tuitionService.payTuition("sv2024001", "2025-26_SEM1", "VietQR Napas247");
        });
    }

    @Test
    @DisplayName("Thanh toán học phí thành công cập nhật trạng thái PAID và lưu thông báo")
    void testPayTuitionSuccess() {
        TuitionFee existing = new TuitionFee();
        existing.setId(200L);
        existing.setStudent(sampleStudent);
        existing.setSemesterName("2024-25_SEM2");
        existing.setTotalCredits(15);
        existing.setTotalAmount(BigDecimal.valueOf(7050000.00));
        existing.setPaidAmount(BigDecimal.ZERO);
        existing.setStatus("UNPAID");

        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2024-25_SEM2"))
                .thenReturn(Optional.of(existing));
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> inv.getArgument(0));

        // When getStudentTuition is called at the end
        Course c1 = new Course(); c1.setId(1L); c1.setCredits(15);
        ClassSection s1 = new ClassSection(); s1.setCourse(c1);
        Enrollment e1 = new Enrollment(); e1.setClassSection(s1);
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(List.of(e1));

        TuitionDto result = tuitionService.payTuition("sv2024001", "2024-25_SEM2", "VietQR Napas247");

        assertNotNull(result);
        assertEquals("PAID", result.getStatus());
        assertEquals(0, BigDecimal.valueOf(7050000.00).compareTo(result.getPaidAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getRemainingAmount()));
        assertNotNull(result.getTransactionCode());
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }
}
