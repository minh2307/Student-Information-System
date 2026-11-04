package com.rikkei.eduportal.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class TimetableItemDto {
    private String courseCode;
    private String courseName;
    private String sectionCode;
    private String dayOfWeek;
    private String startTime;
    private String endTime;
    private String roomName;
    private String lecturerName;
    private Boolean hasConflict;

    public TimetableItemDto() {}

    public TimetableItemDto(String courseCode, String courseName, String sectionCode,
                            String dayOfWeek, String startTime, String endTime,
                            String roomName, String lecturerName, Boolean hasConflict) {
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.sectionCode = sectionCode;
        this.dayOfWeek = dayOfWeek;
        this.startTime = startTime;
        this.endTime = endTime;
        this.roomName = roomName;
        this.lecturerName = lecturerName;
        this.hasConflict = hasConflict;
    }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public String getSectionCode() { return sectionCode; }
    public void setSectionCode(String sectionCode) { this.sectionCode = sectionCode; }

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

    public Boolean getHasConflict() { return hasConflict; }
    public void setHasConflict(Boolean hasConflict) { this.hasConflict = hasConflict; }
}
