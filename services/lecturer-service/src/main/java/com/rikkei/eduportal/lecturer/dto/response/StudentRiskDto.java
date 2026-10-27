package com.rikkei.eduportal.lecturer.dto.response;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class StudentRiskDto {
    private Long studentId;
    private String studentCode;
    private String fullName;
    private String email;
    private Long classSectionId;
    private String sectionCode;
    private String courseName;
    private int totalSessionsHeld;
    private int attendedSessions;
    private int absentSessions;
    private double absenceRate; // e.g. 0.25 (25%)
    private BigDecimal attendanceScore;
    private BigDecimal midtermScore;
    private BigDecimal finalScore;
    private BigDecimal totalScore;
    private String riskLevel; // "CRITICAL", "WARNING", "SAFE"
    private int riskScore; // 0 - 100
    private List<String> riskReasons = new ArrayList<>();
    private List<String> suggestions = new ArrayList<>();
    private Boolean warningDispatched = false;

    public StudentRiskDto() {}

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public String getStudentCode() { return studentCode; }
    public void setStudentCode(String studentCode) { this.studentCode = studentCode; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Long getClassSectionId() { return classSectionId; }
    public void setClassSectionId(Long classSectionId) { this.classSectionId = classSectionId; }

    public String getSectionCode() { return sectionCode; }
    public void setSectionCode(String sectionCode) { this.sectionCode = sectionCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public int getTotalSessionsHeld() { return totalSessionsHeld; }
    public void setTotalSessionsHeld(int totalSessionsHeld) { this.totalSessionsHeld = totalSessionsHeld; }

    public int getAttendedSessions() { return attendedSessions; }
    public void setAttendedSessions(int attendedSessions) { this.attendedSessions = attendedSessions; }

    public int getAbsentSessions() { return absentSessions; }
    public void setAbsentSessions(int absentSessions) { this.absentSessions = absentSessions; }

    public double getAbsenceRate() { return absenceRate; }
    public void setAbsenceRate(double absenceRate) { this.absenceRate = absenceRate; }

    public BigDecimal getAttendanceScore() { return attendanceScore; }
    public void setAttendanceScore(BigDecimal attendanceScore) { this.attendanceScore = attendanceScore; }

    public BigDecimal getMidtermScore() { return midtermScore; }
    public void setMidtermScore(BigDecimal midtermScore) { this.midtermScore = midtermScore; }

    public BigDecimal getFinalScore() { return finalScore; }
    public void setFinalScore(BigDecimal finalScore) { this.finalScore = finalScore; }

    public BigDecimal getTotalScore() { return totalScore; }
    public void setTotalScore(BigDecimal totalScore) { this.totalScore = totalScore; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public int getRiskScore() { return riskScore; }
    public void setRiskScore(int riskScore) { this.riskScore = riskScore; }

    public List<String> getRiskReasons() { return riskReasons; }
    public void setRiskReasons(List<String> riskReasons) { this.riskReasons = riskReasons; }

    public List<String> getSuggestions() { return suggestions; }
    public void setSuggestions(List<String> suggestions) { this.suggestions = suggestions; }

    public Boolean getWarningDispatched() { return warningDispatched; }
    public void setWarningDispatched(Boolean warningDispatched) { this.warningDispatched = warningDispatched; }
}
