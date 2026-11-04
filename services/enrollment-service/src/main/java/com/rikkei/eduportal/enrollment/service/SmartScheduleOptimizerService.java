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

/**
 * AI CSP Solver (Constraint Satisfaction Problem) cho bộ xếp lịch tự động.
 * Tối ưu hóa đặc biệt cho máy chủ tài nguyên giới hạn (VPS 1 Core / 2GB RAM):
 * 1. Fail-safe & Bounds Check: Validate đầu vào, lọc lớp hết chỗ, chặn StackOverflow/NullPointer.
 * 2. Execution Timeout Protection: Giới hạn tối đa 2.5s (2500ms), ngắt an toàn chuyển sang Fallback.
 * 3. CSP Pruning & MRV Heuristic: Cắt tỉa nhánh sớm theo interval collision [startA < endB && endA > startB]
 *    và ưu tiên môn ít lớp mở trước (Minimum Remaining Values).
 * 4. Partial Solution Fallback: Tuyệt đối không throw 500, trả về lịch cục bộ tối ưu kèm unassignedCourses và lý do chi tiết.
 */
@Service
public class SmartScheduleOptimizerService {

    private static final Logger log = LoggerFactory.getLogger(SmartScheduleOptimizerService.class);

    private static final long TIMEOUT_LIMIT_MS = 2500L; // Giới hạn thực thi tối đa 2.5 giây
    private static final int MAX_COMBINATIONS_CHECKED = 50_000; // Ngăn chặn vòng lặp vô tận và bùng nổ tổ hợp
    private static final int MAX_SOLUTIONS_COLLECTED = 50;

    private final ClassSectionRepository classSectionRepository;
    private final RealtimeSeatService realtimeSeatService;

    public SmartScheduleOptimizerService(ClassSectionRepository classSectionRepository,
                                         RealtimeSeatService realtimeSeatService) {
        this.classSectionRepository = classSectionRepository;
        this.realtimeSeatService = realtimeSeatService;
    }

