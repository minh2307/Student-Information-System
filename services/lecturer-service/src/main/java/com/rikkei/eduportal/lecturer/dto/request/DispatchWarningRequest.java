package com.rikkei.eduportal.lecturer.dto.request;

import java.util.ArrayList;
import java.util.List;

public class DispatchWarningRequest {
    private Long sectionId;
    private List<Long> studentIds = new ArrayList<>();
    private String customMessage;

    public DispatchWarningRequest() {}

    public Long getSectionId() { return sectionId; }
    public void setSectionId(Long sectionId) { this.sectionId = sectionId; }

    public List<Long> getStudentIds() { return studentIds; }
    public void setStudentIds(List<Long> studentIds) { this.studentIds = studentIds; }

    public String getCustomMessage() { return customMessage; }
    public void setCustomMessage(String customMessage) { this.customMessage = customMessage; }
}
