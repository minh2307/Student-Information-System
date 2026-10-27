package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.entity.ClassSection;
import com.rikkei.eduportal.enrollment.entity.Enrollment;
import com.rikkei.eduportal.enrollment.entity.ExamSchedule;
import com.rikkei.eduportal.enrollment.entity.StudentProfile;
import com.rikkei.eduportal.enrollment.repository.EnrollmentRepository;
import com.rikkei.eduportal.enrollment.repository.ExamScheduleRepository;
import com.rikkei.eduportal.enrollment.repository.StudentProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
public class CalendarSyncService {

    private static final Logger log = LoggerFactory.getLogger(CalendarSyncService.class);
    private static final String CRLF = "\r\n";
    private static final DateTimeFormatter ICS_DATE_TIME = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");
    private static final DateTimeFormatter ICS_UTC = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

    private final StudentProfileRepository studentProfileRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ExamScheduleRepository examScheduleRepository;
    private final StudentDashboardService dashboardService;

    @Value("${jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}")
    private String saltSecret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    public void setSaltSecret(String saltSecret) {
        this.saltSecret = saltSecret;
    }

    public CalendarSyncService(StudentProfileRepository studentProfileRepository,
                               EnrollmentRepository enrollmentRepository,
                               ExamScheduleRepository examScheduleRepository,
                               StudentDashboardService dashboardService) {
        this.studentProfileRepository = studentProfileRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.examScheduleRepository = examScheduleRepository;
        this.dashboardService = dashboardService;
    }

