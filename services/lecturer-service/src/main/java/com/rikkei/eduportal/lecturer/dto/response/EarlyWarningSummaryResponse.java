package com.rikkei.eduportal.lecturer.dto.response;

import java.util.ArrayList;
import java.util.List;

public class EarlyWarningSummaryResponse {
    private Long sectionId;
    private String sectionCode;
    private String courseName;
    private int totalStudents;
    private int criticalCount;
    private int warningCount;
    private int safeCount;
    private int attendanceRiskCount;
    private int gradeRiskCount;
    private List<StudentRiskDto> students = new ArrayList<>();
    private String evaluationSummary;

    public EarlyWarningSummaryResponse() {}

    public Long getSectionId() { return sectionId; }
    public void setSectionId(Long sectionId) { this.sectionId = sectionId; }

    public String getSectionCode() { return sectionCode; }
    public void setSectionCode(String sectionCode) { this.sectionCode = sectionCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public int getTotalStudents() { return totalStudents; }
    public void setTotalStudents(int totalStudents) { this.totalStudents = totalStudents; }

    public int getCriticalCount() { return criticalCount; }
    public void setCriticalCount(int criticalCount) { this.criticalCount = criticalCount; }

    public int getWarningCount() { return warningCount; }
    public void setWarningCount(int warningCount) { this.warningCount = warningCount; }

    public int getSafeCount() { return safeCount; }
    public void setSafeCount(int safeCount) { this.safeCount = safeCount; }

    public int getAttendanceRiskCount() { return attendanceRiskCount; }
    public void setAttendanceRiskCount(int attendanceRiskCount) { this.attendanceRiskCount = attendanceRiskCount; }

    public int getGradeRiskCount() { return gradeRiskCount; }
    public void setGradeRiskCount(int gradeRiskCount) { this.gradeRiskCount = gradeRiskCount; }

    public List<StudentRiskDto> getStudents() { return students; }
    public void setStudents(List<StudentRiskDto> students) { this.students = students; }

    public String getEvaluationSummary() { return evaluationSummary; }
    public void setEvaluationSummary(String evaluationSummary) { this.evaluationSummary = evaluationSummary; }
}