    /**
     * Tối ưu hóa thời khóa biểu tự động với cơ chế CSP Solver và Partial Solution Fallback.
     */
    @Transactional(readOnly = true)
    public ScheduleOptimizerResponse optimizeSchedule(String studentCode, ScheduleOptimizerRequest request) {
        long startTimeMs = System.currentTimeMillis();
        long deadlineEpochMs = startTimeMs + TIMEOUT_LIMIT_MS;

        // A1. Validate dữ liệu đầu vào (Fail-safe check)
        if (request == null || request.getCourseIds() == null || request.getCourseIds().isEmpty()) {
            ScheduleOptimizerResponse emptyResp = new ScheduleOptimizerResponse(
                    null, 0, 0, 0, Collections.emptyList(),
                    "Vui lòng chọn ít nhất một môn học để AI bắt đầu tối ưu hóa thời khóa biểu."
            );
            emptyResp.setSuccess(false);
            emptyResp.setIsComplete(false);
            emptyResp.setExecutionTimeMs(System.currentTimeMillis() - startTimeMs);
            return emptyResp;
        }

        String semester = request.getSemesterName();
        if (semester == null || semester.trim().isEmpty()) {
            semester = "2024-25_SEM2"; // Học kỳ mặc định
        }

        // Loại bỏ trùng lặp và null trong danh sách môn yêu cầu
        List<Long> distinctCourseIds = request.getCourseIds().stream()
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        if (distinctCourseIds.isEmpty()) {
            ScheduleOptimizerResponse emptyResp = new ScheduleOptimizerResponse(
                    semester, 0, 0, 0, Collections.emptyList(),
                    "Vui lòng chọn ít nhất một môn học để AI bắt đầu tối ưu hóa thời khóa biểu."
            );
            emptyResp.setSuccess(false);
            emptyResp.setIsComplete(false);
            emptyResp.setExecutionTimeMs(System.currentTimeMillis() - startTimeMs);
            return emptyResp;
        }

        // Lấy tất cả lớp học phần của các môn trong kỳ
        List<ClassSection> allSections = classSectionRepository.findBySemesterAndCourseIdIn(
                semester, distinctCourseIds);

        if (allSections == null) {
            allSections = Collections.emptyList();
        }

        // A2. Lọc bỏ các lớp đã hủy (CANCELLED)
        List<ClassSection> activeSections = allSections.stream()
                .filter(cs -> cs.getStatus() == null || !"CANCELLED".equalsIgnoreCase(cs.getStatus()))
                .collect(Collectors.toList());

        // A3. Lọc bỏ các lớp đã hết chỗ (currentEnrollment >= maxCapacity) trừ khi cờ onlyAvailableSeats = false
        boolean onlyAvailableSeats = request.getOnlyAvailableSeats() == null || Boolean.TRUE.equals(request.getOnlyAvailableSeats());
        List<ClassSection> candidateSections;
        if (onlyAvailableSeats) {
            candidateSections = activeSections.stream()
                    .filter(cs -> {
                        int enrolled = cs.getCurrentEnrolled() != null ? cs.getCurrentEnrolled() : 0;
                        int capacity = cs.getMaxCapacity() != null ? cs.getMaxCapacity() : 40;
                        return enrolled < capacity;
                    })
                    .collect(Collectors.toList());
        } else {
            candidateSections = activeSections;
        }

        // Nhóm lớp theo courseId
        Map<Long, List<ClassSection>> sectionsByCourse = candidateSections.stream()
                .filter(cs -> cs.getCourse() != null && cs.getCourse().getId() != null)
                .collect(Collectors.groupingBy(cs -> cs.getCourse().getId()));

        // Nhóm toàn bộ lớp ban đầu để phân tích nguyên nhân nếu môn bị loại
        Map<Long, List<ClassSection>> allSectionsByCourse = activeSections.stream()
                .filter(cs -> cs.getCourse() != null && cs.getCourse().getId() != null)
                .collect(Collectors.groupingBy(cs -> cs.getCourse().getId()));

        List<CourseTarget> targetsWithSections = new ArrayList<>();
        List<UnassignedCourseDto> unassignedCourses = new ArrayList<>();

        for (Long cId : distinctCourseIds) {
            List<ClassSection> available = sectionsByCourse.getOrDefault(cId, Collections.emptyList());
            List<ClassSection> totalInSemester = allSectionsByCourse.getOrDefault(cId, Collections.emptyList());

            Course sampleCourse = null;
            if (!totalInSemester.isEmpty()) {
                sampleCourse = totalInSemester.get(0).getCourse();
            } else if (!available.isEmpty()) {
                sampleCourse = available.get(0).getCourse();
            }

            String cCode = sampleCourse != null ? sampleCourse.getCourseCode() : ("Môn #" + cId);
            String cName = sampleCourse != null ? sampleCourse.getName() : "";
            int credits = sampleCourse != null && sampleCourse.getCredits() != null ? sampleCourse.getCredits() : 3;

            if (available.isEmpty()) {
                String reason;
                if (totalInSemester.isEmpty()) {
                    reason = "Không có lớp học phần nào mở trong học kỳ " + semester;
                } else {
                    reason = "Tất cả các lớp học phần của môn này đều đã hết chỗ trống";
                }
                unassignedCourses.add(new UnassignedCourseDto(cCode, cName, reason));
            } else {
                targetsWithSections.add(new CourseTarget(cId, cCode, cName, credits, available));
            }
        }

        // Trường hợp không có môn nào có lớp mở hoặc còn chỗ
        if (targetsWithSections.isEmpty()) {
            long execTime = System.currentTimeMillis() - startTimeMs;
            ScheduleOptimizerResponse response = new ScheduleOptimizerResponse(
                    true, false, 0, Collections.emptyList(), unassignedCourses, execTime,
                    semester, distinctCourseIds.size(), 0, 0, Collections.emptyList(),
                    "Không tìm thấy lớp học phần nào còn mở hoặc còn chỗ cho các môn đã chọn."
            );
            return response;
        }

        // B2. Áp dụng Heuristic MRV (Minimum Remaining Values):
        // Sắp xếp các môn có ít lớp mở nhất lên trước để phát hiện nhánh cụt sớm hơn và cắt tỉa nhanh
        targetsWithSections.sort(Comparator.comparingInt(c -> c.candidateSections.size()));

        // Chạy thuật toán CSP DFS Backtracking kèm giới hạn thời gian (Timeout 2.5s) và cắt tỉa (Pruning)
        SearchContext searchCtx = new SearchContext(deadlineEpochMs, targetsWithSections, request);
        backtrackSearch(0, new ArrayList<>(), searchCtx);

        long execTime = System.currentTimeMillis() - startTimeMs;
        log.info("CSP Optimizer finished in {}ms. Checked combinations: {}, Full solutions found: {}, Timed out: {}",
                execTime, searchCtx.totalCombinationsChecked, searchCtx.validFullCombinations.size(), searchCtx.timedOut);

        // C. Xử lý kết quả: Nghiệm tuyệt đối (Full) hoặc Nghiệm cục bộ (Partial Fallback)
        if (!searchCtx.validFullCombinations.isEmpty()) {
            // C1. TÌM THẤY NGHIỆM ĐẦY ĐỦ (100% các môn có lớp)
            List<ScoredCombination> scored = new ArrayList<>();
            for (List<ClassSection> combo : searchCtx.validFullCombinations) {
                ScoreDetail scoreDetail = evaluateScore(combo, request);
                scored.add(new ScoredCombination(combo, scoreDetail));
            }

            scored.sort((a, b) -> Integer.compare(b.scoreDetail.totalScore, a.scoreDetail.totalScore));
            List<SchedulePlanOption> plans = selectTopDiversePlans(scored, request);

            List<ClassSection> bestCombo = scored.get(0).sections;
            List<ScheduleItemDto> scheduleItems = bestCombo.stream()
                    .map(this::toScheduleItemDto)
                    .collect(Collectors.toList());

            int totalCredits = bestCombo.stream()
                    .mapToInt(cs -> cs.getCourse() != null && cs.getCourse().getCredits() != null ? cs.getCourse().getCredits() : 3)
                    .sum();

            boolean isComplete = unassignedCourses.isEmpty();
            String statusMsg = "AI đã phân tích " + searchCtx.totalCombinationsChecked + " tổ hợp và tìm thấy "
                    + searchCtx.validFullCombinations.size() + " phương án tối ưu hợp lệ không bị trùng lịch!";
            if (!unassignedCourses.isEmpty()) {
                statusMsg += " (Lưu ý: Có " + unassignedCourses.size() + " môn chưa thể xếp do hết lớp hoặc hết chỗ).";
            }

            return new ScheduleOptimizerResponse(
                    true,
                    isComplete,
                    totalCredits,
                    scheduleItems,
                    unassignedCourses,
                    execTime,
                    semester,
                    distinctCourseIds.size(),
                    searchCtx.totalCombinationsChecked,
                    searchCtx.validFullCombinations.size(),
                    plans,
                    statusMsg
            );
        } else {
            // C2. PARTIAL SOLUTION FALLBACK (Nghiệm dự phòng tối ưu)
            // Tuyệt đối không ném lỗi 500, tìm tổ hợp con xếp được nhiều môn nhất có thể
            List<ClassSection> fallbackSections = searchCtx.bestPartialCombination;

            // Nếu bestPartial từ DFS quá nhỏ, thử thuật toán tham lam tìm tập độc lập tối đại
            List<ClassSection> maximalSubset = findMaximalNonConflictingSubset(targetsWithSections, deadlineEpochMs);
            if (maximalSubset.size() > fallbackSections.size()) {
                fallbackSections = maximalSubset;
            }

            Set<Long> scheduledCourseIds = fallbackSections.stream()
                    .filter(s -> s.getCourse() != null && s.getCourse().getId() != null)
                    .map(s -> s.getCourse().getId())
                    .collect(Collectors.toSet());

            // Phân tích lý do vì sao các môn còn lại không được xếp vào
            for (CourseTarget target : targetsWithSections) {
                if (!scheduledCourseIds.contains(target.courseId)) {
                    String conflictReason = determineConflictReason(target, fallbackSections);
                    unassignedCourses.add(new UnassignedCourseDto(target.courseCode, target.courseName, conflictReason));
                }
            }

            List<ScheduleItemDto> scheduleItems = fallbackSections.stream()
                    .map(this::toScheduleItemDto)
                    .collect(Collectors.toList());

            int totalCredits = fallbackSections.stream()
                    .mapToInt(cs -> cs.getCourse() != null && cs.getCourse().getCredits() != null ? cs.getCourse().getCredits() : 3)
                    .sum();

            // Tạo phương án hiển thị để giao diện vẫn hiển thị thời khóa biểu & giữ chỗ được
            List<SchedulePlanOption> partialPlans = new ArrayList<>();
            if (!fallbackSections.isEmpty()) {
                ScoreDetail scoreDetail = evaluateScore(fallbackSections, request);
                int matchPercentage = (int) Math.round(((double) fallbackSections.size() / distinctCourseIds.size()) * 100);
                SchedulePlanOption partialPlan = createPlanOption(
                        1,
                        "Phương án tối ưu cục bộ (Xếp được " + fallbackSections.size() + "/" + distinctCourseIds.size() + " môn)",
                        new ScoredCombination(fallbackSections, scoreDetail)
                );
                partialPlan.setMatchPercentage(matchPercentage);
                partialPlans.add(partialPlan);
            }

            String reasonSummary = searchCtx.timedOut
                    ? "Đã chạm giới hạn thời gian 2.5s. AI đã chuyển sang chiến lược Fallback tối ưu tốt nhất."
                    : "Các môn học bị xung đột khung giờ 100%. AI đã tìm phương án tối ưu xếp được nhiều môn nhất có thể.";

            String statusMsg = "Không thể xếp đồng thời 100% các môn đã chọn (" + reasonSummary + "). "
                    + "Đã xếp thành công " + fallbackSections.size() + "/" + distinctCourseIds.size() + " môn.";

            return new ScheduleOptimizerResponse(
                    true,
                    false, // isComplete = false
                    totalCredits,
                    scheduleItems,
                    unassignedCourses,
                    execTime,
                    semester,
                    distinctCourseIds.size(),
                    searchCtx.totalCombinationsChecked,
                    partialPlans.size(),
                    partialPlans,
                    statusMsg
            );
        }
    }

