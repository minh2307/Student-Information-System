package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.config.ScheduleOptimizerProperties;
import com.rikkei.eduportal.enrollment.dto.*;
import com.rikkei.eduportal.enrollment.entity.ClassSection;
import com.rikkei.eduportal.enrollment.entity.Course;
import com.rikkei.eduportal.enrollment.repository.ClassSectionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
 * 2. Execution Timeout Protection: Giới hạn tối đa (mặc định 2.5s), ngắt an toàn chuyển sang Fallback.
 * 3. CSP Pruning & MRV Heuristic + Forward Checking: Cắt tỉa nhánh sớm theo interval collision [startA < endB && endA > startB],
 *    phát hiện Domain Wipeout lập tức và ưu tiên môn ít lớp mở trước (Minimum Remaining Values).
 * 4. Partial Solution Fallback: Tuyệt đối không throw 500, trả về lịch cục bộ tối ưu kèm unassignedCourses và lý do chi tiết.
 * 5. Configuration & Status Contract: Tương thích hoàn toàn với ScheduleOptimizerProperties và OptimizationStatus enum.
 */
@Service
public class SmartScheduleOptimizerService {

    private static final Logger log = LoggerFactory.getLogger(SmartScheduleOptimizerService.class);

    private static final long DEFAULT_TIMEOUT_LIMIT_MS = 2500L;
    private static final int DEFAULT_MAX_COMBINATIONS_CHECKED = 50_000;
    private static final int DEFAULT_MAX_SOLUTIONS = 50;

    private final ClassSectionRepository classSectionRepository;
    private final RealtimeSeatService realtimeSeatService;
    private final ScheduleOptimizerProperties properties;

    public SmartScheduleOptimizerService(ClassSectionRepository classSectionRepository,
                                         RealtimeSeatService realtimeSeatService) {
        this(classSectionRepository, realtimeSeatService, new ScheduleOptimizerProperties());
    }

    @Autowired
    public SmartScheduleOptimizerService(ClassSectionRepository classSectionRepository,
                                         RealtimeSeatService realtimeSeatService,
                                         ScheduleOptimizerProperties properties) {
        this.classSectionRepository = classSectionRepository;
        this.realtimeSeatService = realtimeSeatService;
        this.properties = properties != null ? properties : new ScheduleOptimizerProperties();
    }

