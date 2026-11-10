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
    @DisplayName("Fix công thức: Sinh viên đăng ký 0 tín chỉ => Học phí và CSVC bằng 0")
    void testZeroCredits_ZeroTuition() {
        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(Collections.emptyList());
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2024-25_SEM2"))
                .thenReturn(Optional.empty());
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> {
            TuitionFee tf = inv.getArgument(0);
            tf.setId(100L);
            return tf;
        });

        TuitionDto result = tuitionService.getStudentTuition("sv2024001", "2024-25_SEM2");

        assertNotNull(result);
        assertEquals(0, result.getTotalCredits());
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getFacilityFee()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getTotalAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getRemainingAmount()));
        assertEquals("PAID", result.getStatus());
        assertEquals("SV2024001", result.getStudentCode());
        assertEquals("Nguyen Van A", result.getStudentName());
    }

    @Test
    @DisplayName("Fix công thức: Sinh viên đăng ký 15 TC => Học phí = 15 * 100 + 1.000 = 2.500 VNĐ")
    void testStandardCredits_CalculatesCorrectFormula() {
        Course course1 = new Course();
        course1.setCourseCode("CS101");
        course1.setName("Lap trinh Java");
        course1.setCredits(4);

        Course course2 = new Course();
        course2.setCourseCode("CS102");
        course2.setName("Cau truc du lieu");
        course2.setCredits(11);

        ClassSection sec1 = new ClassSection();
        sec1.setCourse(course1);
        ClassSection sec2 = new ClassSection();
        sec2.setCourse(course2);

        Enrollment e1 = new Enrollment();
        e1.setClassSection(sec1);
        Enrollment e2 = new Enrollment();
        e2.setClassSection(sec2);

        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(List.of(e1, e2));
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2024-25_SEM2"))
                .thenReturn(Optional.empty());
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> {
            TuitionFee tf = inv.getArgument(0);
            tf.setId(101L);
            return tf;
        });

        TuitionDto result = tuitionService.getStudentTuition("sv2024001", "2024-25_SEM2");

        assertNotNull(result);
        assertEquals(15, result.getTotalCredits());
        // 100 * 15 + 1,000 = 2,500
        BigDecimal expectedTotal = BigDecimal.valueOf(2500.00);
        assertEquals(0, expectedTotal.compareTo(result.getTotalAmount()));
        assertEquals(0, expectedTotal.compareTo(result.getRemainingAmount()));
        assertEquals("UNPAID", result.getStatus());

        // Kiểm tra mã VietQR Napas247 được sinh ra
        assertNotNull(result.getVietQrPayload());
        assertTrue(result.getVietQrPayload().startsWith("000201010212"));
        assertTrue(result.getVietQrPayload().contains("999988882025"));
        assertTrue(result.getVietQrPayload().contains("2500"));
        assertTrue(result.getVietQrPayload().contains("HP SV2024001 2024-25_SEM2"));

        // Kiểm tra QuickLink URL
        assertNotNull(result.getVietQrQuickLink());
        assertTrue(result.getVietQrQuickLink().startsWith("https://img.vietqr.io/image/"));

        // Kiểm tra danh sách ngân hàng hỗ trợ MB Bank và VietinBank
        assertNotNull(result.getSupportedBanks());
        assertEquals(2, result.getSupportedBanks().size());
        assertEquals("970422", result.getSupportedBanks().get(0).getBankBin());
        assertEquals("970415", result.getSupportedBanks().get(1).getBankBin());
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

        TuitionDto result = tuitionService.payTuition("sv2024001", "2024-25_SEM2", "VietQR Napas247");

        assertNotNull(result);
        assertEquals("PAID", result.getStatus());
        assertEquals(0, BigDecimal.valueOf(7050000.00).compareTo(result.getPaidAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getRemainingAmount()));
        assertNotNull(result.getTransactionCode());
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }
}
