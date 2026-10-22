package com.rikkei.eduportal.course.dto.response;

import com.rikkei.eduportal.common.SectionStatus;
import java.time.LocalTime;

public class ClassSectionResponse {

    private Long id;
    private String sectionCode;
    private Long courseId;
    private String courseCode;
    private String courseName;
    private Integer credits;
    private Long lecturerId;
    private String lecturerCode;
    private String lecturerName;
    private String lecturerDepartment;
    private String semesterName;
    private String dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private String timeDisplay;
    private String roomName;
    private Integer maxCapacity;
    private Integer currentEnrolled;
    private SectionStatus status;

    public ClassSectionResponse() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSectionCode() { return sectionCode; }
    public void setSectionCode(String sectionCode) { this.sectionCode = sectionCode; }

    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public Integer getCredits() { return credits; }
    public void setCredits(Integer credits) { this.credits = credits; }

    public Long getLecturerId() { return lecturerId; }
    public void setLecturerId(Long lecturerId) { this.lecturerId = lecturerId; }

    public String getLecturerCode() { return lecturerCode; }
    public void setLecturerCode(String lecturerCode) { this.lecturerCode = lecturerCode; }

    public String getLecturerName() { return lecturerName; }
    public void setLecturerName(String lecturerName) { this.lecturerName = lecturerName; }

    public String getLecturerDepartment() { return lecturerDepartment; }
    public void setLecturerDepartment(String lecturerDepartment) { this.lecturerDepartment = lecturerDepartment; }

    public String getSemesterName() { return semesterName; }
    public void setSemesterName(String semesterName) { this.semesterName = semesterName; }

    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public String getTimeDisplay() { return timeDisplay; }
    public void setTimeDisplay(String timeDisplay) { this.timeDisplay = timeDisplay; }

    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }

    public Integer getMaxCapacity() { return maxCapacity; }
    public void setMaxCapacity(Integer maxCapacity) { this.maxCapacity = maxCapacity; }

    public Integer getCurrentEnrolled() { return currentEnrolled; }
    public void setCurrentEnrolled(Integer currentEnrolled) { this.currentEnrolled = currentEnrolled; }

    public SectionStatus getStatus() { return status; }
    public void setStatus(SectionStatus status) { this.status = status; }
}
