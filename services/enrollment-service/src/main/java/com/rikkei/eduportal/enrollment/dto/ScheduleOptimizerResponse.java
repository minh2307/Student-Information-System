package com.rikkei.eduportal.enrollment.dto;

import java.util.ArrayList;
import java.util.List;

public class ScheduleOptimizerResponse {
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
    }

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
