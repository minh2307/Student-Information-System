package com.rikkei.eduportal.enrollment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

/**
 * DTO kết quả tối ưu hóa thời khóa biểu tự động (AI CSP Solver).
 * Hỗ trợ đồng thời:
 * 1. Các trường chuẩn AI CSP Solver: { success, isComplete, totalCredits, schedule, unassignedCourses, executionTimeMs }
 * 2. Các trường tương thích ngược với Frontend, Team-Lead API contract & Unit Tests:
 *    { status, statusMessage, semesterName, requestedCoursesCount, totalSolutions, nodesExplored, plans, conflictDetails }
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ScheduleOptimizerResponse {

    // Các trường bắt buộc theo chuẩn CSP Solver
    private boolean success = true;
    private boolean isComplete = true; // true nếu xếp đủ 100% môn, false nếu là lịch cục bộ
    private int totalCredits = 0;
    private List<ScheduleItemDto> schedule = new ArrayList<>();
    private List<UnassignedCourseDto> unassignedCourses = new ArrayList<>();

    // Các trường phân loại trạng thái tối ưu
    private OptimizationStatus status = OptimizationStatus.SUCCESS;
    private String statusMessage;

    // Các trường tương thích ngược với Frontend và Unit Test hiện hữu
    private String semesterName;
    private int requestedCoursesCount;
    private int totalSolutions;
    private int validOptionsCount;
    private int nodesExplored;
    private int totalCombinationsChecked;
    private long executionTimeMs;
    private String conflictDetails;
    private List<SchedulePlanOption> plans = new ArrayList<>();

    public ScheduleOptimizerResponse() {}

    /**
     * Backward-compatible constructor
     */
    public ScheduleOptimizerResponse(String semesterName, int requestedCoursesCount,
                                     int totalCombinationsChecked, int validOptionsCount,
                                     List<SchedulePlanOption> plans, String statusMessage) {
        this.semesterName = semesterName;
        this.requestedCoursesCount = requestedCoursesCount;
        this.totalCombinationsChecked = totalCombinationsChecked;
        this.nodesExplored = totalCombinationsChecked;
        this.validOptionsCount = validOptionsCount;
        this.totalSolutions = validOptionsCount;
        this.plans = plans != null ? plans : new ArrayList<>();
        this.statusMessage = statusMessage;
        this.success = true;
        this.isComplete = validOptionsCount > 0;
        if (validOptionsCount > 0) {
            this.status = OptimizationStatus.SUCCESS;
        } else if (statusMessage != null && (statusMessage.contains("vượt quá") || statusMessage.contains("ít nhất"))) {
            this.status = OptimizationStatus.INVALID_REQUEST;
        } else {
            this.status = OptimizationStatus.NO_SOLUTION;
        }
    }

    /**
     * Full constructor with explicit status and execution timing
     */
    public ScheduleOptimizerResponse(OptimizationStatus status, String statusMessage,
                                     String semesterName, int requestedCoursesCount,
                                     int totalSolutions, int nodesExplored,
                                     long executionTimeMs, String conflictDetails,
                                     List<SchedulePlanOption> plans) {
        this.status = status != null ? status : OptimizationStatus.SUCCESS;
        this.statusMessage = statusMessage;
        this.semesterName = semesterName;
        this.requestedCoursesCount = requestedCoursesCount;
        this.totalSolutions = totalSolutions;
        this.validOptionsCount = totalSolutions;
        this.nodesExplored = nodesExplored;
        this.totalCombinationsChecked = nodesExplored;
        this.executionTimeMs = executionTimeMs;
        this.conflictDetails = conflictDetails;
        this.plans = plans != null ? plans : new ArrayList<>();
        this.success = (status == OptimizationStatus.SUCCESS);
        this.isComplete = (totalSolutions > 0);
    }

    public ScheduleOptimizerResponse(boolean success, boolean isComplete, int totalCredits,
                                     List<ScheduleItemDto> schedule,
                                     List<UnassignedCourseDto> unassignedCourses,
                                     long executionTimeMs, String semesterName,
                                     int requestedCoursesCount, int totalCombinationsChecked,
                                     int validOptionsCount, List<SchedulePlanOption> plans,
                                     String statusMessage) {
        this.success = success;
        this.isComplete = isComplete;
        this.totalCredits = totalCredits;
        this.schedule = schedule != null ? schedule : new ArrayList<>();
        this.unassignedCourses = unassignedCourses != null ? unassignedCourses : new ArrayList<>();
        this.executionTimeMs = executionTimeMs;
        this.semesterName = semesterName;
        this.requestedCoursesCount = requestedCoursesCount;
        this.totalCombinationsChecked = totalCombinationsChecked;
        this.nodesExplored = totalCombinationsChecked;
        this.validOptionsCount = validOptionsCount;
        this.totalSolutions = validOptionsCount;
        this.plans = plans != null ? plans : new ArrayList<>();
        this.statusMessage = statusMessage;
        if (validOptionsCount > 0) {
            this.status = OptimizationStatus.SUCCESS;
        } else if (statusMessage != null && (statusMessage.contains("vượt quá") || statusMessage.contains("ít nhất"))) {
            this.status = OptimizationStatus.INVALID_REQUEST;
        } else {
            this.status = OptimizationStatus.NO_SOLUTION;
        }
    }

    // Getters and Setters
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public boolean getIsComplete() { return isComplete; }
    public void setIsComplete(boolean isComplete) { this.isComplete = isComplete; }

    public int getTotalCredits() { return totalCredits; }
    public void setTotalCredits(int totalCredits) { this.totalCredits = totalCredits; }

    public List<ScheduleItemDto> getSchedule() { return schedule; }
    public void setSchedule(List<ScheduleItemDto> schedule) { this.schedule = schedule; }

    public List<UnassignedCourseDto> getUnassignedCourses() { return unassignedCourses; }
    public void setUnassignedCourses(List<UnassignedCourseDto> unassignedCourses) { this.unassignedCourses = unassignedCourses; }

    public OptimizationStatus getStatus() { return status; }
    public void setStatus(OptimizationStatus status) { this.status = status; }

    public String getStatusMessage() { return statusMessage; }
    public void setStatusMessage(String statusMessage) { this.statusMessage = statusMessage; }

    public String getSemesterName() { return semesterName; }
    public void setSemesterName(String semesterName) { this.semesterName = semesterName; }

    public int getRequestedCoursesCount() { return requestedCoursesCount; }
    public void setRequestedCoursesCount(int requestedCoursesCount) { this.requestedCoursesCount = requestedCoursesCount; }

    public int getTotalSolutions() { return totalSolutions; }
    public void setTotalSolutions(int totalSolutions) {
        this.totalSolutions = totalSolutions;
        this.validOptionsCount = totalSolutions;
    }

    public int getValidOptionsCount() { return validOptionsCount; }
    public void setValidOptionsCount(int validOptionsCount) {
        this.validOptionsCount = validOptionsCount;
        this.totalSolutions = validOptionsCount;
    }

    public int getNodesExplored() { return nodesExplored; }
    public void setNodesExplored(int nodesExplored) {
        this.nodesExplored = nodesExplored;
        this.totalCombinationsChecked = nodesExplored;
    }

    public int getTotalCombinationsChecked() { return totalCombinationsChecked; }
    public void setTotalCombinationsChecked(int totalCombinationsChecked) {
        this.totalCombinationsChecked = totalCombinationsChecked;
        this.nodesExplored = totalCombinationsChecked;
    }

    public long getExecutionTimeMs() { return executionTimeMs; }
    public void setExecutionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; }

    public String getConflictDetails() { return conflictDetails; }
    public void setConflictDetails(String conflictDetails) { this.conflictDetails = conflictDetails; }

    public List<SchedulePlanOption> getPlans() { return plans; }
    public void setPlans(List<SchedulePlanOption> plans) { this.plans = plans; }

    /**
     * Standardized alias for plans matching the REST specification
     */
    public List<SchedulePlanOption> getSchedules() { return plans; }
    public void setSchedules(List<SchedulePlanOption> schedules) { this.plans = schedules; }
}
