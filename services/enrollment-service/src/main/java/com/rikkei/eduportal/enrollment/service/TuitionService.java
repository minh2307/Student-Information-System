package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.TuitionDto;
import com.rikkei.eduportal.enrollment.entity.Enrollment;
import com.rikkei.eduportal.enrollment.entity.Notification;
import com.rikkei.eduportal.enrollment.entity.StudentProfile;
import com.rikkei.eduportal.enrollment.entity.TuitionFee;
import com.rikkei.eduportal.enrollment.repository.EnrollmentRepository;
import com.rikkei.eduportal.enrollment.repository.NotificationRepository;
import com.rikkei.eduportal.enrollment.repository.StudentProfileRepository;
import com.rikkei.eduportal.enrollment.repository.TuitionFeeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class TuitionService {

    private final TuitionFeeRepository tuitionFeeRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final NotificationRepository notificationRepository;
    private final StudentDashboardService dashboardService;

    public TuitionService(TuitionFeeRepository tuitionFeeRepository,
                          StudentProfileRepository studentProfileRepository,
                          EnrollmentRepository enrollmentRepository,
                          NotificationRepository notificationRepository,
                          StudentDashboardService dashboardService) {
        this.tuitionFeeRepository = tuitionFeeRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.notificationRepository = notificationRepository;
        this.dashboardService = dashboardService;
    }

    @Transactional
    public TuitionDto getStudentTuition(String studentIdentifier, String semester) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        String activeSemester = (semester != null && !semester.trim().isEmpty()) ? semester.trim() : "2024-25_SEM2";

        List<Enrollment> enrollments = enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(student.getId(), activeSemester);

        int totalCredits = 0;
        List<TuitionDto.TuitionCourseItemDto> courseItems = new ArrayList<>();
        BigDecimal unitPrice = BigDecimal.valueOf(450000.00);

        for (Enrollment e : enrollments) {
            if (e.getClassSection() != null && e.getClassSection().getCourse() != null) {
                int cr = e.getClassSection().getCourse().getCredits();
                totalCredits += cr;
                BigDecimal fee = unitPrice.multiply(BigDecimal.valueOf(cr));
                courseItems.add(new TuitionDto.TuitionCourseItemDto(
                        e.getClassSection().getCourse().getCourseCode(),
                        e.getClassSection().getCourse().getName(),
                        cr,
                        fee
                ));
            }
        }

        TuitionFee tuition = tuitionFeeRepository.findByStudentIdAndSemesterName(student.getId(), activeSemester)
                .orElse(null);

        if (tuition == null) {
            tuition = new TuitionFee();
            tuition.setStudent(student);
            tuition.setSemesterName(activeSemester);
            tuition.setTotalCredits(totalCredits);
            tuition.setCreditUnitPrice(unitPrice);
            tuition.setFacilityFee(BigDecimal.valueOf(300000.00));
            BigDecimal totalAmt = unitPrice.multiply(BigDecimal.valueOf(totalCredits)).add(tuition.getFacilityFee());
            tuition.setTotalAmount(totalAmt);
            tuition.setPaidAmount(BigDecimal.ZERO);
            tuition.setStatus("UNPAID");
            tuition.setDueDate(LocalDate.now().plusMonths(2));
            tuition = tuitionFeeRepository.save(tuition);
        } else {
            // Cập nhật lại số tín chỉ nếu sinh viên vừa đăng ký thêm hoặc hủy môn và chưa nộp
            if ("UNPAID".equalsIgnoreCase(tuition.getStatus())) {
                tuition.setTotalCredits(totalCredits);
                BigDecimal totalAmt = tuition.getCreditUnitPrice().multiply(BigDecimal.valueOf(totalCredits)).add(tuition.getFacilityFee());
                tuition.setTotalAmount(totalAmt);
                tuition = tuitionFeeRepository.save(tuition);
            }
        }

        TuitionDto dto = new TuitionDto();
        dto.setId(tuition.getId());
        dto.setSemesterName(tuition.getSemesterName());
        dto.setTotalCredits(tuition.getTotalCredits());
        dto.setCreditUnitPrice(tuition.getCreditUnitPrice());
        dto.setFacilityFee(tuition.getFacilityFee());
        dto.setTotalAmount(tuition.getTotalAmount());
        dto.setPaidAmount(tuition.getPaidAmount());
        dto.setStatus(tuition.getStatus());
        dto.setDueDate(tuition.getDueDate());
        dto.setPaymentDate(tuition.getPaymentDate());
        dto.setTransactionCode(tuition.getTransactionCode());
        dto.setPaymentMethod(tuition.getPaymentMethod());
        dto.setCourses(courseItems);
        return dto;
    }

    @Transactional
    public TuitionDto payTuition(String studentIdentifier, String semester, String paymentMethod) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        String targetSemester = (semester != null && !semester.trim().isEmpty()) ? semester.trim() : "2024-25_SEM2";

        TuitionFee tuition = tuitionFeeRepository.findByStudentIdAndSemesterName(student.getId(), targetSemester)
                .orElseGet(() -> {
                    getStudentTuition(studentIdentifier, targetSemester);
                    return tuitionFeeRepository.findByStudentIdAndSemesterName(student.getId(), targetSemester).orElseThrow();
                });

        tuition.setPaidAmount(tuition.getTotalAmount());
        tuition.setStatus("PAID");
        tuition.setPaymentDate(LocalDateTime.now());
        tuition.setPaymentMethod(paymentMethod != null ? paymentMethod : "VietQR / Momo");
        String txnCode = "TXN-" + System.currentTimeMillis() + "-" + (int)(Math.random() * 8999 + 1000);
        tuition.setTransactionCode(txnCode);
        tuitionFeeRepository.save(tuition);

        // Bắn thông báo xác nhận cho sinh viên
        if (student.getUser() != null) {
            Notification notification = new Notification();
            notification.setUser(student.getUser());
            notification.setTitle("Biên lai học phí đã thanh toán thành công");
            notification.setMessage(String.format("Bạn đã thanh toán thành công số tiền %,d VNĐ cho học kỳ %s. Mã giao dịch: %s",
                    tuition.getTotalAmount().longValue(), targetSemester, txnCode));
            notification.setType("TUITION");
            notification.setLinkUrl("/student/tuition");
            notification.setIsRead(false);
            notificationRepository.save(notification);
        }

        return getStudentTuition(studentIdentifier, targetSemester);
    }
}
