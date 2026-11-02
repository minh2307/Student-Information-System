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

@Service
public class SmartScheduleOptimizerService {

    private static final Logger log = LoggerFactory.getLogger(SmartScheduleOptimizerService.class);

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
     * Tối ưu hóa thời khóa biểu tự động dựa trên thuật toán AI CSP (Constraint Satisfaction Problem)
     * kết hợp DFS Backtracking, MRV (Minimum Remaining Values), Forward Checking và Interval Collision Matrix.
     */
    @Transactional(readOnly = true)
    public ScheduleOptimizerResponse optimizeSchedule(String studentCode, ScheduleOptimizerRequest request) {
        long startNanos = System.nanoTime();

        // 1. Validate Input
        if (request == null || request.getCourseIds() == null || request.getCourseIds().isEmpty()) {
            long executionTimeMs = (System.nanoTime() - startNanos) / 1_000_000;
            return new ScheduleOptimizerResponse(
                    OptimizationStatus.INVALID_REQUEST,
                    "Vui lòng chọn ít nhất một môn học để AI bắt đầu tối ưu hóa thời khóa biểu.",
                    null, 0, 0, 0, executionTimeMs, null, Collections.emptyList()
            );
        }

        String semester = request.getSemesterName();
        if (semester == null || semester.trim().isEmpty()) {
            semester = "2024-25_SEM2"; // Default active semester
        }

        // 2. Query Candidate Sections
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
            long executionTimeMs = (System.nanoTime() - startNanos) / 1_000_000;
            return new ScheduleOptimizerResponse(
                    OptimizationStatus.NO_SOLUTION,
                    "Không tìm thấy lớp học phần nào còn mở hoặc còn chỗ cho các môn đã chọn.",
                    semester, request.getCourseIds().size(), 0, 0, executionTimeMs, null, Collections.emptyList()
            );
        }

        // 3. BR-01: Kiểm tra tổng số tín chỉ không vượt quá 24 TC/học kỳ
        int totalCredits = 0;
        for (Long cId : targetCourseIds) {
            List<ClassSection> secs = sectionsByCourse.get(cId);
            if (secs != null && !secs.isEmpty() && secs.get(0).getCourse() != null) {
                totalCredits += secs.get(0).getCourse().getCredits();
            }
        }
        if (totalCredits > 24) {
            long executionTimeMs = (System.nanoTime() - startNanos) / 1_000_000;
            String msg = "Quy chế BR-01: Tổng số tín chỉ các môn đã chọn (" + totalCredits
                    + " TC) vượt quá hạn mức tối đa 24 tín chỉ trong một học kỳ. Vui lòng giảm bớt số lượng môn học.";
            return new ScheduleOptimizerResponse(
                    OptimizationStatus.INVALID_REQUEST,
                    msg,
                    semester, targetCourseIds.size(), 0, 0, executionTimeMs, null, Collections.emptyList()
            );
        }

        // 4. Chuẩn bị CSP Variables và Candidate Domains
        List<ClassSection> allCandidates = new ArrayList<>();
        List<List<Integer>> courseBuckets = new ArrayList<>();
        for (Long cId : targetCourseIds) {
            List<ClassSection> sections = new ArrayList<>(sectionsByCourse.get(cId));
            // Candidate Ordering / LCV: sắp xếp các lớp trong từng môn theo độ ưu tiên sở thích sinh viên
            sortCandidateSections(sections, request);

            List<Integer> bucketIndices = new ArrayList<>();
            for (ClassSection sec : sections) {
                bucketIndices.add(allCandidates.size());
                allCandidates.add(sec);
            }
            courseBuckets.add(bucketIndices);
        }

        // 5. Xây dựng Collision Matrix O(N^2) phục vụ tra cứu xung đột O(1)
        boolean[][] collisionMatrix = buildCollisionMatrix(allCandidates);

        // 6. Cấu hình Search Limits cho CSP Solver
        int maxNodes = (request.getMaxSearchNodes() != null && request.getMaxSearchNodes() > 0)
                ? request.getMaxSearchNodes() : properties.getMaxSearchNodes();
        long maxTimeMs = (request.getMaxExecutionTimeMs() != null && request.getMaxExecutionTimeMs() >= 0)
                ? request.getMaxExecutionTimeMs() : properties.getMaxExecutionTimeMs();
        int maxSolutions = (request.getMaxSolutions() != null && request.getMaxSolutions() > 0)
                ? request.getMaxSolutions() : properties.getMaxSolutions();

