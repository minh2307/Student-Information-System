package com.rikkei.eduportal.enrollment.dto;

public class ScheduleItemDto {
    private String courseCode;
    private String courseName;
    private String sectionId;
    private String sectionCode;
    private int dayOfWeek; // 2 = Thứ 2, 3 = Thứ 3, ..., 8 = Chủ Nhật
    private String dayOfWeekText; // "Thứ 2", "MON"
    private int startPeriod;
    private int endPeriod;
    private String startTime;
    private String endTime;
    private String roomName;
    private String lecturerName;
    private int credits;

    public ScheduleItemDto() {}

    public ScheduleItemDto(String courseCode, String courseName, String sectionId, String sectionCode,
                           int dayOfWeek, String dayOfWeekText, int startPeriod, int endPeriod,
                           String startTime, String endTime, String roomName, String lecturerName, int credits) {
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.sectionId = sectionId;
        this.sectionCode = sectionCode;
        this.dayOfWeek = dayOfWeek;
        this.dayOfWeekText = dayOfWeekText;
        this.startPeriod = startPeriod;
        this.endPeriod = endPeriod;
        this.startTime = startTime;
        this.endTime = endTime;
        this.roomName = roomName;
        this.lecturerName = lecturerName;
        this.credits = credits;
    }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public String getSectionId() { return sectionId; }
    public void setSectionId(String sectionId) { this.sectionId = sectionId; }

    public String getSectionCode() { return sectionCode; }
    public void setSectionCode(String sectionCode) { this.sectionCode = sectionCode; }

    public int getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(int dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public String getDayOfWeekText() { return dayOfWeekText; }
    public void setDayOfWeekText(String dayOfWeekText) { this.dayOfWeekText = dayOfWeekText; }

    public int getStartPeriod() { return startPeriod; }
    public void setStartPeriod(int startPeriod) { this.startPeriod = startPeriod; }

    public int getEndPeriod() { return endPeriod; }
    public void setEndPeriod(int endPeriod) { this.endPeriod = endPeriod; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }

    public String getLecturerName() { return lecturerName; }
    public void setLecturerName(String lecturerName) { this.lecturerName = lecturerName; }

    public int getCredits() { return credits; }
    public void setCredits(int credits) { this.credits = credits; }
}
