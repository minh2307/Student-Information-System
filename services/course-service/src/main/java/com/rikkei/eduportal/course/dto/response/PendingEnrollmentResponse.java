package com.rikkei.eduportal.course.dto.response;

import com.rikkei.eduportal.common.EnrollmentStatus;
import java.time.LocalDateTime;

public class PendingEnrollmentResponse {

    private Long enrollmentId;
    private Long studentId;
    private String studentCode;
    private String studentName;
    private String studentMajor;
    private Long classSectionId;
    private String sectionCode;
    private String courseCode;
    private String courseName;
    private Integer credits;
    private String semesterName;
    private String dayOfWeek;
    private String timeDisplay;
    private String roomName;
    private String lecturerName;
    private Integer currentEnrolled;
    private Integer maxCapacity;
    private EnrollmentStatus status;
    private LocalDateTime registeredAt;

    public PendingEnrollmentResponse() {}

    public Long getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(Long enrollmentId) { this.enrollmentId = enrollmentId; }

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public String getStudentCode() { return studentCode; }
    public void setStudentCode(String studentCode) { this.studentCode = studentCode; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getStudentMajor() { return studentMajor; }
    public void setStudentMajor(String studentMajor) { this.studentMajor = studentMajor; }

    public Long getClassSectionId() { return classSectionId; }
    public void setClassSectionId(Long classSectionId) { this.classSectionId = classSectionId; }

    public String getSectionCode() { return sectionCode; }
    public void setSectionCode(String sectionCode) { this.sectionCode = sectionCode; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public Integer getCredits() { return credits; }
    public void setCredits(Integer credits) { this.credits = credits; }

    public String getSemesterName() { return semesterName; }
    public void setSemesterName(String semesterName) { this.semesterName = semesterName; }

    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public String getTimeDisplay() { return timeDisplay; }
    public void setTimeDisplay(String timeDisplay) { this.timeDisplay = timeDisplay; }

    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }

    public String getLecturerName() { return lecturerName; }
    public void setLecturerName(String lecturerName) { this.lecturerName = lecturerName; }

    public Integer getCurrentEnrolled() { return currentEnrolled; }
    public void setCurrentEnrolled(Integer currentEnrolled) { this.currentEnrolled = currentEnrolled; }

    public Integer getMaxCapacity() { return maxCapacity; }
    public void setMaxCapacity(Integer maxCapacity) { this.maxCapacity = maxCapacity; }

    public EnrollmentStatus getStatus() { return status; }
    public void setStatus(EnrollmentStatus status) { this.status = status; }

    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }
}