    /**
     * B1. Thuật toán DFS Backtracking với Branch Pruning, MRV và Timeout Protection
     */
    private void backtrackSearch(int targetIndex, List<ClassSection> currentAssignment, SearchContext ctx) {
        // Cập nhật phương án bộ phận tốt nhất tìm được cho đến thời điểm hiện tại
        if (currentAssignment.size() > ctx.bestPartialCombination.size()) {
            ctx.bestPartialCombination = new ArrayList<>(currentAssignment);
        }

        // Kiểm tra điều kiện ngắt thời gian (2.5 giây) hoặc giới hạn tổ hợp
        if (System.currentTimeMillis() > ctx.deadlineEpochMs) {
            ctx.timedOut = true;
            return;
        }

        if (ctx.totalCombinationsChecked >= MAX_COMBINATIONS_CHECKED
                || ctx.validFullCombinations.size() >= MAX_SOLUTIONS_COLLECTED) {
            return;
        }

        // Đã gán thành công tất cả các môn mục tiêu
        if (targetIndex == ctx.targets.size()) {
            ctx.validFullCombinations.add(new ArrayList<>(currentAssignment));
            return;
        }

        CourseTarget currentTarget = ctx.targets.get(targetIndex);

        for (ClassSection section : currentTarget.candidateSections) {
            ctx.totalCombinationsChecked++;

            if (System.currentTimeMillis() > ctx.deadlineEpochMs) {
                ctx.timedOut = true;
                break;
            }

            // B1. CẮT TỈA NHÁNH SỚM (Branch Pruning): Kiểm tra trùng lịch ngay lập tức
            if (!hasConflictWithCurrent(section, currentAssignment)) {
                currentAssignment.add(section);
                backtrackSearch(targetIndex + 1, currentAssignment, ctx);
                currentAssignment.remove(currentAssignment.size() - 1);
            }
        }
    }

