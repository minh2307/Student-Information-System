package com.rikkei.eduportal.enrollment.dto;

import java.util.ArrayList;
import java.util.List;

public class ScheduleOptimizerRequest {
    private List<Long> courseIds = new ArrayList<>();
    private String semesterName;
    private List<String> avoidDays = new ArrayList<>(); // e.g. ["SAT", "SUN", "FRI"]
    private String preferredShift = "ANY"; // "MORNING", "AFTERNOON", "ANY"
    private String optimizationGoal = "COMPACT"; // "COMPACT", "BALANCED", "MAX_FREE_DAYS"
    private Boolean onlyAvailableSeats = true;

    public ScheduleOptimizerRequest() {}

    public ScheduleOptimizerRequest(List<Long> courseIds, String semesterName, List<String> avoidDays,
                                   String preferredShift, String optimizationGoal, Boolean onlyAvailableSeats) {
        this.courseIds = courseIds != null ? courseIds : new ArrayList<>();
        this.semesterName = semesterName;
        this.avoidDays = avoidDays != null ? avoidDays : new ArrayList<>();
        this.preferredShift = preferredShift != null ? preferredShift : "ANY";
        this.optimizationGoal = optimizationGoal != null ? optimizationGoal : "COMPACT";
        this.onlyAvailableSeats = onlyAvailableSeats != null ? onlyAvailableSeats : true;
    }

    public List<Long> getCourseIds() { return courseIds; }
    public void setCourseIds(List<Long> courseIds) { this.courseIds = courseIds; }

    public String getSemesterName() { return semesterName; }
    public void setSemesterName(String semesterName) { this.semesterName = semesterName; }

    public List<String> getAvoidDays() { return avoidDays; }
    public void setAvoidDays(List<String> avoidDays) { this.avoidDays = avoidDays; }

    public String getPreferredShift() { return preferredShift; }
    public void setPreferredShift(String preferredShift) { this.preferredShift = preferredShift; }

    public String getOptimizationGoal() { return optimizationGoal; }
    public void setOptimizationGoal(String optimizationGoal) { this.optimizationGoal = optimizationGoal; }

    public Boolean getOnlyAvailableSeats() { return onlyAvailableSeats; }
    public void setOnlyAvailableSeats(Boolean onlyAvailableSeats) { this.onlyAvailableSeats = onlyAvailableSeats; }
}
