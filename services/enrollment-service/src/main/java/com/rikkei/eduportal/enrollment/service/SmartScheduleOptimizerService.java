package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.*;
import com.rikkei.eduportal.enrollment.entity.ClassSection;
import com.rikkei.eduportal.enrollment.entity.Course;
import com.rikkei.eduportal.enrollment.repository.ClassSectionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SmartScheduleOptimizerService {

    private static final Logger log = LoggerFactory.getLogger(SmartScheduleOptimizerService.class);

    private final ClassSectionRepository classSectionRepository;
    private final RealtimeSeatService realtimeSeatService;

    public SmartScheduleOptimizerService(ClassSectionRepository classSectionRepository,
                                         RealtimeSeatService realtimeSeatService) {
        this.classSectionRepository = classSectionRepository;
        this.realtimeSeatService = realtimeSeatService;
    }

    /**
     * Tối ưu hóa thời khóa biểu tự động dựa trên thuật toán CSP (Constraint Satisfaction Problem)
     */
    @Transactional(readOnly = true)
    public ScheduleOptimizerResponse optimizeSchedule(String studentCode, ScheduleOptimizerRequest request) {
        if (request == null || request.getCourseIds() == null || request.getCourseIds().isEmpty()) {
            return new ScheduleOptimizerResponse(null, 0, 0, 0, Collections.emptyList(),
                    "Vui lòng chọn ít nhất một môn học để AI bắt đầu tối ưu hóa thời khóa biểu.");
        }

        String semester = request.getSemesterName();
        if (semester == null || semester.trim().isEmpty()) {
            semester = "2024-25_SEM2"; // Default active semester
        }

        List<ClassSection> candidateSections = classSectionRepository.findBySemesterAndCourseIdIn(
                semester, request.getCourseIds());

        if (Boolean.TRUE.equals(request.getOnlyAvailableSeats())) {
            candidateSections = candidateSections.stream()
                    .filter(cs -> cs.getCurrentEnrolled() < cs.getMaxCapacity())
                    .collect(Collectors.toList());
        }

        Map<Long, List<ClassSection>> sectionsByCourse = candidateSections.stream()
                .collect(Collectors.groupingBy(cs -> cs.getCourse().getId()));

        List<Long> targetCourseIds = new ArrayList<>();
        List<String> missingCourses = new ArrayList<>();

        for (Long cId : request.getCourseIds()) {
            List<ClassSection> sections = sectionsByCourse.get(cId);
            if (sections != null && !sections.isEmpty()) {
                targetCourseIds.add(cId);
            } else {
                missingCourses.add(String.valueOf(cId));
            }
        }

        if (targetCourseIds.isEmpty()) {
            return new ScheduleOptimizerResponse(semester, request.getCourseIds().size(), 0, 0,
                    Collections.emptyList(), "Không tìm thấy lớp học phần nào còn mở hoặc còn chỗ cho các môn đã chọn.");
        }

        List<List<ClassSection>> courseSectionBuckets = new ArrayList<>();
        for (Long cId : targetCourseIds) {
            courseSectionBuckets.add(sectionsByCourse.get(cId));
        }

        // Run CSP Backtracking search
        List<List<ClassSection>> validCombinations = new ArrayList<>();
        int[] combinationsChecked = new int[]{0};

        findValidCombinations(courseSectionBuckets, 0, new ArrayList<>(), validCombinations, combinationsChecked);

        if (validCombinations.isEmpty()) {
            String msg = "Không thể ghép được phương án nào không bị trùng lịch giữa " + targetCourseIds.size() + " môn học đã chọn. Hãy thử giảm bớt 1 môn hoặc nới lỏng ràng buộc ca học.";
            return new ScheduleOptimizerResponse(semester, targetCourseIds.size(), combinationsChecked[0], 0,
                    Collections.emptyList(), msg);
        }

        // Multi-criteria Scoring
        List<ScoredCombination> scored = new ArrayList<>();
        for (List<ClassSection> combo : validCombinations) {
            ScoreDetail scoreDetail = evaluateScore(combo, request);
            scored.add(new ScoredCombination(combo, scoreDetail));
        }

        // Sort descending by total score
        scored.sort((a, b) -> Integer.compare(b.scoreDetail.totalScore, a.scoreDetail.totalScore));

        // Select Top 3 diverse plans
        List<SchedulePlanOption> plans = selectTopDiversePlans(scored, request);

        String statusMsg = "AI đã phân tích " + combinationsChecked[0] + " tổ hợp và tìm thấy "
                + validCombinations.size() + " phương án hợp lệ không bị trùng lịch!";
        if (!missingCourses.isEmpty()) {
            statusMsg += " (Lưu ý: Có " + missingCourses.size() + " môn chưa có lớp mở phù hợp).";
        }

        return new ScheduleOptimizerResponse(semester, targetCourseIds.size(), combinationsChecked[0],
                validCombinations.size(), plans, statusMsg);
    }

    /**
     * Đặt giữ chỗ hàng loạt (1-Click Batch Reserve) cho phương án thời khóa biểu đã chọn
     */
    public BatchReserveResponse batchReserveSlots(String studentCode, BatchReserveRequest request) {
        if (request == null || request.getSectionIds() == null || request.getSectionIds().isEmpty()) {
            return new BatchReserveResponse(0, 0, List.of("Danh sách lớp học phần trống"), Collections.emptyList());
        }

        int success = 0;
        int failed = 0;
        List<String> details = new ArrayList<>();
        List<SlotReservationResponse> reservations = new ArrayList<>();

        for (Long sectionId : request.getSectionIds()) {
            try {
                SlotReservationResponse res = realtimeSeatService.reserveSlot(studentCode, sectionId);
                reservations.add(res);
                success++;
                details.add("Giữ chỗ thành công lớp " + res.sectionCode() + " (còn " + res.remainingSeconds() + "s)");
            } catch (Exception ex) {
                failed++;
                details.add("Không thể giữ chỗ lớp #" + sectionId + ": " + ex.getMessage());
            }
        }

        return new BatchReserveResponse(success, failed, details, reservations);
    }

    /**
     * DFS Backtracking kết hợp lọc xung đột tức thì (Pruning)
     */
    private void findValidCombinations(List<List<ClassSection>> buckets, int courseIndex,
                                       List<ClassSection> current,
                                       List<List<ClassSection>> results,
                                       int[] checkedCounter) {
        if (courseIndex == buckets.size()) {
            results.add(new ArrayList<>(current));
            return;
        }

        List<ClassSection> currentCourseSections = buckets.get(courseIndex);
        for (ClassSection section : currentCourseSections) {
            checkedCounter[0]++;
            if (!hasConflictWithCurrent(section, current)) {
                current.add(section);
                findValidCombinations(buckets, courseIndex + 1, current, results, checkedCounter);
                current.remove(current.size() - 1);
            }
        }
    }

    /**
     * Kiểm tra xung đột thời gian giữa 1 lớp học phần với tập các lớp đã chọn
     */
    public boolean hasConflictWithCurrent(ClassSection target, List<ClassSection> current) {
        for (ClassSection existing : current) {
            if (hasTimeCollision(target, existing)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Hai lớp xung đột nếu cùng thứ và khoảng thời gian giao nhau
     */
    public boolean hasTimeCollision(ClassSection a, ClassSection b) {
        if (a.getDayOfWeek() == null || b.getDayOfWeek() == null) return false;
        if (!a.getDayOfWeek().trim().equalsIgnoreCase(b.getDayOfWeek().trim())) return false;

        LocalTime startA = a.getStartTime();
        LocalTime endA = a.getEndTime();
        LocalTime startB = b.getStartTime();
        LocalTime endB = b.getEndTime();

        if (startA == null || endA == null || startB == null || endB == null) return false;

        // Overlap condition: !(endA <= startB || startA >= endB)
        return !(endA.isBefore(startB) || endA.equals(startB) || startA.isAfter(endB) || startA.equals(endB));
    }

    /**
     * Hàm đánh giá điểm số đa tiêu chí (Multi-criteria Fitness Evaluation)
     */
    private ScoreDetail evaluateScore(List<ClassSection> combo, ScheduleOptimizerRequest request) {
        int score = 70; // Base score
        List<String> highlights = new ArrayList<>();

        // 1. Avoid Days
        Set<String> avoidSet = request.getAvoidDays() != null
                ? request.getAvoidDays().stream().map(String::toUpperCase).collect(Collectors.toSet())
                : Collections.emptySet();

        Set<String> comboDays = combo.stream()
                .map(s -> s.getDayOfWeek() != null ? s.getDayOfWeek().toUpperCase() : "")
                .collect(Collectors.toSet());

        boolean violatedAvoidDay = false;
        for (String day : comboDays) {
            if (avoidSet.contains(day)) {
                score -= 30;
                violatedAvoidDay = true;
            }
        }
        if (!violatedAvoidDay && !avoidSet.isEmpty()) {
            score += 15;
            highlights.add("Tránh thành công các ngày: " + String.join(", ", avoidSet));
        }

        // 2. Preferred Shift
        String shift = request.getPreferredShift() != null ? request.getPreferredShift().toUpperCase() : "ANY";
        long morningCount = combo.stream().filter(s -> isMorning(s)).count();
        long afternoonCount = combo.stream().filter(s -> isAfternoon(s)).count();

        if ("MORNING".equals(shift)) {
            if (morningCount == combo.size()) {
                score += 20;
                highlights.add("100% các lớp học thuộc Ca Sáng");
            } else {
                score += (int) ((double) morningCount / combo.size() * 15) - 10;
            }
        } else if ("AFTERNOON".equals(shift)) {
            if (afternoonCount == combo.size()) {
                score += 20;
                highlights.add("100% các lớp học thuộc Ca Chiều");
            } else {
                score += (int) ((double) afternoonCount / combo.size() * 15) - 10;
            }
        }

        // 3. Compactness vs Balanced
        int uniqueDaysCount = comboDays.size();
        String goal = request.getOptimizationGoal() != null ? request.getOptimizationGoal().toUpperCase() : "COMPACT";

        if ("COMPACT".equals(goal) || "MAX_FREE_DAYS".equals(goal)) {
            if (uniqueDaysCount <= 2) {
                score += 20;
                highlights.add("Lịch cực kỳ gọn: Chỉ cần đến trường " + uniqueDaysCount + " ngày/tuần");
            } else if (uniqueDaysCount == 3) {
                score += 12;
                highlights.add("Lịch gọn trong 3 ngày/tuần");
            } else if (uniqueDaysCount >= 5) {
                score -= 10;
            }

            // Gaps check on same day
            boolean hasLongGap = checkLongGaps(combo);
            if (!hasLongGap) {
                score += 5;
                highlights.add("Không có tiết trống kéo dài giữa các ca");
            }
        } else if ("BALANCED".equals(goal)) {
            // Check if any day has > 2 classes
            Map<String, Long> countPerDay = combo.stream()
                    .collect(Collectors.groupingBy(ClassSection::getDayOfWeek, Collectors.counting()));
            boolean overload = countPerDay.values().stream().anyMatch(c -> c > 2);
            if (!overload) {
                score += 15;
                highlights.add("Phân bổ cân bằng, tối đa 2 lớp/ngày không gây quá tải");
            }
        }

        // 4. Seat buffer safety
        boolean plentySeats = combo.stream().allMatch(s -> (s.getMaxCapacity() - s.getCurrentEnrolled()) >= 5);
        if (plentySeats) {
            score += 5;
            highlights.add("Chỗ trống dồi dào (trung bình > 5 chỗ/lớp)");
        }

        // Clamp score between 35 and 99
        int finalScore = Math.max(35, Math.min(99, score));
        return new ScoreDetail(finalScore, uniqueDaysCount, new ArrayList<>(comboDays), highlights);
    }

    private boolean isMorning(ClassSection s) {
        if (s.getEndTime() == null) return true;
        return !s.getEndTime().isAfter(LocalTime.of(12, 30));
    }

    private boolean isAfternoon(ClassSection s) {
        if (s.getStartTime() == null) return false;
        return !s.getStartTime().isBefore(LocalTime.of(12, 0));
    }

    private boolean checkLongGaps(List<ClassSection> combo) {
        Map<String, List<ClassSection>> byDay = combo.stream()
                .filter(s -> s.getDayOfWeek() != null && s.getStartTime() != null)
                .collect(Collectors.groupingBy(ClassSection::getDayOfWeek));

        for (List<ClassSection> dayList : byDay.values()) {
            if (dayList.size() <= 1) continue;
            dayList.sort(Comparator.comparing(ClassSection::getStartTime));
            for (int i = 0; i < dayList.size() - 1; i++) {
                LocalTime endFirst = dayList.get(i).getEndTime();
                LocalTime startNext = dayList.get(i + 1).getStartTime();
                if (endFirst != null && startNext != null) {
                    long minutes = Duration.between(endFirst, startNext).toMinutes();
                    if (minutes > 150) { // Gap > 2.5 hours
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private List<SchedulePlanOption> selectTopDiversePlans(List<ScoredCombination> scored, ScheduleOptimizerRequest request) {
        List<SchedulePlanOption> result = new ArrayList<>();
        if (scored.isEmpty()) return result;

        // Plan 1: Best Overall Match
        ScoredCombination best = scored.get(0);
        result.add(createPlanOption(1, "Phương án 1: Tối ưu hàng đầu (AI Khuyên dùng)", best));

        // Plan 2: Most Compact / Fewest Days (if different)
        ScoredCombination mostCompact = scored.stream()
                .filter(s -> !isSameSections(s.sections, best.sections))
                .min(Comparator.comparingInt(s -> s.scoreDetail.uniqueDaysCount))
                .orElse(null);

        if (mostCompact != null) {
            result.add(createPlanOption(2, "Phương án 2: Tối đa ngày nghỉ (Dồn lịch)", mostCompact));
        }

        // Plan 3: Balanced or Alternative
        ScoredCombination alternative = scored.stream()
                .filter(s -> !isSameSections(s.sections, best.sections)
                        && (mostCompact == null || !isSameSections(s.sections, mostCompact.sections)))
                .findFirst()
                .orElse(null);

        if (alternative != null) {
            result.add(createPlanOption(3, "Phương án 3: Dự phòng tối ưu", alternative));
        }

        return result;
    }

    private boolean isSameSections(List<ClassSection> a, List<ClassSection> b) {
        if (a.size() != b.size()) return false;
        Set<Long> idsA = a.stream().map(ClassSection::getId).collect(Collectors.toSet());
        Set<Long> idsB = b.stream().map(ClassSection::getId).collect(Collectors.toSet());
        return idsA.equals(idsB);
    }

    private SchedulePlanOption createPlanOption(int index, String title, ScoredCombination sc) {
        int totalCredits = sc.sections.stream()
                .mapToInt(s -> s.getCourse() != null && s.getCourse().getCredits() != null ? s.getCourse().getCredits() : 3)
                .sum();

        List<ClassSectionDto> dtos = sc.sections.stream().map(this::toDto).collect(Collectors.toList());

        return new SchedulePlanOption(
                index,
                title,
                sc.scoreDetail.totalScore,
                totalCredits,
                sc.scoreDetail.uniqueDaysCount,
                sc.scoreDetail.studyDays,
                sc.scoreDetail.highlights,
                dtos
        );
    }

    private ClassSectionDto toDto(ClassSection cs) {
        ClassSectionDto dto = new ClassSectionDto();
        dto.setId(cs.getId());
        dto.setSectionCode(cs.getSectionCode());
        if (cs.getCourse() != null) {
            dto.setCourseCode(cs.getCourse().getCourseCode());
            dto.setCourseName(cs.getCourse().getName());
            dto.setCredits(cs.getCourse().getCredits());
            dto.setWeeklyHours(cs.getCourse().getWeeklyHours());
        }
        dto.setDayOfWeek(cs.getDayOfWeek());
        dto.setStartTime(cs.getStartTime() != null ? cs.getStartTime().toString() : "");
        dto.setEndTime(cs.getEndTime() != null ? cs.getEndTime().toString() : "");
        dto.setRoomName(cs.getRoomName());
        dto.setMaxCapacity(cs.getMaxCapacity());
        dto.setCurrentEnrolled(cs.getCurrentEnrolled());
        if (cs.getLecturer() != null && cs.getLecturer().getUser() != null) {
            dto.setLecturerName(cs.getLecturer().getUser().getFullName());
        }
        dto.setStatus(cs.getStatus());
        return dto;
    }

    private static class ScoredCombination {
        final List<ClassSection> sections;
        final ScoreDetail scoreDetail;

        ScoredCombination(List<ClassSection> sections, ScoreDetail scoreDetail) {
            this.sections = sections;
            this.scoreDetail = scoreDetail;
        }
    }

    private static class ScoreDetail {
        final int totalScore;
        final int uniqueDaysCount;
        final List<String> studyDays;
        final List<String> highlights;

        ScoreDetail(int totalScore, int uniqueDaysCount, List<String> studyDays, List<String> highlights) {
            this.totalScore = totalScore;
            this.uniqueDaysCount = uniqueDaysCount;
            this.studyDays = studyDays;
            this.highlights = highlights;
        }
    }
}