    /**
     * C3. Tìm tập lớp học phần không xung đột tối đại (Maximal Independent Set Fallback)
     */
    private List<ClassSection> findMaximalNonConflictingSubset(List<CourseTarget> targets, long deadlineEpochMs) {
        List<ClassSection> bestSubset = new ArrayList<>();

        // Thử nhiều điểm bắt đầu khác nhau (mỗi môn được ưu tiên làm gốc 1 lần)
        for (int startIndex = 0; startIndex < targets.size(); startIndex++) {
            if (System.currentTimeMillis() > deadlineEpochMs) break;

            List<ClassSection> currentSubset = new ArrayList<>();

            // Duyệt từ startIndex đến hết rồi vòng lại
            for (int i = 0; i < targets.size(); i++) {
                int idx = (startIndex + i) % targets.size();
                CourseTarget target = targets.get(idx);

                // Tìm lớp đầu tiên của môn này không xung đột với các lớp đã chọn
                for (ClassSection section : target.candidateSections) {
                    if (!hasConflictWithCurrent(section, currentSubset)) {
                        currentSubset.add(section);
                        break;
                    }
                }
            }

            if (currentSubset.size() > bestSubset.size()) {
                bestSubset = currentSubset;
            }
        }

        return bestSubset;
    }

    /**
     * Xác định chi tiết lý do xung đột của một môn không được xếp lịch với các lớp đã chọn
     */
    private String determineConflictReason(CourseTarget target, List<ClassSection> assignedSections) {
        if (target.candidateSections.isEmpty()) {
            return "Không có lớp mở hoặc tất cả các lớp đã hết chỗ";
        }

        for (ClassSection candidate : target.candidateSections) {
            for (ClassSection assigned : assignedSections) {
                if (hasTimeCollision(candidate, assigned)) {
                    String assignedCode = assigned.getCourse() != null ? assigned.getCourse().getCourseCode() : "môn đã chọn";
                    String day = assigned.getDayOfWeek() != null ? assigned.getDayOfWeek() : "";
                    String time = (assigned.getStartTime() != null ? assigned.getStartTime().toString() : "") +
                            "-" + (assigned.getEndTime() != null ? assigned.getEndTime().toString() : "");
                    return "Trùng khung giờ với môn " + assignedCode + " (" + day + " " + time + ")";
                }
            }
        }

        return "Xung đột lịch học với các môn ưu tiên khác trong tổ hợp";
    }