    /**
     * Sinh token xác thực tĩnh an toàn cho link subscription calendar của sinh viên
     */
    public String generateCalendarFeedToken(String studentCode) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(saltSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hmacBytes = mac.doFinal(("CAL_FEED_" + studentCode.toLowerCase()).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hmacBytes).substring(0, 24);
        } catch (Exception e) {
            log.error("Error generating calendar feed token: {}", e.getMessage());
            return "default_feed_token";
        }
    }

    /**
     * Xác thực token subscription từ Google Calendar / Apple Calendar
     */
    public boolean validateCalendarFeedToken(String studentCode, String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }
        String expected = generateCalendarFeedToken(studentCode);
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), token.trim().getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Tạo chuỗi dữ liệu chuẩn RFC 5545 iCalendar (.ics) cho toàn bộ lịch học & lịch thi
     */
    @Transactional(readOnly = true)
    public String generateIcsCalendar(String studentIdentifier, String semester) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        List<Enrollment> enrollments = enrollmentRepository.findActiveEnrollmentsByStudent(student.getId());
        List<ExamSchedule> exams = examScheduleRepository.findExamSchedulesByStudent(student.getId(), semester);

        String studentName = student.getUser() != null ? student.getUser().getFullName() : student.getStudentCode();
        String studentCode = student.getStudentCode();

        StringBuilder ics = new StringBuilder();

        // 1. VCALENDAR Header
        ics.append("BEGIN:VCALENDAR").append(CRLF);
        ics.append("VERSION:2.0").append(CRLF);
        ics.append("PRODID:-//Rikkei Academy//Rikkei EduPortal SIS//VI").append(CRLF);
        ics.append("CALSCALE:GREGORIAN").append(CRLF);
        ics.append("METHOD:PUBLISH").append(CRLF);
        ics.append("X-WR-CALNAME:Lịch Học & Thi - ").append(escapeIcsText(studentName)).append(" (").append(studentCode).append(")").append(CRLF);
        ics.append("X-WR-CALDESC:Lịch học phần và lịch thi học kỳ sinh viên Rikkei EduPortal").append(CRLF);
        ics.append("X-WR-TIMEZONE:Asia/Ho_Chi_Minh").append(CRLF);

        // VTIMEZONE Component
        ics.append("BEGIN:VTIMEZONE").append(CRLF);
        ics.append("TZID:Asia/Ho_Chi_Minh").append(CRLF);
        ics.append("X-LIC-LOCATION:Asia/Ho_Chi_Minh").append(CRLF);
        ics.append("BEGIN:STANDARD").append(CRLF);
        ics.append("TZOFFSETFROM:+0700").append(CRLF);
        ics.append("TZOFFSETTO:+0700").append(CRLF);
        ics.append("TZNAME:+07").append(CRLF);
        ics.append("DTSTART:19700101T000000").append(CRLF);
        ics.append("END:STANDARD").append(CRLF);
        ics.append("END:VTIMEZONE").append(CRLF);

        String nowUtc = ICS_UTC.format(Instant.now());

        // Ngày mốc của kỳ học: tính từ đầu kỳ học (ví dụ Thứ 2 đầu tháng 9 hoặc tháng 2)
        LocalDate semesterStart = determineSemesterStartDate(semester);

        // 2. Class Section Events (Recurring weekly for 15 weeks)
        for (Enrollment en : enrollments) {
            if (!"REGISTERED".equalsIgnoreCase(en.getStatus())) {
                continue;
            }
            ClassSection sec = en.getClassSection();
            if (sec == null || sec.getCourse() == null) {
                continue;
            }

            DayOfWeek dow = parseDayOfWeek(sec.getDayOfWeek());
            LocalTime startTime = sec.getStartTime() != null ? sec.getStartTime() : LocalTime.of(8, 0);
            LocalTime endTime = sec.getEndTime() != null ? sec.getEndTime() : startTime.plusMinutes(90);

            // Tìm ngày đầu tiên trong kỳ ứng với DayOfWeek này
            LocalDate firstClassDate = semesterStart.with(TemporalAdjusters.nextOrSame(dow));
            LocalDateTime dtStart = LocalDateTime.of(firstClassDate, startTime);
            LocalDateTime dtEnd = LocalDateTime.of(firstClassDate, endTime);

            String courseCode = sec.getCourse().getCourseCode();
            String courseName = sec.getCourse().getName();
            String sectionCode = sec.getSectionCode();
            String room = sec.getRoomName() != null ? sec.getRoomName() : "TBA";
            String lecturer = "Chưa phân công";
            if (sec.getLecturer() != null && sec.getLecturer().getUser() != null) {
                String deg = sec.getLecturer().getDegree();
                lecturer = (deg != null ? deg + " " : "") + sec.getLecturer().getUser().getFullName();
            }

            String uid = "class-" + sec.getId() + "-" + student.getId() + "@rikkei.edu.vn";

            ics.append("BEGIN:VEVENT").append(CRLF);
            ics.append("UID:").append(uid).append(CRLF);
            ics.append("DTSTAMP:").append(nowUtc).append(CRLF);
            ics.append("DTSTART;TZID=Asia/Ho_Chi_Minh:").append(dtStart.format(ICS_DATE_TIME)).append(CRLF);
            ics.append("DTEND;TZID=Asia/Ho_Chi_Minh:").append(dtEnd.format(ICS_DATE_TIME)).append(CRLF);
            ics.append("RRULE:FREQ=WEEKLY;COUNT=15").append(CRLF);
            ics.append("SUMMARY:").append(escapeIcsText(courseCode + " - " + courseName + " (" + sectionCode + ")")).append(CRLF);
            ics.append("DESCRIPTION:").append(escapeIcsText(
                    "Môn học: " + courseName + "\n" +
                    "Mã môn: " + courseCode + "\n" +
                    "Lớp học phần: " + sectionCode + "\n" +
                    "Số tín chỉ: " + sec.getCourse().getCredits() + "\n" +
                    "Giảng viên: " + lecturer + "\n" +
                    "Phòng học: " + room + "\n" +
                    "Học kỳ: " + (sec.getSemesterName() != null ? sec.getSemesterName() : "Kỳ chính")
            )).append(CRLF);
            ics.append("LOCATION:").append(escapeIcsText(room + ", Rikkei Academy")).append(CRLF);
            ics.append("STATUS:CONFIRMED").append(CRLF);
            ics.append("TRANSP:OPAQUE").append(CRLF);
            ics.append("SEQUENCE:0").append(CRLF);
            ics.append("END:VEVENT").append(CRLF);
        }

        // 3. Exam Schedule Events (One-off events)
        for (ExamSchedule exam : exams) {
            LocalDate examDate = exam.getExamDate() != null ? exam.getExamDate() : LocalDate.now().plusWeeks(6);
            LocalTime startTime = exam.getStartTime() != null ? exam.getStartTime() : LocalTime.of(8, 0);
            LocalTime endTime = exam.getEndTime() != null ? exam.getEndTime() : startTime.plusMinutes(90);

            LocalDateTime dtStart = LocalDateTime.of(examDate, startTime);
            LocalDateTime dtEnd = LocalDateTime.of(examDate, endTime);

            String courseCode = exam.getClassSection() != null && exam.getClassSection().getCourse() != null
                    ? exam.getClassSection().getCourse().getCourseCode()
                    : "HỌC PHẦN";
            String examType = exam.getExamType() != null ? exam.getExamType() : "Thi kết thúc môn";
            String room = exam.getRoomName() != null ? exam.getRoomName() : "Phòng thi";
            String notes = exam.getNotes() != null ? exam.getNotes() : "Xuất trình Thẻ sinh viên khi vào phòng thi";

            String uid = "exam-" + exam.getId() + "-" + student.getId() + "@rikkei.edu.vn";

            ics.append("BEGIN:VEVENT").append(CRLF);
            ics.append("UID:").append(uid).append(CRLF);
            ics.append("DTSTAMP:").append(nowUtc).append(CRLF);
            ics.append("DTSTART;TZID=Asia/Ho_Chi_Minh:").append(dtStart.format(ICS_DATE_TIME)).append(CRLF);
            ics.append("DTEND;TZID=Asia/Ho_Chi_Minh:").append(dtEnd.format(ICS_DATE_TIME)).append(CRLF);
            ics.append("SUMMARY:").append(escapeIcsText("[LỊCH THI] " + courseCode + " - " + examType)).append(CRLF);
            ics.append("DESCRIPTION:").append(escapeIcsText(
                    "Môn thi: " + courseCode + "\n" +
                    "Kỳ thi: " + examType + "\n" +
                    "Phòng thi: " + room + "\n" +
                    "Thời gian: " + startTime + " - " + endTime + "\n" +
                    "Ghi chú: " + notes
            )).append(CRLF);
            ics.append("LOCATION:").append(escapeIcsText(room)).append(CRLF);
            ics.append("STATUS:CONFIRMED").append(CRLF);
            ics.append("PRIORITY:1").append(CRLF);
            ics.append("TRANSP:OPAQUE").append(CRLF);
            ics.append("END:VEVENT").append(CRLF);
        }

        // 4. VCALENDAR Footer
        ics.append("END:VCALENDAR").append(CRLF);

        return ics.toString();
    }

    private LocalDate determineSemesterStartDate(String semester) {
        LocalDate now = LocalDate.now();
        // Mặc định lấy ngày Thứ 2 của tuần đầu học kỳ
        if (now.getMonthValue() >= 8) {
            // Kỳ mùa Thu: Bắt đầu đầu tháng 9
            return LocalDate.of(now.getYear(), 9, 1).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
        } else {
            // Kỳ mùa Xuân: Bắt đầu đầu tháng 2
            return LocalDate.of(now.getYear(), 2, 1).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
        }
    }

    private DayOfWeek parseDayOfWeek(String dow) {
        if (dow == null) return DayOfWeek.MONDAY;
        String upper = dow.trim().toUpperCase();
        return switch (upper) {
            case "MON", "MONDAY", "THU 2", "THỨ 2", "2" -> DayOfWeek.MONDAY;
            case "TUE", "TUESDAY", "THU 3", "THỨ 3", "3" -> DayOfWeek.TUESDAY;
            case "WED", "WEDNESDAY", "THU 4", "THỨ 4", "4" -> DayOfWeek.WEDNESDAY;
            case "THU", "THURSDAY", "THU 5", "THỨ 5", "5" -> DayOfWeek.THURSDAY;
            case "FRI", "FRIDAY", "THU 6", "THỨ 6", "6" -> DayOfWeek.FRIDAY;
            case "SAT", "SATURDAY", "THU 7", "THỨ 7", "7" -> DayOfWeek.SATURDAY;
            case "SUN", "SUNDAY", "CHU NHAT", "CHỦ NHẬT", "CN" -> DayOfWeek.SUNDAY;
            default -> DayOfWeek.MONDAY;
        };
    }

    private String escapeIcsText(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                .replace(";", "\\;")
                .replace(",", "\\,")
                .replace("\r\n", "\\n")
                .replace("\n", "\\n")
                .replace("\r", "\\n");
    }
}
