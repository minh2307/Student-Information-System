package com.rikkei.eduportal.lecturer.dto.request;

import java.util.List;

public class SendLecturerNotificationRequest {
    private Long sectionId;
    private List<Long> studentIds;
    private List<String> studentCodes;
    private List<Long> enrollmentIds;
    private String title;
    private String message;
    private String type; // LECTURER_MESSAGE, EARLY_WARNING, ANNOUNCEMENT

    public SendLecturerNotificationRequest() {}

    public SendLecturerNotificationRequest(Long sectionId, List<Long> studentIds, String title, String message, String type) {
        this.sectionId = sectionId;
        this.studentIds = studentIds;
        this.title = title;
        this.message = message;
        this.type = type;
    }

    public Long getSectionId() { return sectionId; }
    public void setSectionId(Long sectionId) { this.sectionId = sectionId; }

    public List<Long> getStudentIds() { return studentIds; }
    public void setStudentIds(List<Long> studentIds) { this.studentIds = studentIds; }

    public List<String> getStudentCodes() { return studentCodes; }
    public void setStudentCodes(List<String> studentCodes) { this.studentCodes = studentCodes; }

    public List<Long> getEnrollmentIds() { return enrollmentIds; }
    public void setEnrollmentIds(List<Long> enrollmentIds) { this.enrollmentIds = enrollmentIds; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