    /**
     * Kiểm tra xung đột thời gian giữa 1 lớp học phần mục tiêu với danh sách lớp đã chọn
     */
    public boolean hasConflictWithCurrent(ClassSection target, List<ClassSection> current) {
        if (target == null || current == null || current.isEmpty()) return false;
        for (ClassSection existing : current) {
            if (hasTimeCollision(target, existing)) {
                return true;
            }
        }
        return false;
    }

    /**
     * B1. Hai lớp xung đột nếu cùng thứ và khoảng thời gian giao nhau:
     * Điều kiện toán học chuẩn: [startA < endB && endA > startB]
     */
    public boolean hasTimeCollision(ClassSection a, ClassSection b) {
        if (a == null || b == null) return false;
        if (a.getDayOfWeek() == null || b.getDayOfWeek() == null) return false;

        String dayA = normalizeDay(a.getDayOfWeek());
        String dayB = normalizeDay(b.getDayOfWeek());
        if (!dayA.equalsIgnoreCase(dayB)) return false;

        LocalTime startA = a.getStartTime();
        LocalTime endA = a.getEndTime();
        LocalTime startB = b.getStartTime();
        LocalTime endB = b.getEndTime();

        if (startA == null || endA == null || startB == null || endB == null) return false;

        // Overlap Interval Collision: startA < endB && endA > startB
        return startA.isBefore(endB) && endA.isAfter(startB);
    }

    /**
     * Chuẩn hóa thứ trong tuần hỗ trợ đa định dạng (MON, Thứ 2, Monday...)
     */
    private static String normalizeDay(String day) {
        if (day == null) return "";
        String s = day.trim().toUpperCase();
        if (s.contains("2") || s.equals("MON") || s.equals("MONDAY") || s.contains("HAI")) return "MON";
        if (s.contains("3") || s.equals("TUE") || s.equals("TUESDAY") || s.contains("BA")) return "TUE";
        if (s.contains("4") || s.equals("WED") || s.equals("WEDNESDAY") || s.contains("TƯ") || s.contains("TU")) return "WED";
        if (s.contains("5") || s.equals("THU") || s.equals("THURSDAY") || s.contains("NĂM") || s.contains("NAM")) return "THU";
        if (s.contains("6") || s.equals("FRI") || s.equals("FRIDAY") || s.contains("SÁU") || s.contains("SAU")) return "FRI";
        if (s.contains("7") || s.equals("SAT") || s.equals("SATURDAY") || s.contains("BẢY") || s.contains("BAY")) return "SAT";
        if (s.contains("CN") || s.contains("SUN") || s.equals("SUNDAY") || s.contains("CHỦ") || s.contains("CHU") || s.contains("8")) return "SUN";
        return s;
    }

