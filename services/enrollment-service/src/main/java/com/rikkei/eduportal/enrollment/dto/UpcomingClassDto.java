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
}
