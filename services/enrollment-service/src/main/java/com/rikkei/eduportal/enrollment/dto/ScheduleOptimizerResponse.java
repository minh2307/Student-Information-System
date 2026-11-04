package com.rikkei.eduportal.enrollment.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * DTO kết quả tối ưu hóa thời khóa biểu tự động (AI CSP Solver).
 * Đảm bảo đầy đủ các thuộc tính chuẩn:
 * { success, isComplete, totalCredits, schedule, unassignedCourses, executionTimeMs }
 * đồng thời giữ nguyên các trường tương thích ngược cho giao diện Web và Unit Test.
 */
public class ScheduleOptimizerResponse {

    // Các trường bắt buộc theo chuẩn CSP Solver
    private boolean success = true;
    private boolean isComplete = true; // true nếu xếp đủ 100% môn, false nếu là lịch cục bộ
    private int totalCredits = 0;
    private List<ScheduleItemDto> schedule = new ArrayList<>();
    private List<UnassignedCourseDto> unassignedCourses = new ArrayList<>();
    private long executionTimeMs = 0;

    // Các trường tương thích ngược với Frontend và Unit Test hiện hữu
    private String semesterName;
    private int requestedCoursesCount;
    private int totalCombinationsChecked;
    private int validOptionsCount;
    private List<SchedulePlanOption> plans = new ArrayList<>();
    private String statusMessage;

    public ScheduleOptimizerResponse() {}

    public ScheduleOptimizerResponse(String semesterName, int requestedCoursesCount,
                                     int totalCombinationsChecked, int validOptionsCount,
                                     List<SchedulePlanOption> plans, String statusMessage) {
        this.semesterName = semesterName;
        this.requestedCoursesCount = requestedCoursesCount;
        this.totalCombinationsChecked = totalCombinationsChecked;
        this.validOptionsCount = validOptionsCount;
        this.plans = plans != null ? plans : new ArrayList<>();
        this.statusMessage = statusMessage;
        this.success = true;
        this.isComplete = validOptionsCount > 0;
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
        this.validOptionsCount = validOptionsCount;
        this.plans = plans != null ? plans : new ArrayList<>();
        this.statusMessage = statusMessage;
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

    public long getExecutionTimeMs() { return executionTimeMs; }
    public void setExecutionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; }

    public String getSemesterName() { return semesterName; }
    public void setSemesterName(String semesterName) { this.semesterName = semesterName; }

    public int getRequestedCoursesCount() { return requestedCoursesCount; }
    public void setRequestedCoursesCount(int requestedCoursesCount) { this.requestedCoursesCount = requestedCoursesCount; }

    public int getTotalCombinationsChecked() { return totalCombinationsChecked; }
    public void setTotalCombinationsChecked(int totalCombinationsChecked) { this.totalCombinationsChecked = totalCombinationsChecked; }

    public int getValidOptionsCount() { return validOptionsCount; }
    public void setValidOptionsCount(int validOptionsCount) { this.validOptionsCount = validOptionsCount; }

    public List<SchedulePlanOption> getPlans() { return plans; }
    public void setPlans(List<SchedulePlanOption> plans) { this.plans = plans; }

    public String getStatusMessage() { return statusMessage; }
    public void setStatusMessage(String statusMessage) { this.statusMessage = statusMessage; }
}