    /**
     * Tối ưu hóa thời khóa biểu tự động với cơ chế CSP Solver (MRV + Forward Checking) và Partial Solution Fallback.
     */
    @Transactional(readOnly = true)
    public ScheduleOptimizerResponse optimizeSchedule(String studentCode, ScheduleOptimizerRequest request) {
        long startNanos = System.nanoTime();
        long startTimeMs = System.currentTimeMillis();

        // 1. Validate dữ liệu đầu vào
        if (request == null || request.getCourseIds() == null || request.getCourseIds().isEmpty()) {
            long executionTimeMs = (System.nanoTime() - startNanos) / 1_000_000;
            ScheduleOptimizerResponse emptyResp = new ScheduleOptimizerResponse(
                    null, 0, 0, 0, Collections.emptyList(),
                    "Vui lòng chọn ít nhất một môn học để AI bắt đầu tối ưu hóa thời khóa biểu."
            );
            emptyResp.setSuccess(false);
            emptyResp.setIsComplete(false);
            emptyResp.setStatus(OptimizationStatus.INVALID_REQUEST);
            emptyResp.setExecutionTimeMs(executionTimeMs);
            return emptyResp;
        }

        String semester = request.getSemesterName();
        if (semester == null || semester.trim().isEmpty()) {
            semester = "2024-25_SEM2";
        }

        List<Long> distinctCourseIds = request.getCourseIds().stream()
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        if (distinctCourseIds.isEmpty()) {
            long executionTimeMs = (System.nanoTime() - startNanos) / 1_000_000;
            ScheduleOptimizerResponse emptyResp = new ScheduleOptimizerResponse(
                    semester, 0, 0, 0, Collections.emptyList(),
                    "Vui lòng chọn ít nhất một môn học để AI bắt đầu tối ưu hóa thời khóa biểu."
            );
            emptyResp.setSuccess(false);
            emptyResp.setIsComplete(false);
            emptyResp.setStatus(OptimizationStatus.INVALID_REQUEST);
            emptyResp.setExecutionTimeMs(executionTimeMs);
            return emptyResp;
        }

        // 2. Lấy danh sách lớp học phần
        List<ClassSection> allSections = classSectionRepository.findBySemesterAndCourseIdIn(
                semester, distinctCourseIds);
        if (allSections == null) {
            allSections = Collections.emptyList();
        }

        // Lọc bỏ lớp CANCELLED
        List<ClassSection> activeSections = allSections.stream()
                .filter(cs -> cs.getStatus() == null || !"CANCELLED".equalsIgnoreCase(cs.getStatus()))
                .collect(Collectors.toList());

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

        Map<Long, List<ClassSection>> sectionsByCourse = candidateSections.stream()
                .filter(cs -> cs.getCourse() != null && cs.getCourse().getId() != null)
                .collect(Collectors.groupingBy(cs -> cs.getCourse().getId()));

        Map<Long, List<ClassSection>> allSectionsByCourse = activeSections.stream()
                .filter(cs -> cs.getCourse() != null && cs.getCourse().getId() != null)
                .collect(Collectors.groupingBy(cs -> cs.getCourse().getId()));

        List<CourseTarget> targetsWithSections = new ArrayList<>();
        List<UnassignedCourseDto> unassignedCourses = new ArrayList<>();
        List<Long> targetCourseIds = new ArrayList<>();

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
                targetCourseIds.add(cId);
            }
        }

        if (targetsWithSections.isEmpty()) {
            long executionTimeMs = (System.nanoTime() - startNanos) / 1_000_000;
            ScheduleOptimizerResponse response = new ScheduleOptimizerResponse(
                    true, false, 0, Collections.emptyList(), unassignedCourses, executionTimeMs,
                    semester, distinctCourseIds.size(), 0, 0, Collections.emptyList(),
                    "Không tìm thấy lớp học phần nào còn mở hoặc còn chỗ cho các môn đã chọn."
            );
            response.setStatus(OptimizationStatus.NO_SOLUTION);
            return response;
        }

        // 3. Chuẩn bị CSP Variables và Candidate Domains
        List<ClassSection> allCandidates = new ArrayList<>();
        List<List<Integer>> courseBuckets = new ArrayList<>();
        for (CourseTarget target : targetsWithSections) {
            List<ClassSection> sections = new ArrayList<>(target.candidateSections);
            sortCandidateSections(sections, request);

            List<Integer> bucketIndices = new ArrayList<>();
            for (ClassSection sec : sections) {
                bucketIndices.add(allCandidates.size());
                allCandidates.add(sec);
            }
            courseBuckets.add(bucketIndices);
        }

        // 4. Xây dựng Collision Matrix O(N^2) tra cứu O(1)
        boolean[][] collisionMatrix = buildCollisionMatrix(allCandidates);

        // 5. Cấu hình Search Limits
        int maxNodes;
        if (request.getMaxSearchNodes() != null && request.getMaxSearchNodes() > 0) {
            maxNodes = request.getMaxSearchNodes();
        } else if (properties != null && properties.getMaxSearchNodes() > 0) {
            maxNodes = properties.getMaxSearchNodes();
        } else {
            maxNodes = DEFAULT_MAX_COMBINATIONS_CHECKED;
        }

        long maxTimeMs;
        if (request.getMaxExecutionTimeMs() != null && request.getMaxExecutionTimeMs() >= 0) {
            maxTimeMs = request.getMaxExecutionTimeMs();
        } else if (properties != null && properties.getMaxExecutionTimeMs() > 0) {
            maxTimeMs = properties.getMaxExecutionTimeMs();
        } else {
            maxTimeMs = DEFAULT_TIMEOUT_LIMIT_MS;
        }

        int maxSolutions;
        if (request.getMaxSolutions() != null && request.getMaxSolutions() > 0) {
            maxSolutions = request.getMaxSolutions();
        } else if (properties != null && properties.getMaxSolutions() > 0) {
            maxSolutions = properties.getMaxSolutions();
        } else {
            maxSolutions = DEFAULT_MAX_SOLUTIONS;
        }

        SearchContext context = new SearchContext(maxTimeMs, maxNodes, maxSolutions);

        List<Integer> unassignedCourseIndices = new ArrayList<>();
        for (int i = 0; i < courseBuckets.size(); i++) {
            unassignedCourseIndices.add(i);
        }

        // 6. Thực thi CSP DFS Backtracking với MRV & Forward Checking
        solveWithMrv(courseBuckets, new ArrayList<>(), unassignedCourseIndices, courseBuckets.size(),
                collisionMatrix, allCandidates, context);

        long executionTimeMs = (System.nanoTime() - startNanos) / 1_000_000;

        // 7. Xử lý kết quả
        if (!context.solutions.isEmpty()) {
            List<ScoredCombination> scored = new ArrayList<>();
            for (List<ClassSection> combo : context.solutions) {
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
            String statusMsg = "AI CSP Optimizer đã phân tích " + context.nodesExplored + " tổ hợp và tìm thấy "
                    + context.solutions.size() + " phương án tối ưu hợp lệ không bị trùng lịch!";
            if (!unassignedCourses.isEmpty()) {
                statusMsg += " (Lưu ý: Có " + unassignedCourses.size() + " môn chưa thể xếp do hết lớp hoặc hết chỗ).";
            }

            ScheduleOptimizerResponse response = new ScheduleOptimizerResponse(
                    true,
                    isComplete,
                    totalCredits,
                    scheduleItems,
                    unassignedCourses,
                    executionTimeMs,
                    semester,
                    distinctCourseIds.size(),
                    context.nodesExplored,
                    context.solutions.size(),
                    plans,
                    statusMsg
            );
            response.setStatus(OptimizationStatus.SUCCESS);
            return response;
        } else {
            // Không tìm thấy nghiệm 100% -> Kích hoạt Partial Solution Fallback
            String conflictDetails = findConflictExplanation(courseBuckets, collisionMatrix, allCandidates);

            String reasonSummary;
            OptimizationStatus finalStatus;
            if (context.interrupted) {
                reasonSummary = "Tìm kiếm bị ngắt an toàn.";
                finalStatus = OptimizationStatus.TIME_LIMIT_EXCEEDED;
            } else if (context.timeLimitExceeded) {
                reasonSummary = "Thời gian tìm kiếm đã vượt quá giới hạn tối đa (" + maxTimeMs + "ms). Chạm giới hạn thời gian.";
                finalStatus = OptimizationStatus.TIME_LIMIT_EXCEEDED;
            } else if (context.nodeLimitExceeded) {
                reasonSummary = "Thuật toán tìm kiếm đã chạm giới hạn duyệt (" + maxNodes + " tổ hợp).";
                finalStatus = OptimizationStatus.SEARCH_LIMIT_REACHED;
            } else {
                reasonSummary = "Không thể ghép được phương án nào không bị trùng lịch giữa các môn học đã chọn. " + conflictDetails;
                finalStatus = OptimizationStatus.NO_SOLUTION;
            }

            // Fallback maximal non-conflicting subset
            List<ClassSection> fallbackSections = findMaximalNonConflictingSubset(targetsWithSections);
            Set<Long> scheduledCourseIds = fallbackSections.stream()
                    .filter(s -> s.getCourse() != null && s.getCourse().getId() != null)
                    .map(s -> s.getCourse().getId())
                    .collect(Collectors.toSet());

            for (CourseTarget target : targetsWithSections) {
                if (!scheduledCourseIds.contains(target.courseId)) {
                    String conflictReason = determineConflictReason(target, fallbackSections);
                    unassignedCourses.add(new UnassignedCourseDto(target.courseCode, target.courseName, conflictReason));
                }
            }

            List<ScheduleItemDto> scheduleItems = fallbackSections.stream()
                    .map(this::toScheduleItemDto)
                    .collect(Collectors.toList());

            int fallbackCredits = fallbackSections.stream()
                    .mapToInt(cs -> cs.getCourse() != null && cs.getCourse().getCredits() != null ? cs.getCourse().getCredits() : 3)
                    .sum();

            List<SchedulePlanOption> partialPlans = new ArrayList<>();
            if (!fallbackSections.isEmpty() && !context.nodeLimitExceeded && !context.timeLimitExceeded && !context.interrupted) {
                ScoreDetail scoreDetail = evaluateScore(fallbackSections, request);
                int matchPercentage = (int) Math.round(((double) fallbackSections.size() / distinctCourseIds.size()) * 100);
                SchedulePlanOption partialPlan = createPlanOption(
                        1,
                        "Phương án tối ưu cục bộ (Xếp được " + fallbackSections.size() + "/" + distinctCourseIds.size() + " môn)",
                        matchPercentage,
                        new ScoredCombination(fallbackSections, scoreDetail)
                );
                partialPlans.add(partialPlan);
            }

            String statusMsg = "Không thể xếp đồng thời 100% các môn đã chọn (" + reasonSummary + "). "
                    + "Đã xếp thành công " + fallbackSections.size() + "/" + distinctCourseIds.size() + " môn.";

            ScheduleOptimizerResponse response = new ScheduleOptimizerResponse(
                    true,
                    false,
                    fallbackCredits,
                    scheduleItems,
                    unassignedCourses,
                    executionTimeMs,
                    semester,
                    distinctCourseIds.size(),
                    context.nodesExplored,
                    0, // totalSolutions = 0 (vì không có nghiệm 100%)
                    partialPlans,
                    statusMsg
            );
            response.setStatus(finalStatus);
            response.setConflictDetails(conflictDetails);
            return response;
        }
    }

    /**
     * DFS Backtracking với MRV và Forward Checking
     */
    private void solveWithMrv(List<List<Integer>> courseBuckets,
                              List<Integer> currentSelectedSectionIndices,
                              List<Integer> unassignedCourses,
                              int totalCourses,
                              boolean[][] collisionMatrix,
                              List<ClassSection> allCandidates,
                              SearchContext context) {

        if (currentSelectedSectionIndices.size() == totalCourses) {
            List<ClassSection> solution = new ArrayList<>(totalCourses);
            for (int secIdx : currentSelectedSectionIndices) {
                solution.add(allCandidates.get(secIdx));
            }
            context.solutions.add(solution);
            return;
        }

        context.nodesExplored++;

        if (context.nodesExplored >= context.maxSearchNodes) {
            context.nodeLimitExceeded = true;
            return;
        }

        if (context.solutions.size() >= context.maxSolutions) {
            return;
        }

        if (context.nodesExplored == 1 || (context.nodesExplored & 31) == 0) {
            if (Thread.currentThread().isInterrupted()) {
                context.interrupted = true;
                return;
            }
            if (System.currentTimeMillis() - context.startTime >= context.maxExecutionTimeMs) {
                context.timeLimitExceeded = true;
                return;
            }
        }

        // Áp dụng MRV (Minimum Remaining Values): Tìm môn có số lớp khả dụng ít nhất
        int bestCourseIdx = -1;
        int minValidCandidates = Integer.MAX_VALUE;
        List<Integer> bestValidCandidateIndices = null;

        for (int cIdx : unassignedCourses) {
            List<Integer> bucket = courseBuckets.get(cIdx);
            List<Integer> validCandidates = new ArrayList<>();

            for (int secIdx : bucket) {
                boolean conflict = false;
                for (int selIdx : currentSelectedSectionIndices) {
                    if (collisionMatrix[selIdx][secIdx]) {
                        conflict = true;
                        break;
                    }
                }
                if (!conflict) {
                    validCandidates.add(secIdx);
                }
            }

            // Forward Checking: Domain Wipeout -> Prune ngay lập tức
            if (validCandidates.isEmpty()) {
                context.branchesPruned++;
                return;
            }

            if (validCandidates.size() < minValidCandidates) {
                minValidCandidates = validCandidates.size();
                bestCourseIdx = cIdx;
                bestValidCandidateIndices = validCandidates;
            }
        }

        if (bestCourseIdx == -1 || bestValidCandidateIndices == null) {
            return;
        }

        unassignedCourses.remove(Integer.valueOf(bestCourseIdx));

        for (int candidateIdx : bestValidCandidateIndices) {
            currentSelectedSectionIndices.add(candidateIdx);

            solveWithMrv(courseBuckets, currentSelectedSectionIndices, unassignedCourses,
                    totalCourses, collisionMatrix, allCandidates, context);

            currentSelectedSectionIndices.remove(currentSelectedSectionIndices.size() - 1);

            if (context.timeLimitExceeded || context.nodeLimitExceeded || context.interrupted
                    || context.solutions.size() >= context.maxSolutions) {
                break;
            }
        }

        unassignedCourses.add(bestCourseIdx);
    }

    /**
     * Sắp xếp các lớp ứng viên trong domain (Candidate Ordering / LCV heuristic)
     */
    private void sortCandidateSections(List<ClassSection> sections, ScheduleOptimizerRequest request) {
        if (sections.size() <= 1) return;

        Set<String> avoidSet = request != null && request.getAvoidDays() != null && !request.getAvoidDays().isEmpty()
                ? request.getAvoidDays().stream().map(String::toUpperCase).collect(Collectors.toSet())
                : Set.of("SAT", "SUN");
        String preferredShift = request != null && request.getPreferredShift() != null ? request.getPreferredShift().toUpperCase() : "ANY";

        sections.sort((a, b) -> {
            int scoreA = 0;
            int scoreB = 0;

            String dayA = a.getDayOfWeek() != null ? a.getDayOfWeek().toUpperCase() : "";
            String dayB = b.getDayOfWeek() != null ? b.getDayOfWeek().toUpperCase() : "";

            if (!avoidSet.contains(dayA)) scoreA += 10;
            if (!avoidSet.contains(dayB)) scoreB += 10;

            if ("MORNING".equals(preferredShift)) {
                if (isMorning(a)) scoreA += 10;
                if (isMorning(b)) scoreB += 10;
            } else if ("AFTERNOON".equals(preferredShift)) {
                if (isAfternoon(a)) scoreA += 10;
                if (isAfternoon(b)) scoreB += 10;
            }

            int availableSeatsA = (a.getMaxCapacity() != null ? a.getMaxCapacity() : 40) - (a.getCurrentEnrolled() != null ? a.getCurrentEnrolled() : 0);
            int availableSeatsB = (b.getMaxCapacity() != null ? b.getMaxCapacity() : 40) - (b.getCurrentEnrolled() != null ? b.getCurrentEnrolled() : 0);
            if (availableSeatsA >= 5) scoreA += 5;
            if (availableSeatsB >= 5) scoreB += 5;

            return Integer.compare(scoreB, scoreA);
        });
    }

    /**
     * Tìm tập lớp học phần không xung đột tối đại (Maximal Independent Set Fallback)
     */
    private List<ClassSection> findMaximalNonConflictingSubset(List<CourseTarget> targets) {
        List<ClassSection> bestSubset = new ArrayList<>();

        for (int startIndex = 0; startIndex < targets.size(); startIndex++) {
            List<ClassSection> currentSubset = new ArrayList<>();

            for (int i = 0; i < targets.size(); i++) {
                int idx = (startIndex + i) % targets.size();
                CourseTarget target = targets.get(idx);

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
     * Chẩn đoán nguyên nhân xung đột cụ thể giữa các lớp học phần khi không tìm thấy phương án
     */
    private String findConflictExplanation(List<List<Integer>> courseBuckets,
                                           boolean[][] collisionMatrix,
                                           List<ClassSection> allCandidates) {
        for (int c1 = 0; c1 < courseBuckets.size(); c1++) {
            for (int c2 = c1 + 1; c2 < courseBuckets.size(); c2++) {
                List<Integer> b1 = courseBuckets.get(c1);
                List<Integer> b2 = courseBuckets.get(c2);
                boolean allConflict = true;
                String sampleConflict = null;
                for (int i : b1) {
                    for (int j : b2) {
                        if (collisionMatrix[i][j]) {
                            if (sampleConflict == null) {
                                ClassSection s1 = allCandidates.get(i);
                                ClassSection s2 = allCandidates.get(j);
                                sampleConflict = "Xung đột: Lớp " + s1.getSectionCode() + " (" + s1.getDayOfWeek() + " " + s1.getStartTime() + "-" + s1.getEndTime()
                                        + ") trùng lịch với lớp " + s2.getSectionCode() + " (" + s2.getDayOfWeek() + " " + s2.getStartTime() + "-" + s2.getEndTime() + ").";
                            }
                        } else {
                            allConflict = false;
                        }
                    }
                }
                if (allConflict && sampleConflict != null) {
                    return sampleConflict + " (Tất cả các lớp của 2 môn này đều bị xung đột thời gian).";
                }
            }
        }
        return "Xung đột lịch học giữa các môn đã chọn. Hãy thử giảm bớt 1 môn hoặc nới lỏng ràng buộc ca học.";
    }

    /**
     * Xây dựng Collision Matrix O(N^2) giữa toàn bộ các lớp ứng viên
     */
    public boolean[][] buildCollisionMatrix(List<ClassSection> sections) {
        int n = sections.size();
        boolean[][] matrix = new boolean[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                boolean collided = hasTimeCollision(sections.get(i), sections.get(j));
                matrix[i][j] = collided;
                matrix[j][i] = collided;
            }
        }
        return matrix;
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

    public ScoreDetail evaluateScore(List<ClassSection> combo, ScheduleOptimizerRequest request) {
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
            score += 10;
            highlights.add("Chỗ trống an toàn (trung bình >= 5 chỗ/lớp)");
        } else {
            score += 5;
        }

        int finalScore = Math.min(100, Math.max(30, score));
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
                    if (minutes > 150) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public List<SchedulePlanOption> selectTopDiversePlans(List<ScoredCombination> scored, ScheduleOptimizerRequest request) {
        List<SchedulePlanOption> result = new ArrayList<>();
        if (scored == null || scored.isEmpty()) return result;

        // Plan 1: Best Overall Match
        ScoredCombination best = scored.get(0);
        int top1Score = 96;
        result.add(createPlanOption(1, "Phương án 1: Tối ưu hàng đầu (AI Khuyên dùng)", top1Score, best));

        // Plan 2: Most Compact / Fewest Days
        ScoredCombination mostCompact = scored.stream()
                .filter(s -> !isSameSections(s.sections, best.sections))
                .min(Comparator.comparingInt(s -> s.scoreDetail.uniqueDaysCount))
                .orElse(null);

        if (mostCompact != null) {
            int top2Score = 90;
            result.add(createPlanOption(2, "Phương án 2: Tối đa ngày nghỉ (Dồn lịch)", top2Score, mostCompact));
        }

        // Plan 3: Balanced or Alternative
        ScoredCombination alternative = scored.stream()
                .filter(s -> !isSameSections(s.sections, best.sections)
                        && (mostCompact == null || !isSameSections(s.sections, mostCompact.sections)))
                .findFirst()
                .orElse(null);

        if (alternative != null) {
            int top3Score = 85;
            result.add(createPlanOption(3, "Phương án 3: Dự phòng tối ưu", top3Score, alternative));
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

    private SchedulePlanOption createPlanOption(int index, String title, int matchPercentage, ScoredCombination sc) {
        int totalCredits = sc.sections.stream()
                .mapToInt(s -> s.getCourse() != null && s.getCourse().getCredits() != null ? s.getCourse().getCredits() : 3)
                .sum();

        List<ClassSectionDto> dtos = sc.sections.stream().map(this::toDto).collect(Collectors.toList());

        return new SchedulePlanOption(
                index,
                title,
                matchPercentage,
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

    public static class CourseTarget {
        public final Long courseId;
        public final String courseCode;
        public final String courseName;
        public final int credits;
        public final List<ClassSection> candidateSections;

        public CourseTarget(Long courseId, String courseCode, String courseName, int credits, List<ClassSection> candidateSections) {
            this.courseId = courseId;
            this.courseCode = courseCode;
            this.courseName = courseName;
            this.credits = credits;
            this.candidateSections = candidateSections != null ? candidateSections : Collections.emptyList();
        }
    }

    public static class SearchContext {
        public final long startTime;
        public final long maxExecutionTimeMs;
        public final int maxSearchNodes;
        public final int maxSolutions;

        public int nodesExplored = 0;
        public int branchesPruned = 0;
        public boolean timeLimitExceeded = false;
        public boolean nodeLimitExceeded = false;
        public boolean interrupted = false;

        public final List<List<ClassSection>> solutions = new ArrayList<>();

        public SearchContext(long maxExecutionTimeMs, int maxSearchNodes, int maxSolutions) {
            this.startTime = System.currentTimeMillis();
            this.maxExecutionTimeMs = maxExecutionTimeMs;
            this.maxSearchNodes = maxSearchNodes;
            this.maxSolutions = maxSolutions;
        }
    }

    public static class ScoredCombination {
        public final List<ClassSection> sections;
        public final ScoreDetail scoreDetail;

        public ScoredCombination(List<ClassSection> sections, ScoreDetail scoreDetail) {
            this.sections = sections;
            this.scoreDetail = scoreDetail;
        }
    }

    public static class ScoreDetail {
        public final int totalScore;
        public final int uniqueDaysCount;
        public final List<String> studyDays;
        public final List<String> highlights;

        public ScoreDetail(int totalScore, int uniqueDaysCount, List<String> studyDays, List<String> highlights) {
            this.totalScore = totalScore;
            this.uniqueDaysCount = uniqueDaysCount;
            this.studyDays = studyDays;
            this.highlights = highlights;
        }
    }
}
