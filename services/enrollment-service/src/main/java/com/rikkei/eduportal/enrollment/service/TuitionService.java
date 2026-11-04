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
import com.rikkei.eduportal.enrollment.util.VietQrPayloadGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class TuitionService {

    public static final String MB_BIN = "970422";
    public static final String MB_NAME = "MB Bank (Ngân hàng TMCP Quân đội)";
    public static final String MB_SHORT = "MB";

    public static final String VIETIN_BIN = "970415";
    public static final String VIETIN_NAME = "VietinBank (Ngân hàng TMCP Công thương Việt Nam)";
    public static final String VIETIN_SHORT = "VietinBank";

    public static final String DEFAULT_ACCOUNT_NO = "999988882025";
    public static final String DEFAULT_ACCOUNT_NAME = "HOC VIEN CONG NGHE RIKKEI";
    public static final BigDecimal CREDIT_UNIT_PRICE = BigDecimal.valueOf(450000.00); // BR-07: 450.000 VNĐ / 1 TC
    public static final BigDecimal BASE_FACILITY_FEE = BigDecimal.valueOf(300000.00); // Phí CSVC định mức kỳ

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
        return getStudentTuition(studentIdentifier, semester, MB_BIN);
    }

    @Transactional
    public TuitionDto getStudentTuition(String studentIdentifier, String semester, String requestedBankBin) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        String activeSemester = (semester != null && !semester.trim().isEmpty()) ? semester.trim() : "2024-25_SEM2";

        // Lấy danh sách lớp học phần sinh viên đang theo học hợp lệ trong kỳ
        List<Enrollment> enrollments = enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(student.getId(), activeSemester);

        int totalCredits = 0;
        List<TuitionDto.TuitionCourseItemDto> courseItems = new ArrayList<>();

        for (Enrollment e : enrollments) {
            if (e.getClassSection() != null && e.getClassSection().getCourse() != null) {
                Integer cr = e.getClassSection().getCourse().getCredits();
                int credits = (cr != null) ? cr : 0;
                totalCredits += credits;
                BigDecimal fee = CREDIT_UNIT_PRICE.multiply(BigDecimal.valueOf(credits));
                courseItems.add(new TuitionDto.TuitionCourseItemDto(
                        e.getClassSection().getCourse().getCourseCode(),
                        e.getClassSection().getCourse().getName(),
                        credits,
                        fee
                ));
            }
        }

        // Fix công thức tính học phí:
        // Nếu sinh viên không đăng ký tín chỉ nào (0 TC) => Phí CSVC = 0, Tổng học phí = 0 VNĐ
        // Nếu sinh viên đăng ký >= 1 TC => Tổng học phí = (Số tín chỉ * 450.000) + 300.000 (CSVC)
        BigDecimal facilityFee = (totalCredits > 0) ? BASE_FACILITY_FEE : BigDecimal.ZERO;
        BigDecimal calculatedTotalAmount = CREDIT_UNIT_PRICE.multiply(BigDecimal.valueOf(totalCredits)).add(facilityFee);

        TuitionFee tuition = tuitionFeeRepository.findByStudentIdAndSemesterName(student.getId(), activeSemester)
                .orElse(null);

        if (tuition == null) {
            tuition = new TuitionFee();
            tuition.setStudent(student);
            tuition.setSemesterName(activeSemester);
            tuition.setTotalCredits(totalCredits);
            tuition.setCreditUnitPrice(CREDIT_UNIT_PRICE);
            tuition.setFacilityFee(facilityFee);
            tuition.setTotalAmount(calculatedTotalAmount);
            tuition.setPaidAmount(BigDecimal.ZERO);
            tuition.setStatus(totalCredits == 0 ? "PAID" : "UNPAID");
            tuition.setDueDate(LocalDate.now().plusDays(30)); // 30 ngày theo quy tắc BR-07
            tuition = tuitionFeeRepository.save(tuition);
        } else {
            // Tự động quyết toán lại nếu sinh viên có thay đổi môn học (đăng ký thêm / hủy bớt)
            BigDecimal currentPaid = tuition.getPaidAmount() != null ? tuition.getPaidAmount() : BigDecimal.ZERO;
            tuition.setTotalCredits(totalCredits);
            tuition.setCreditUnitPrice(CREDIT_UNIT_PRICE);
            tuition.setFacilityFee(facilityFee);
            tuition.setTotalAmount(calculatedTotalAmount);

            if (currentPaid.compareTo(calculatedTotalAmount) >= 0 && calculatedTotalAmount.compareTo(BigDecimal.ZERO) > 0) {
                tuition.setStatus("PAID");
            } else if (currentPaid.compareTo(BigDecimal.ZERO) > 0 && currentPaid.compareTo(calculatedTotalAmount) < 0) {
                tuition.setStatus("PARTIAL");
            } else if (calculatedTotalAmount.compareTo(BigDecimal.ZERO) == 0) {
                tuition.setStatus("PAID");
            } else {
                tuition.setStatus("UNPAID");
            }
            tuition = tuitionFeeRepository.save(tuition);
        }

        BigDecimal paidAmount = tuition.getPaidAmount() != null ? tuition.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal remainingAmount = tuition.getTotalAmount().subtract(paidAmount);
        if (remainingAmount.compareTo(BigDecimal.ZERO) < 0) {
            remainingAmount = BigDecimal.ZERO;
        }

        // Chuẩn hóa cú pháp chuyển khoản: "HP <MSSV> <HOCKY>"
        String studentCode = student.getStudentCode() != null ? student.getStudentCode().trim().toUpperCase() : "SV" + student.getId();
        String studentName = (student.getUser() != null && student.getUser().getFullName() != null)
                ? student.getUser().getFullName().trim()
                : "Sinh viên " + studentCode;
        String transferContent = "HP " + studentCode + " " + activeSemester;

        // Số tiền đưa vào mã QR là số tiền còn nợ (hoặc tổng tiền nếu chưa đóng)
        long qrAmountLong = remainingAmount.compareTo(BigDecimal.ZERO) > 0
                ? remainingAmount.longValue()
                : tuition.getTotalAmount().longValue();

        // Quyết định ngân hàng hiển thị chính
        String activeBankBin = (VIETIN_BIN.equals(requestedBankBin) || "ICB".equalsIgnoreCase(requestedBankBin) || "VIETINBANK".equalsIgnoreCase(requestedBankBin))
                ? VIETIN_BIN
                : MB_BIN;
        String activeBankName = VIETIN_BIN.equals(activeBankBin) ? VIETIN_NAME : MB_NAME;
        String activeBankShort = VIETIN_BIN.equals(activeBankBin) ? VIETIN_SHORT : MB_SHORT;

        // Khởi tạo VietQR Payload chuẩn EMVCo & QuickLink cho từng ngân hàng hỗ trợ
        String mbPayload = VietQrPayloadGenerator.generatePayload(MB_BIN, DEFAULT_ACCOUNT_NO, qrAmountLong, transferContent);
        String mbQuickLink = VietQrPayloadGenerator.generateQuickLink(MB_BIN, DEFAULT_ACCOUNT_NO, qrAmountLong, transferContent, DEFAULT_ACCOUNT_NAME);

        String vietinPayload = VietQrPayloadGenerator.generatePayload(VIETIN_BIN, DEFAULT_ACCOUNT_NO, qrAmountLong, transferContent);
        String vietinQuickLink = VietQrPayloadGenerator.generateQuickLink(VIETIN_BIN, DEFAULT_ACCOUNT_NO, qrAmountLong, transferContent, DEFAULT_ACCOUNT_NAME);

        List<TuitionDto.BankOptionDto> supportedBanks = List.of(
                new TuitionDto.BankOptionDto(MB_BIN, MB_SHORT, MB_NAME, DEFAULT_ACCOUNT_NO, DEFAULT_ACCOUNT_NAME, mbPayload, mbQuickLink),
                new TuitionDto.BankOptionDto(VIETIN_BIN, VIETIN_SHORT, VIETIN_NAME, DEFAULT_ACCOUNT_NO, DEFAULT_ACCOUNT_NAME, vietinPayload, vietinQuickLink)
        );

        String currentPayload = VIETIN_BIN.equals(activeBankBin) ? vietinPayload : mbPayload;
        String currentQuickLink = VIETIN_BIN.equals(activeBankBin) ? vietinQuickLink : mbQuickLink;

        TuitionDto dto = new TuitionDto();
        dto.setId(tuition.getId());
        dto.setSemesterName(tuition.getSemesterName());
        dto.setTotalCredits(tuition.getTotalCredits());
        dto.setCreditUnitPrice(tuition.getCreditUnitPrice());
        dto.setFacilityFee(tuition.getFacilityFee());
        dto.setTotalAmount(tuition.getTotalAmount());
        dto.setPaidAmount(tuition.getPaidAmount());
        dto.setRemainingAmount(remainingAmount);
        dto.setStatus(tuition.getStatus());
        dto.setDueDate(tuition.getDueDate());
        dto.setPaymentDate(tuition.getPaymentDate());
        dto.setTransactionCode(tuition.getTransactionCode());
        dto.setPaymentMethod(tuition.getPaymentMethod());
        dto.setCourses(courseItems);

        // Định danh thực của sinh viên
        dto.setStudentCode(studentCode);
        dto.setStudentName(studentName);

        // Chi tiết tài khoản thụ hưởng & mã VietQR
        dto.setBankBin(activeBankBin);
        dto.setBankName(activeBankName);
        dto.setBankShortName(activeBankShort);
        dto.setAccountNumber(DEFAULT_ACCOUNT_NO);
        dto.setAccountName(DEFAULT_ACCOUNT_NAME);
        dto.setTransferContent(transferContent);
        dto.setVietQrPayload(currentPayload);
        dto.setVietQrQuickLink(currentQuickLink);
        dto.setSupportedBanks(supportedBanks);

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
        tuition.setPaymentMethod(paymentMethod != null && !paymentMethod.isBlank() ? paymentMethod : "VietQR Napas247");
        String txnCode = "TXN-" + System.currentTimeMillis() + "-" + (int)(Math.random() * 8999 + 1000);
        tuition.setTransactionCode(txnCode);
        tuitionFeeRepository.save(tuition);

        // Gửi thông báo biên nhận tức thời cho sinh viên
        if (student.getUser() != null) {
            Notification notification = new Notification();
            notification.setUser(student.getUser());
            notification.setTitle("Biên lai học phí đã thanh toán thành công");
            notification.setMessage(String.format("Bạn đã thanh toán thành công số tiền %,d VNĐ cho học kỳ %s qua %s. Mã giao dịch: %s",
                    tuition.getTotalAmount().longValue(), targetSemester, tuition.getPaymentMethod(), txnCode));
            notification.setType("TUITION");
            notification.setLinkUrl("/student/tuition");
            notification.setIsRead(false);
            notificationRepository.save(notification);
        }

        return getStudentTuition(studentIdentifier, targetSemester);
    }
}