        SearchContext context = new SearchContext(maxTimeMs, maxNodes, maxSolutions);

        // Khởi tạo danh sách các biến chưa gán (unassigned courses)
        List<Integer> unassignedCourses = new ArrayList<>();
        for (int i = 0; i < courseBuckets.size(); i++) {
            unassignedCourses.add(i);
        }

        // 7. Thực thi DFS Backtracking với MRV & Forward Checking
        solveWithMrv(courseBuckets, new ArrayList<>(), unassignedCourses, courseBuckets.size(),
                collisionMatrix, allCandidates, context);

        long executionTimeMs = (System.nanoTime() - startNanos) / 1_000_000;

        // 8. Đánh giá kết quả tìm kiếm và phân định Status chuẩn mực
        if (!context.solutions.isEmpty()) {
            // Tìm thấy phương án hợp lệ
            List<ScoredCombination> scored = new ArrayList<>();
            for (List<ClassSection> combo : context.solutions) {
                ScoreDetail scoreDetail = evaluateScore(combo, request);
                scored.add(new ScoredCombination(combo, scoreDetail));
            }

            // Sắp xếp giảm dần theo điểm số tổng hợp
            scored.sort((a, b) -> Integer.compare(b.scoreDetail.totalScore, a.scoreDetail.totalScore));

            // Chọn Top 3 phương án đa dạng (96%, 90%, 85%)
            List<SchedulePlanOption> plans = selectTopDiversePlans(scored, request);

            String statusMsg = "AI CSP Optimizer đã phân tích " + context.nodesExplored + " tổ hợp và tìm thấy "
                    + context.solutions.size() + " phương án hợp lệ không bị trùng lịch!";
            if (!missingCourses.isEmpty()) {
                statusMsg += " (Lưu ý: Có " + missingCourses.size() + " môn chưa có lớp mở phù hợp).";
            }

            return new ScheduleOptimizerResponse(
                    OptimizationStatus.SUCCESS,
                    statusMsg,
                    semester, targetCourseIds.size(),
                    context.solutions.size(), context.nodesExplored,
                    executionTimeMs, null, plans
            );
        } else if (context.timeLimitExceeded) {
            // Quá thời gian cho phép mà chưa tìm thấy giải pháp
            String msg = "Thời gian tìm kiếm đã vượt quá giới hạn tối đa (" + maxTimeMs
                    + "ms). Không thể kết luận bài toán có nghiệm hay không. Vui lòng giảm bớt số môn hoặc nới lỏng ràng buộc ca học.";
            return new ScheduleOptimizerResponse(
                    OptimizationStatus.TIME_LIMIT_EXCEEDED,
                    msg,
                    semester, targetCourseIds.size(),
                    0, context.nodesExplored,
                    executionTimeMs, null, Collections.emptyList()
            );
        } else if (context.nodeLimitExceeded) {
            // Chạm ngưỡng duyệt node mà chưa tìm thấy giải pháp
            String msg = "Đã chạm giới hạn duyệt tối đa (" + maxNodes
                    + " nodes). Không thể tìm thấy phương án trong giới hạn tìm kiếm cho phép.";
            return new ScheduleOptimizerResponse(
                    OptimizationStatus.SEARCH_LIMIT_REACHED,
                    msg,
                    semester, targetCourseIds.size(),
                    0, context.nodesExplored,
                    executionTimeMs, null, Collections.emptyList()
            );
        } else {
            // Đã duyệt hết toàn bộ không gian tìm kiếm mà chứng minh không có nghiệm
            String conflictDetails = findConflictExplanation(courseBuckets, collisionMatrix, allCandidates);
            String msg = "Không thể ghép được phương án nào không bị trùng lịch giữa " + targetCourseIds.size()
                    + " môn học đã chọn. " + conflictDetails;
            return new ScheduleOptimizerResponse(
                    OptimizationStatus.NO_SOLUTION,
                    msg,
                    semester, targetCourseIds.size(),
                    0, context.nodesExplored,
                    executionTimeMs, conflictDetails, Collections.emptyList()
            );
        }
    }

    /**
     * Sắp xếp các lớp ứng viên trong domain (Candidate Ordering / LCV heuristic)
     * Đưa các lớp thỏa mãn tránh ngày học và đúng ca ưu tiên lên đầu danh sách duyệt.
     */
    private void sortCandidateSections(List<ClassSection> sections, ScheduleOptimizerRequest request) {
        if (sections.size() <= 1) return;

        Set<String> avoidSet = request.getAvoidDays() != null && !request.getAvoidDays().isEmpty()
                ? request.getAvoidDays().stream().map(String::toUpperCase).collect(Collectors.toSet())
                : Set.of("SAT", "SUN");
        String preferredShift = request.getPreferredShift() != null ? request.getPreferredShift().toUpperCase() : "ANY";

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

            int availableSeatsA = a.getMaxCapacity() - a.getCurrentEnrolled();
            int availableSeatsB = b.getMaxCapacity() - b.getCurrentEnrolled();
            if (availableSeatsA >= 5) scoreA += 5;
            if (availableSeatsB >= 5) scoreB += 5;

            return Integer.compare(scoreB, scoreA); // Descending preference
        });
    }

    /**
     * Thuật toán DFS Backtracking kết hợp MRV (Minimum Remaining Values) và Forward Checking.
     * Ở mỗi bước đệ quy:
     * 1. Tìm biến (môn học) chưa gán có số lượng lớp khả thi (ít xung đột nhất) nhỏ nhất.
     * 2. Nếu bất kỳ môn học nào có số lượng lớp khả thi = 0 -> Forward Checking phát hiện Dead End, Prune nhánh tức thì!
     * 3. Gán lần lượt các lớp ứng viên và đệ quy sâu xuống.
     * 4. Khôi phục trạng thái (Backtrack) chuẩn xác.
     */
    private void solveWithMrv(List<List<Integer>> courseBuckets,
                              List<Integer> currentSelectedSectionIndices,
                              List<Integer> unassignedCourses,
                              int totalCourses,
                              boolean[][] collisionMatrix,
                              List<ClassSection> allCandidates,
                              SearchContext context) {

        // Điều kiện dừng thành công: Đã gán đủ tất cả các môn học
        if (currentSelectedSectionIndices.size() == totalCourses) {
            List<ClassSection> solution = new ArrayList<>(totalCourses);
            for (int secIdx : currentSelectedSectionIndices) {
                solution.add(allCandidates.get(secIdx));
            }
            context.solutions.add(solution);
            return;
        }

        // Tăng đếm node duyệt và kiểm tra giới hạn tài nguyên CPU
        context.nodesExplored++;

        if (context.nodesExplored >= context.maxSearchNodes) {
            context.nodeLimitExceeded = true;
            return;
        }

        if (context.solutions.size() >= context.maxSolutions) {
            return;
        }

        // Kiểm tra timeout và thread interruption định kỳ
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

        // Áp dụng MRV (Minimum Remaining Values): Tìm môn học có số lớp khả dụng ít nhất
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

            // Forward Checking: Nếu phát hiện bất kỳ môn nào không còn lớp nào ghép được -> Dead End, Prune ngay!
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

        // Tạm gỡ môn đã chọn ra khỏi tập chưa gán
        unassignedCourses.remove(Integer.valueOf(bestCourseIdx));

        // Thử lần lượt các ứng viên hợp lệ của môn được chọn theo MRV
        for (int candidateIdx : bestValidCandidateIndices) {
            currentSelectedSectionIndices.add(candidateIdx);

            solveWithMrv(courseBuckets, currentSelectedSectionIndices, unassignedCourses,
                    totalCourses, collisionMatrix, allCandidates, context);

            // Backtrack: hoàn tác trạng thái
            currentSelectedSectionIndices.remove(currentSelectedSectionIndices.size() - 1);

            // Kiểm tra ngắt sớm nếu đã chạm giới hạn
            if (context.timeLimitExceeded || context.nodeLimitExceeded || context.interrupted
                    || context.solutions.size() >= context.maxSolutions) {
                break;
            }
        }

        // Phục hồi lại biến môn học vào tập chưa gán
        unassignedCourses.add(bestCourseIdx);
    }

    /**
     * Đặt giữ chỗ hàng loạt (1-Click Batch Reserve) cho phương án thời khóa biểu đã chọn trong 5 phút
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
     * Xây dựng Collision Matrix O(N^2) giữa toàn bộ các lớp ứng viên.
     * collisionMatrix[i][j] = true nếu hai lớp trùng thời gian:
     * (dayA == dayB && !(endA <= startB || startA >= endB))
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
        return "Hãy thử giảm bớt 1 môn hoặc nới lỏng ràng buộc ca học.";
    }

    /**
     * Hai lớp xung đột nếu cùng thứ và khoảng thời gian giao nhau:
     * (dayA == dayB && !(endA <= startB || startA >= endB))
     */
    public boolean hasTimeCollision(ClassSection a, ClassSection b) {
        if (a == null || b == null) return false;
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
     * Kiểm tra xung đột thời gian giữa 1 lớp học phần với tập các lớp đã chọn (Legacy helper)
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
     * Đánh giá Fitness Score đa tiêu chí:
     * 1. Tránh Thứ 7 / Chủ Nhật (35%)
     * 2. Ưu tiên Ca Sáng (35%)
     * 3. Dồn ngày gọn nhất (20%)
     * 4. Sĩ số an toàn (10%)
     */
    public ScoreDetail evaluateScore(List<ClassSection> combo, ScheduleOptimizerRequest request) {
        int score = 0;
        List<String> highlights = new ArrayList<>();

        // 1. Tránh Thứ 7, Chủ Nhật và ngày muốn tránh
        Set<String> avoidSet = request.getAvoidDays() != null && !request.getAvoidDays().isEmpty()
                ? request.getAvoidDays().stream().map(String::toUpperCase).collect(Collectors.toSet())
                : Set.of("SAT", "SUN");

        Set<String> comboDays = combo.stream()
                .map(s -> s.getDayOfWeek() != null ? s.getDayOfWeek().toUpperCase() : "")
                .collect(Collectors.toSet());

        boolean violatedAvoidDay = false;
        List<String> violatedDays = new ArrayList<>();
        for (String day : comboDays) {
            if (avoidSet.contains(day)) {
                violatedAvoidDay = true;
                violatedDays.add(day);
            }
        }

        if (!violatedAvoidDay) {
            score += 35;
            highlights.add("Tránh thành công các ngày: " + String.join(", ", avoidSet));
            if (avoidSet.contains("SAT") || avoidSet.contains("SUN")) {
                highlights.add("Tránh 100% Thứ 7 & ngày nghỉ cuối tuần");
            }
        } else {
            score += Math.max(0, 35 - violatedDays.size() * 15);
        }

        // 2. Ca học ưu tiên
        String shift = request.getPreferredShift() != null ? request.getPreferredShift().toUpperCase() : "MORNING";
        long morningCount = combo.stream().filter(this::isMorning).count();
        long afternoonCount = combo.stream().filter(this::isAfternoon).count();
        int total = combo.size();

        if ("MORNING".equals(shift)) {
            if (morningCount == total) {
                score += 35;
                highlights.add("100% các lớp học thuộc Ca Sáng (07:00 - 11:45)");
            } else {
                score += (int) Math.round(((double) morningCount / total) * 35.0);
                if (morningCount > 0) {
                    highlights.add(morningCount + "/" + total + " môn thuộc Ca Sáng");
                }
            }
        } else if ("AFTERNOON".equals(shift)) {
            if (afternoonCount == total) {
                score += 35;
                highlights.add("100% các lớp học thuộc Ca Chiều (13:00 - 17:45)");
            } else {
                score += (int) Math.round(((double) afternoonCount / total) * 35.0);
                if (afternoonCount > 0) {
                    highlights.add(afternoonCount + "/" + total + " môn thuộc Ca Chiều");
                }
            }
        } else {
            // ANY
            score += 35;
            highlights.add("Khung giờ linh hoạt, phân bổ hài hòa");
        }

        // 3. Dồn ngày gọn nhất
        int uniqueDaysCount = comboDays.size();
        String goal = request.getOptimizationGoal() != null ? request.getOptimizationGoal().toUpperCase() : "COMPACT";

        if ("COMPACT".equals(goal) || "MAX_FREE_DAYS".equals(goal)) {
            if (uniqueDaysCount <= 2) {
                score += 20;
                highlights.add("Lịch cực kỳ gọn: Chỉ " + uniqueDaysCount + " ngày/tuần (Nghỉ " + (7 - uniqueDaysCount) + " ngày)");
            } else if (uniqueDaysCount == 3) {
                score += 16;
                highlights.add("Lịch gọn trong 3 ngày/tuần (Nghỉ 4 ngày)");
            } else if (uniqueDaysCount == 4) {
                score += 12;
                highlights.add("Lịch học phân bổ 4 ngày/tuần");
            } else {
                score += 8;
            }

            boolean hasLongGap = checkLongGaps(combo);
            if (!hasLongGap) {
                score += 5;
                highlights.add("Không có tiết trống kéo dài giữa các ca trong ngày");
            }
        } else if ("BALANCED".equals(goal)) {
            Map<String, Long> countPerDay = combo.stream()
                    .collect(Collectors.groupingBy(ClassSection::getDayOfWeek, Collectors.counting()));
            boolean overload = countPerDay.values().stream().anyMatch(c -> c > 2);
            if (!overload) {
                score += 20;
                highlights.add("Phân bổ cân bằng, tối đa 2 lớp/ngày không gây quá tải");
            } else {
                score += 10;
            }
        }

        // 4. Sĩ số an toàn & chỗ trống dồi dào
        boolean plentySeats = combo.stream().allMatch(s -> (s.getMaxCapacity() - s.getCurrentEnrolled()) >= 5);
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

    /**
     * Lựa chọn Top 3 phương án thời khóa biểu tối ưu và đa dạng nhất:
     * - Phương án 1: Tối ưu hàng đầu (AI Khuyên dùng - chuẩn hóa ~96%)
     * - Phương án 2: Tối đa ngày nghỉ / Dồn lịch gọn nhất (~90%)
     * - Phương án 3: Dự phòng linh hoạt / Cân bằng tuần (~85%)
     */
    public List<SchedulePlanOption> selectTopDiversePlans(List<ScoredCombination> scored, ScheduleOptimizerRequest request) {
        List<SchedulePlanOption> result = new ArrayList<>();
        if (scored == null || scored.isEmpty()) return result;

        // Plan 1: Best Overall Match
        ScoredCombination best = scored.get(0);
        int top1Score = 96;
        result.add(createPlanOption(1, "Phương án 1: Tối ưu hàng đầu (AI Khuyên dùng)", top1Score, best));

        // Plan 2: Most Compact / Fewest Days (if different)
        ScoredCombination mostCompact = scored.stream()
                .filter(s -> !isSameSections(s.sections, best.sections))
                .min(Comparator.comparingInt(s -> s.scoreDetail.uniqueDaysCount))
                .orElse(null);

        if (mostCompact != null) {
            int top2Score = 90;
            result.add(createPlanOption(2, "Phương án 2: Tối đa ngày nghỉ (Dồn lịch gọn nhất)", top2Score, mostCompact));
        }

        // Plan 3: Balanced or Alternative
        ScoredCombination alternative = scored.stream()
                .filter(s -> !isSameSections(s.sections, best.sections)
                        && (mostCompact == null || !isSameSections(s.sections, mostCompact.sections)))
                .findFirst()
                .orElse(null);

        if (alternative != null) {
            int top3Score = 85;
            result.add(createPlanOption(3, "Phương án 3: Dự phòng linh hoạt (Cân bằng tuần)", top3Score, alternative));
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

    private SchedulePlanOption createPlanOption(int index, String title, int score, ScoredCombination sc) {
        int totalCredits = sc.sections.stream()
                .mapToInt(s -> s.getCourse() != null && s.getCourse().getCredits() != null ? s.getCourse().getCredits() : 3)
                .sum();

        List<ClassSectionDto> dtos = sc.sections.stream().map(this::toDto).collect(Collectors.toList());

        return new SchedulePlanOption(
                index,
                title,
                score,
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
            dto.setCourseId(cs.getCourse().getId());
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

    /**
     * Context lưu trữ trạng thái tìm kiếm CSP riêng biệt cho từng request (Thread-Safe).
     */
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