    /**
     * Chuyển thứ sang số (2 = Thứ 2, 3 = Thứ 3, ..., 8 = Chủ Nhật)
     */
    private static int dayOfWeekToInt(String day) {
        if (day == null) return 2;
        String s = normalizeDay(day);
        return switch (s) {
            case "MON" -> 2;
            case "TUE" -> 3;
            case "WED" -> 4;
            case "THU" -> 5;
            case "FRI" -> 6;
            case "SAT" -> 7;
            case "SUN" -> 8;
            default -> 2;
        };
    }

    /**
     * Chuyển giờ học sang tiết bắt đầu chuẩn
     */
    private static int calculateStartPeriod(LocalTime time) {
        if (time == null) return 1;
        int minutes = time.getHour() * 60 + time.getMinute();
        if (minutes <= 460) return 1;  // ~07:00
        if (minutes <= 510) return 2;  // ~07:50
        if (minutes <= 560) return 3;  // ~08:45
        if (minutes <= 615) return 4;  // ~09:35
        if (minutes <= 700) return 5;  // ~10:25
        if (minutes <= 780) return 6;  // ~12:30
        if (minutes <= 835) return 7;  // ~13:20
        if (minutes <= 890) return 8;  // ~14:15
        if (minutes <= 940) return 9;  // ~15:05
        if (minutes <= 1000) return 10; // ~15:55
        return 11;
    }

    /**
     * Chuyển giờ kết thúc sang tiết kết thúc chuẩn
     */
    private static int calculateEndPeriod(LocalTime time) {
        if (time == null) return 3;
        int minutes = time.getHour() * 60 + time.getMinute();
        if (minutes <= 505) return 1;
        if (minutes <= 555) return 2;
        if (minutes <= 610) return 3;
        if (minutes <= 670) return 4;
        if (minutes <= 740) return 5;
        if (minutes <= 830) return 6;
        if (minutes <= 885) return 7;
        if (minutes <= 935) return 8;
        if (minutes <= 995) return 9;
        if (minutes <= 1055) return 10;
        return 11;
    }

