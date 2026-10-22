package com.rikkei.eduportal.enrollment.dto;

import java.util.List;

public class StudentDashboardResponse {
    private DashboardStatsDto stats;
    private List<UpcomingClassDto> upcomingClasses;
    private SemesterProgressDto semesterProgress;

    public StudentDashboardResponse() {}

    public StudentDashboardResponse(DashboardStatsDto stats, List<UpcomingClassDto> upcomingClasses, SemesterProgressDto semesterProgress) {
        this.stats = stats;
        this.upcomingClasses = upcomingClasses;
        this.semesterProgress = semesterProgress;
    }

    public DashboardStatsDto getStats() { return stats; }
    public void setStats(DashboardStatsDto stats) { this.stats = stats; }

    public List<UpcomingClassDto> getUpcomingClasses() { return upcomingClasses; }
    public void setUpcomingClasses(List<UpcomingClassDto> upcomingClasses) { this.upcomingClasses = upcomingClasses; }

    public SemesterProgressDto getSemesterProgress() { return semesterProgress; }
    public void setSemesterProgress(SemesterProgressDto semesterProgress) { this.semesterProgress = semesterProgress; }
}
