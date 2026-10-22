package com.rikkei.eduportal.enrollment.dto;

public class DashboardStatsDto {
    private int registeredCourses;
    private int weeklyClasses;
    private int pendingRegistrations;
    private int scheduleConflicts;

    public DashboardStatsDto() {}

    public DashboardStatsDto(int registeredCourses, int weeklyClasses, int pendingRegistrations, int scheduleConflicts) {
        this.registeredCourses = registeredCourses;
        this.weeklyClasses = weeklyClasses;
        this.pendingRegistrations = pendingRegistrations;
        this.scheduleConflicts = scheduleConflicts;
    }

    public int getRegisteredCourses() { return registeredCourses; }
    public void setRegisteredCourses(int registeredCourses) { this.registeredCourses = registeredCourses; }

    public int getWeeklyClasses() { return weeklyClasses; }
    public void setWeeklyClasses(int weeklyClasses) { this.weeklyClasses = weeklyClasses; }

    public int getPendingRegistrations() { return pendingRegistrations; }
    public void setPendingRegistrations(int pendingRegistrations) { this.pendingRegistrations = pendingRegistrations; }

    public int getScheduleConflicts() { return scheduleConflicts; }
    public void setScheduleConflicts(int scheduleConflicts) { this.scheduleConflicts = scheduleConflicts; }
}
