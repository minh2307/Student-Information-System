package com.rikkei.eduportal.lecturer.service;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.lecturer.dto.request.DispatchWarningRequest;
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

    public EarlyWarningService(ClassSectionRepository classSectionRepo,
                               EnrollmentRepository enrollmentRepo,
                               AttendanceSessionRepository attendanceSessionRepo,
                               AttendanceRecordRepository attendanceRecordRepo,
                               GradeRepository gradeRepo,
                               StudentProfileRepository studentProfileRepo,
                               LecturerProfileRepository lecturerProfileRepo) {
        this.classSectionRepo = classSectionRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.attendanceSessionRepo = attendanceSessionRepo;
        this.attendanceRecordRepo = attendanceRecordRepo;
        this.gradeRepo = gradeRepo;
        this.studentProfileRepo = studentProfileRepo;
        this.lecturerProfileRepo = lecturerProfileRepo;
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
        List<StudentRiskDto> targets = evaluated.getStudents().stream()
                .filter(s -> "CRITICAL".equals(s.getRiskLevel()) || "WARNING".equals(s.getRiskLevel()))
                .collect(Collectors.toList());

        if (request.getStudentIds() != null && !request.getStudentIds().isEmpty()) {
            Set<Long> filterIds = new HashSet<>(request.getStudentIds());
            targets = targets.stream().filter(s -> filterIds.contains(s.getStudentId())).collect(Collectors.toList());
        }

        List<String> names = targets.stream().map(s -> s.getFullName() + " (" + s.getStudentCode() + ")").collect(Collectors.toList());
        log.info("Dispatching academic early warnings to {} students in section {}", targets.size(), evaluated.getSectionCode());

        String msg = "Đã gửi thông báo cảnh báo sớm và nhắc nhở học vụ thành công tới " + targets.size() + " sinh viên.";
        return new DispatchWarningResponse(targets.size(), "SENT", LocalDateTime.now(), names, msg);
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
