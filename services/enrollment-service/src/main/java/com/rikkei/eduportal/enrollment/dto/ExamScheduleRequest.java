package com.rikkei.eduportal.enrollment.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public class ExamScheduleRequest {

    private Long classSectionId;
    private LocalDate examDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String roomName;
    private String examType = "TỰ LUẬN";
    private String notes;

    public ExamScheduleRequest() {}

    public Long getClassSectionId() { return classSectionId; }
    public void setClassSectionId(Long classSectionId) { this.classSectionId = classSectionId; }

    public LocalDate getExamDate() { return examDate; }
    public void setExamDate(LocalDate examDate) { this.examDate = examDate; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }

    public String getExamType() { return examType; }
    public void setExamType(String examType) { this.examType = examType; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
