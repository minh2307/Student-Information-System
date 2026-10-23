package com.rikkei.eduportal.enrollment.dto;

import jakarta.validation.constraints.NotNull;

public class EnrollmentRequest {

    @NotNull(message = "Mã lớp học phần (classSectionId) không được để trống")
    private Long classSectionId;

    public EnrollmentRequest() {}

    public EnrollmentRequest(Long classSectionId) {
        this.classSectionId = classSectionId;
    }

    public Long getClassSectionId() { return classSectionId; }
    public void setClassSectionId(Long classSectionId) { this.classSectionId = classSectionId; }
}
