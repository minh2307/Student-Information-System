package com.rikkei.eduportal.enrollment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ScheduleOptimizerResponse {
    private OptimizationStatus status = OptimizationStatus.SUCCESS;
    private String statusMessage;
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
    }

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