    /**
     * Chuyển ClassSection Entity sang ScheduleItemDto
     */
    private ScheduleItemDto toScheduleItemDto(ClassSection cs) {
        String courseCode = cs.getCourse() != null ? cs.getCourse().getCourseCode() : "N/A";
        String courseName = cs.getCourse() != null ? cs.getCourse().getName() : "N/A";
        int credits = cs.getCourse() != null && cs.getCourse().getCredits() != null ? cs.getCourse().getCredits() : 3;
        int dayOfWeekNum = dayOfWeekToInt(cs.getDayOfWeek());
        int startPeriod = calculateStartPeriod(cs.getStartTime());
        int endPeriod = calculateEndPeriod(cs.getEndTime());
        if (endPeriod < startPeriod) endPeriod = startPeriod;
        String lecturerName = cs.getLecturer() != null && cs.getLecturer().getUser() != null
                ? cs.getLecturer().getUser().getFullName() : "";

        return new ScheduleItemDto(
                courseCode,
                courseName,
                String.valueOf(cs.getId()),
                cs.getSectionCode(),
                dayOfWeekNum,
                cs.getDayOfWeek() != null ? cs.getDayOfWeek() : "Thứ " + dayOfWeekNum,
                startPeriod,
                endPeriod,
                cs.getStartTime() != null ? cs.getStartTime().toString() : "",
                cs.getEndTime() != null ? cs.getEndTime().toString() : "",
                cs.getRoomName() != null ? cs.getRoomName() : "",
                lecturerName,
                credits
        );
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
     * Hàm đánh giá điểm số đa tiêu chí (Multi-criteria Fitness Evaluation)
     */
    private ScoreDetail evaluateScore(List<ClassSection> combo, ScheduleOptimizerRequest request) {
        if (combo == null || combo.isEmpty()) {
            return new ScoreDetail(0, 0, Collections.emptyList(), Collections.emptyList());
        }

        int score = 70; // Base score
        List<String> highlights = new ArrayList<>();

        // 1. Avoid Days
        Set<String> avoidSet = request != null && request.getAvoidDays() != null
                ? request.getAvoidDays().stream().map(String::toUpperCase).collect(Collectors.toSet())
                : Collections.emptySet();

        Set<String> comboDays = combo.stream()
                .map(s -> s.getDayOfWeek() != null ? normalizeDay(s.getDayOfWeek()) : "")
                .filter(s -> !s.isEmpty())
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
        String shift = request != null && request.getPreferredShift() != null
                ? request.getPreferredShift().toUpperCase() : "ANY";
        long morningCount = combo.stream().filter(this::isMorning).count();
        long afternoonCount = combo.stream().filter(this::isAfternoon).count();

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
        String goal = request != null && request.getOptimizationGoal() != null
                ? request.getOptimizationGoal().toUpperCase() : "COMPACT";

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

            boolean hasLongGap = checkLongGaps(combo);
            if (!hasLongGap) {
                score += 5;
                highlights.add("Không có tiết trống kéo dài giữa các ca");
            }
        } else if ("BALANCED".equals(goal)) {
            Map<String, Long> countPerDay = combo.stream()
                    .filter(s -> s.getDayOfWeek() != null)
                    .collect(Collectors.groupingBy(ClassSection::getDayOfWeek, Collectors.counting()));
            boolean overload = countPerDay.values().stream().anyMatch(c -> c > 2);
            if (!overload) {
                score += 15;
                highlights.add("Phân bổ cân bằng, tối đa 2 lớp/ngày không gây quá tải");
            }
        }

        // 4. Seat buffer safety
        boolean plentySeats = combo.stream().allMatch(s -> {
            int enrolled = s.getCurrentEnrolled() != null ? s.getCurrentEnrolled() : 0;
            int cap = s.getMaxCapacity() != null ? s.getMaxCapacity() : 40;
            return (cap - enrolled) >= 5;
        });
        if (plentySeats) {
            score += 5;
            highlights.add("Chỗ trống dồi dào (trung bình > 5 chỗ/lớp)");
        }

        // Clamp score between 35 and 99
        int finalScore = Math.max(35, Math.min(99, score));
        return new ScoreDetail(finalScore, uniqueDaysCount, new ArrayList<>(comboDays), highlights);
    }

    private boolean isMorning(ClassSection s) {
        if (s == null || s.getEndTime() == null) return true;
        return !s.getEndTime().isAfter(LocalTime.of(12, 30));
    }

    private boolean isAfternoon(ClassSection s) {
        if (s == null || s.getStartTime() == null) return false;
        return !s.getStartTime().isBefore(LocalTime.of(12, 0));
    }

    private boolean checkLongGaps(List<ClassSection> combo) {
        if (combo == null || combo.isEmpty()) return false;
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
        if (scored == null || scored.isEmpty()) return result;

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
        if (a == null || b == null) return false;
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

    // =========================================================================
    // Helper Classes
    // =========================================================================

    private static class CourseTarget {
        final Long courseId;
        final String courseCode;
        final String courseName;
        final int credits;
        final List<ClassSection> candidateSections;

        CourseTarget(Long courseId, String courseCode, String courseName, int credits, List<ClassSection> candidateSections) {
            this.courseId = courseId;
            this.courseCode = courseCode;
            this.courseName = courseName;
            this.credits = credits;
            this.candidateSections = candidateSections != null ? candidateSections : Collections.emptyList();
        }
    }

    private static class SearchContext {
        final long deadlineEpochMs;
        final List<CourseTarget> targets;
        final ScheduleOptimizerRequest request;
        final List<List<ClassSection>> validFullCombinations = new ArrayList<>();
        List<ClassSection> bestPartialCombination = new ArrayList<>();
        int totalCombinationsChecked = 0;
        boolean timedOut = false;

        SearchContext(long deadlineEpochMs, List<CourseTarget> targets, ScheduleOptimizerRequest request) {
            this.deadlineEpochMs = deadlineEpochMs;
            this.targets = targets;
            this.request = request;
        }
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
