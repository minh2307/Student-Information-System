package com.rikkei.eduportal.lecturer.service;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.lecturer.dto.request.DispatchWarningRequest;
import com.rikkei.eduportal.lecturer.dto.request.SendLecturerNotificationRequest;
import com.rikkei.eduportal.lecturer.dto.response.DispatchWarningResponse;
import com.rikkei.eduportal.lecturer.dto.response.EarlyWarningSummaryResponse;
import com.rikkei.eduportal.lecturer.dto.response.StudentRiskDto;
import com.rikkei.eduportal.lecturer.entity.*;
import com.rikkei.eduportal.lecturer.exception.AccessDeniedException;
import com.rikkei.eduportal.lecturer.exception.ResourceNotFoundException;
import com.rikkei.eduportal.lecturer.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class EarlyWarningService {

    private static final Logger log = LoggerFactory.getLogger(EarlyWarningService.class);

    private final ClassSectionRepository classSectionRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final AttendanceSessionRepository attendanceSessionRepo;
    private final AttendanceRecordRepository attendanceRecordRepo;
    private final GradeRepository gradeRepo;
    private final StudentProfileRepository studentProfileRepo;
    private final LecturerProfileRepository lecturerProfileRepo;
    private final NotificationRepository notificationRepo;

    public EarlyWarningService(ClassSectionRepository classSectionRepo,
                               EnrollmentRepository enrollmentRepo,
                               AttendanceSessionRepository attendanceSessionRepo,
                               AttendanceRecordRepository attendanceRecordRepo,
                               GradeRepository gradeRepo,
                               StudentProfileRepository studentProfileRepo,
                               LecturerProfileRepository lecturerProfileRepo,
                               NotificationRepository notificationRepo) {
        this.classSectionRepo = classSectionRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.attendanceSessionRepo = attendanceSessionRepo;
        this.attendanceRecordRepo = attendanceRecordRepo;
        this.gradeRepo = gradeRepo;
        this.studentProfileRepo = studentProfileRepo;
        this.lecturerProfileRepo = lecturerProfileRepo;
        this.notificationRepo = notificationRepo;
    }

    @Transactional(readOnly = true)
    public EarlyWarningSummaryResponse evaluateSectionRisksByUsername(String username, Long sectionId, boolean isAdmin) {
        Long lecturerId = null;
        if (!isAdmin && username != null) {
            LecturerProfile profile = lecturerProfileRepo.findByUsername(username)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ giảng viên: " + username));
            lecturerId = profile.getId();
        }
        return evaluateSectionRisks(lecturerId, sectionId, isAdmin);
    }

    @Transactional
    public DispatchWarningResponse dispatchWarningsByUsername(String username, DispatchWarningRequest request, boolean isAdmin) {
        Long lecturerId = null;
        if (!isAdmin && username != null) {
            LecturerProfile profile = lecturerProfileRepo.findByUsername(username)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ giảng viên: " + username));
            lecturerId = profile.getId();
        }
        return dispatchWarnings(lecturerId, request, isAdmin);
    }

    @Transactional(readOnly = true)
    public List<StudentRiskDto> getStudentSelfWarningsByUsername(String username) {
        StudentProfile student = studentProfileRepo.findByUserUsername(username).orElse(null);
        if (student == null) return Collections.emptyList();
        return getStudentSelfWarnings(student.getUser().getId());
    }

    /**
     * Đánh giá và phát hiện sớm nguy cơ học vụ cho toàn bộ sinh viên trong lớp học phần
     */
    @Transactional(readOnly = true)
    public EarlyWarningSummaryResponse evaluateSectionRisks(Long lecturerId, Long sectionId, boolean isAdmin) {
        ClassSection section = classSectionRepo.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp học phần với ID: " + sectionId));

        if (!isAdmin && lecturerId != null) {
            if (section.getLecturer() == null || !section.getLecturer().getId().equals(lecturerId)) {
                throw new AccessDeniedException("Bạn không có quyền xem cảnh báo học vụ của lớp này.");
            }
        }

        List<Enrollment> enrollments = enrollmentRepo.findBySectionIdAndStatus(sectionId, EnrollmentStatus.REGISTERED);
        List<AttendanceSession> sessions = attendanceSessionRepo.findByClassSectionIdOrderByCreatedAtDesc(sectionId);
        int totalSessions = sessions.size();

        List<AttendanceRecord> records = attendanceRecordRepo.findByClassSectionId(sectionId);
        Map<Long, Long> attendedCountByStudent = records.stream()
                .collect(Collectors.groupingBy(r -> r.getStudent().getId(), Collectors.counting()));

        List<Grade> grades = gradeRepo.findBySectionId(sectionId);
        Map<Long, Grade> gradeByEnrollmentId = grades.stream()
                .filter(g -> g.getEnrollment() != null)
                .collect(Collectors.toMap(g -> g.getEnrollment().getId(), g -> g, (a, b) -> a));

        List<StudentRiskDto> studentRiskList = new ArrayList<>();
        int criticalCount = 0;
        int warningCount = 0;
        int safeCount = 0;
        int attendanceRiskCount = 0;
        int gradeRiskCount = 0;

        for (Enrollment enrollment : enrollments) {
            StudentProfile student = enrollment.getStudent();
            if (student == null) continue;

            User user = student.getUser();
            Grade grade = gradeByEnrollmentId.get(enrollment.getId());

            long attended = attendedCountByStudent.getOrDefault(student.getId(), 0L);
            int absent = Math.max(0, (int) (totalSessions - attended));
            double absenceRate = totalSessions > 0 ? (double) absent / totalSessions : 0.0;

            StudentRiskDto dto = new StudentRiskDto();
            dto.setStudentId(student.getId());
            dto.setStudentCode(student.getStudentCode());
            dto.setFullName(user != null ? user.getFullName() : student.getStudentCode());
            dto.setEmail(user != null ? user.getEmail() : "");
            dto.setClassSectionId(sectionId);
            dto.setSectionCode(section.getSectionCode());
            dto.setCourseName(section.getCourse() != null ? section.getCourse().getName() : "");
            dto.setTotalSessionsHeld(totalSessions);
            dto.setAttendedSessions((int) attended);
            dto.setAbsentSessions(absent);
            dto.setAbsenceRate(Math.round(absenceRate * 100.0) / 100.0);

            if (grade != null) {
                dto.setAttendanceScore(grade.getAttendanceScore());
                dto.setMidtermScore(grade.getMidtermScore());
                dto.setFinalScore(grade.getFinalScore());
                dto.setTotalScore(grade.getTotalScore());
            }

            // Rule-based Risk Engine
            List<String> reasons = new ArrayList<>();
            List<String> suggestions = new ArrayList<>();
            boolean hasCritical = false;
            boolean hasWarning = false;
            int riskScore = 0;

            // 1. Chuyên cần / Vắng điểm danh (Nghị định quy chế đào tạo: Vắng > 20% số tiết bị cấm thi)
            if (totalSessions >= 2) {
                if (absenceRate >= 0.20) {
                    hasCritical = true;
                    riskScore += 50;
                    attendanceRiskCount++;
                    reasons.add("Vắng " + absent + "/" + totalSessions + " buổi (" + Math.round(absenceRate * 100) + "%). Vượt ngưỡng cấm thi 20% theo quy chế đào tạo tín chỉ!");
                    suggestions.add("Cần gặp trực tiếp giảng viên để kiểm tra lại lịch điểm danh hoặc nộp đơn giải trình phép hợp lệ.");
                } else if (absenceRate >= 0.15) {
                    hasWarning = true;
                    riskScore += 25;
                    attendanceRiskCount++;
                    reasons.add("Vắng " + absent + "/" + totalSessions + " buổi (" + Math.round(absenceRate * 100) + "%). Đang cận kề ngưỡng bị đình chỉ thi!");
                    suggestions.add("Tuyệt đối không nghỉ thêm buổi học nào trong các tuần còn lại.");
                }
            }

            // 2. Điểm kiểm tra định kỳ & giữa kỳ
            if (grade != null) {
                if (grade.getMidtermScore() != null) {
                    double mid = grade.getMidtermScore().doubleValue();
                    if (mid < 3.0) {
                        hasCritical = true;
                        riskScore += 40;
                        gradeRiskCount++;
                        reasons.add("Điểm giữa kỳ rất thấp (" + mid + "/10.0). Nguy cơ cao bị trượt môn nhận điểm F!");
                        suggestions.add("Cần tham gia buổi trợ giảng, hoàn thành bài tập lớn bổ sung để gỡ điểm.");
                    } else if (mid < 4.0) {
                        hasWarning = true;
                        riskScore += 25;
                        gradeRiskCount++;
                        reasons.add("Điểm giữa kỳ dưới chuẩn đạt (" + mid + "/10.0). Cần nỗ lực bài thi kết thúc học phần.");
                        suggestions.add("Cần đạt tối thiểu 5.5 điểm thi cuối kỳ để đảm bảo điểm tổng kết qua môn.");
                    }
                }

                if (grade.getTotalScore() != null && grade.getTotalScore().doubleValue() < 4.0) {
                    hasCritical = true;
                    riskScore += 45;
                    reasons.add("Tổng kết học phần hiện tại " + grade.getTotalScore() + "/10.0 không đạt chuẩn tích lũy.");
                }

                if (grade.getAttendanceScore() != null && grade.getAttendanceScore().doubleValue() < 5.0) {
                    hasWarning = true;
                    riskScore += 15;
                    reasons.add("Điểm chuyên cần bị trừ nhiều (" + grade.getAttendanceScore() + "/10.0).");
                }
            }

            if (hasCritical) {
                dto.setRiskLevel("CRITICAL");
                dto.setRiskScore(Math.min(99, Math.max(75, riskScore)));
                criticalCount++;
            } else if (hasWarning) {
                dto.setRiskLevel("WARNING");
                dto.setRiskScore(Math.min(70, Math.max(40, riskScore)));
                warningCount++;
            } else {
                dto.setRiskLevel("SAFE");
                dto.setRiskScore(10);
                safeCount++;
                reasons.add("Tiến độ học tập và chuyên cần tốt, duy trì phong độ hiện tại.");
                suggestions.add("Duy trì chuyên cần và ôn tập tốt cho kỳ thi cuối kỳ.");
            }

            dto.setRiskReasons(reasons);
            dto.setSuggestions(suggestions);
            studentRiskList.add(dto);
        }

        // Sắp xếp ưu tiên sinh viên CRITICAL lên đầu, sau đó đến WARNING
        studentRiskList.sort((a, b) -> Integer.compare(b.getRiskScore(), a.getRiskScore()));

        EarlyWarningSummaryResponse summary = new EarlyWarningSummaryResponse();
        summary.setSectionId(section.getId());
        summary.setSectionCode(section.getSectionCode());
        summary.setCourseName(section.getCourse() != null ? section.getCourse().getName() : "");
        summary.setTotalStudents(enrollments.size());
        summary.setCriticalCount(criticalCount);
        summary.setWarningCount(warningCount);
        summary.setSafeCount(safeCount);
        summary.setAttendanceRiskCount(attendanceRiskCount);
        summary.setGradeRiskCount(gradeRiskCount);
        summary.setStudents(studentRiskList);

        String eval = "Đã quét " + enrollments.size() + " sinh viên: Phát hiện "
                + criticalCount + " trường hợp Nguy cấp (nguy cơ cấm thi/trượt môn) và "
                + warningCount + " trường hợp Cần chú ý.";
        summary.setEvaluationSummary(eval);

        return summary;
    }

    /**
     * Bắn thông báo nhắc nhở 1-chạm (1-Click Early Warning Dispatch) đến sinh viên trong diện nguy cơ
     */
    @Transactional
    public DispatchWarningResponse dispatchWarnings(Long lecturerId, DispatchWarningRequest request, boolean isAdmin) {
        if (request == null || request.getSectionId() == null) {
            throw new IllegalArgumentException("Mã lớp học phần không được để trống.");
        }

        EarlyWarningSummaryResponse evaluated = evaluateSectionRisks(lecturerId, request.getSectionId(), isAdmin);
        List<StudentRiskDto> targets;

        // Nếu giảng viên chọn danh sách sinh viên cụ thể -> ưu tiên gửi cho đúng các sinh viên đó
        if (request.getStudentIds() != null && !request.getStudentIds().isEmpty()) {
            Set<Long> filterIds = new HashSet<>(request.getStudentIds());
            targets = evaluated.getStudents().stream()
                    .filter(s -> filterIds.contains(s.getStudentId()))
                    .collect(Collectors.toList());
        } else {
            // Mặc định gửi cho toàn bộ sinh viên có mức cảnh báo CRITICAL hoặc WARNING
            targets = evaluated.getStudents().stream()
                    .filter(s -> "CRITICAL".equals(s.getRiskLevel()) || "WARNING".equals(s.getRiskLevel()))
                    .collect(Collectors.toList());
        }

        List<Enrollment> enrollments = enrollmentRepo.findBySectionIdAndStatus(request.getSectionId(), EnrollmentStatus.REGISTERED);
        Map<Long, StudentProfile> studentMap = enrollments.stream()
                .map(Enrollment::getStudent)
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(StudentProfile::getId, s -> s, (a, b) -> a));

        List<String> names = new ArrayList<>();
        for (StudentRiskDto s : targets) {
            StudentProfile student = studentMap.get(s.getStudentId());
            if (student == null) {
                student = studentProfileRepo.findById(s.getStudentId()).orElse(null);
            }
            if (student == null || student.getUser() == null) continue;

            Notification notif = new Notification();
            notif.setUser(student.getUser());
            notif.setTitle("⚠️ Cảnh báo học vụ: Lớp " + evaluated.getSectionCode() + " - " + evaluated.getCourseName());

            StringBuilder body = new StringBuilder();
            body.append("Giảng viên lớp ").append(evaluated.getSectionCode()).append(" gửi cảnh báo nguy cơ học vụ:\n");
            if (s.getRiskReasons() != null && !s.getRiskReasons().isEmpty()) {
                for (String r : s.getRiskReasons()) {
                    body.append("• ").append(r).append("\n");
                }
            } else {
                body.append("• Cần chú ý chuyên cần và nỗ lực học tập để đảm bảo điều kiện dự thi.\n");
            }
            if (s.getSuggestions() != null && !s.getSuggestions().isEmpty()) {
                body.append("Khuyến nghị: ").append(String.join("; ", s.getSuggestions()));
            }
            notif.setMessage(body.toString());
            notif.setType("EARLY_WARNING");
            notif.setIsRead(false);
            notif.setLinkUrl("/student/dashboard");
            notif.setCreatedAt(LocalDateTime.now());
            notificationRepo.save(notif);

            names.add(s.getFullName() + " (" + s.getStudentCode() + ")");
        }

        log.info("Dispatched and persisted academic early warnings to {} students in section {}", names.size(), evaluated.getSectionCode());
        String msg = "Đã gửi thông báo cảnh báo sớm và nhắc nhở học vụ thành công tới " + names.size() + " sinh viên.";
        return new DispatchWarningResponse(names.size(), "SENT", LocalDateTime.now(), names, msg);
    }

    /**
     * Giảng viên gửi thông báo riêng hoặc dặn dò cho sinh viên trong lớp học phần
     */
    @Transactional
    public DispatchWarningResponse sendCustomNotificationByUsername(String username, SendLecturerNotificationRequest request, boolean isAdmin) {
        Long lecturerId = null;
        if (!isAdmin && username != null) {
            LecturerProfile profile = lecturerProfileRepo.findByUsername(username)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ giảng viên: " + username));
            lecturerId = profile.getId();
        }
        return sendCustomNotification(lecturerId, request, isAdmin);
    }

    /**
     * Gửi thông báo riêng tùy chỉnh từ giảng viên đến một hoặc nhiều sinh viên
     */
    @Transactional
    public DispatchWarningResponse sendCustomNotification(Long lecturerId, SendLecturerNotificationRequest request, boolean isAdmin) {
        if (request == null || request.getSectionId() == null) {
            throw new IllegalArgumentException("Mã lớp học phần không được để trống.");
        }
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Tiêu đề thông báo không được để trống.");
        }
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            throw new IllegalArgumentException("Nội dung thông báo không được để trống.");
        }

        ClassSection section = classSectionRepo.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp học phần với ID: " + request.getSectionId()));

        if (!isAdmin && lecturerId != null) {
            if (section.getLecturer() == null || !section.getLecturer().getId().equals(lecturerId)) {
                throw new AccessDeniedException("Bạn không có quyền gửi thông báo cho sinh viên của lớp này.");
            }
        }

        List<Enrollment> enrollments = enrollmentRepo.findBySectionIdAndStatus(request.getSectionId(), EnrollmentStatus.REGISTERED);
        List<StudentProfile> targetStudents;

        if (request.getStudentIds() != null && !request.getStudentIds().isEmpty()) {
            Set<Long> filterIds = new HashSet<>(request.getStudentIds());
            targetStudents = enrollments.stream()
                    .map(Enrollment::getStudent)
                    .filter(Objects::nonNull)
                    .filter(s -> filterIds.contains(s.getId()))
                    .collect(Collectors.toList());
        } else if (request.getStudentCodes() != null && !request.getStudentCodes().isEmpty()) {
            Set<String> filterCodes = new HashSet<>(request.getStudentCodes());
            targetStudents = enrollments.stream()
                    .map(Enrollment::getStudent)
                    .filter(Objects::nonNull)
                    .filter(s -> filterCodes.contains(s.getStudentCode()))
                    .collect(Collectors.toList());
        } else if (request.getEnrollmentIds() != null && !request.getEnrollmentIds().isEmpty()) {
            Set<Long> filterEnrollmentIds = new HashSet<>(request.getEnrollmentIds());
            targetStudents = enrollments.stream()
                    .filter(e -> filterEnrollmentIds.contains(e.getId()))
                    .map(Enrollment::getStudent)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } else {
            // Nếu không truyền filter cụ thể, gửi thông báo cho toàn bộ lớp học phần
            targetStudents = enrollments.stream()
                    .map(Enrollment::getStudent)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        }

        String notifType = (request.getType() != null && !request.getType().isBlank()) ? request.getType() : "LECTURER_MESSAGE";
        String courseName = section.getCourse() != null ? section.getCourse().getName() : "";
        String lecturerName = section.getLecturer() != null && section.getLecturer().getUser() != null
                ? section.getLecturer().getUser().getFullName() : "Giảng viên phụ trách";

        List<String> recipientNames = new ArrayList<>();
        for (StudentProfile student : targetStudents) {
            User user = student.getUser();
            if (user == null) continue;

            Notification notif = new Notification();
            notif.setUser(user);
            notif.setTitle("📢 " + request.getTitle().trim());
            notif.setMessage("Từ GV: " + lecturerName + " (Lớp " + section.getSectionCode() + " - " + courseName + "):\n\n" + request.getMessage().trim());
            notif.setType(notifType);
            notif.setIsRead(false);
            notif.setLinkUrl("/student/dashboard");
            notif.setCreatedAt(LocalDateTime.now());
            notificationRepo.save(notif);

            recipientNames.add(user.getFullName() + " (" + student.getStudentCode() + ")");
        }

        log.info("Sent custom lecturer notification to {} students in section {}", recipientNames.size(), section.getSectionCode());
        String msg = "Đã gửi thông báo riêng thành công tới " + recipientNames.size() + " sinh viên.";
        return new DispatchWarningResponse(recipientNames.size(), "SENT", LocalDateTime.now(), recipientNames, msg);
    }

    /**
     * Lấy danh sách cảnh báo học vụ của chính sinh viên đang đăng nhập
     */
    @Transactional(readOnly = true)
    public List<StudentRiskDto> getStudentSelfWarnings(Long studentUserId) {
        StudentProfile student = studentProfileRepo.findByUserId(studentUserId)
                .orElse(null);
        if (student == null) return Collections.emptyList();

        List<Enrollment> enrollments = enrollmentRepo.findRegisteredByStudentId(student.getId());
        List<StudentRiskDto> warnings = new ArrayList<>();

        for (Enrollment e : enrollments) {
            ClassSection sec = e.getClassSection();
            if (sec == null) continue;

            EarlyWarningSummaryResponse evaluated = evaluateSectionRisks(null, sec.getId(), true);
            evaluated.getStudents().stream()
                    .filter(s -> s.getStudentId().equals(student.getId()))
                    .findFirst()
                    .ifPresent(warnings::add);
        }

        return warnings;
    }
}
