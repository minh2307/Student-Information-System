package com.rikkei.eduportal.enrollment.dto;

public class UpcomingClassDto {
    private Long id;
    private String courseCode;
    private String courseName;
    private String dayOfWeek;
    private String startTime;
    private String endTime;
    private String roomName;
    private String lecturerName;
    private String sectionCode;
    private Integer credits;
    private String semesterName;
    private String status;

    public UpcomingClassDto() {}

    public UpcomingClassDto(Long id, String courseCode, String courseName, String dayOfWeek,
                            String startTime, String endTime, String roomName, String lecturerName) {
        this.id = id;
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.dayOfWeek = dayOfWeek;
        this.startTime = startTime;
        this.endTime = endTime;
        this.roomName = roomName;
        this.lecturerName = lecturerName;
    }

    public UpcomingClassDto(Long id, String courseCode, String courseName, String dayOfWeek,
                            String startTime, String endTime, String roomName, String lecturerName,
                            String sectionCode, Integer credits, String semesterName, String status) {
        this.id = id;
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.dayOfWeek = dayOfWeek;
        this.startTime = startTime;
        this.endTime = endTime;
        this.roomName = roomName;
        this.lecturerName = lecturerName;
        this.sectionCode = sectionCode;
        this.credits = credits;
        this.semesterName = semesterName;
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }

    public String getLecturerName() { return lecturerName; }
    public void setLecturerName(String lecturerName) { this.lecturerName = lecturerName; }

    public String getSectionCode() { return sectionCode; }
    public void setSectionCode(String sectionCode) { this.sectionCode = sectionCode; }

    public Integer getCredits() { return credits; }
    public void setCredits(Integer credits) { this.credits = credits; }

    public String getSemesterName() { return semesterName; }
    public void setSemesterName(String semesterName) { this.semesterName = semesterName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
