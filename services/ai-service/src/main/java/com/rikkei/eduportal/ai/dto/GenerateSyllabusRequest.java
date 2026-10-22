package com.rikkei.eduportal.ai.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@JsonIgnoreProperties(ignoreUnknown = true)
public class GenerateSyllabusRequest {

    @NotBlank(message = "Tên môn học không được để trống")
    @JsonAlias({"name", "subjectName"})
    private String courseName;

    @NotNull(message = "Số tín chỉ không được để trống")
    @Min(value = 1, message = "Số tín chỉ phải lớn hơn hoặc bằng 1")
    @Max(value = 10, message = "Số tín chỉ tối đa là 10")
    @JsonAlias({"credit", "creditHours"})
    private Integer credits = 3;

    @JsonAlias({"prompt", "description", "notes", "specialRequirements"})
    private String requirements;

    public GenerateSyllabusRequest() {
    }

    public GenerateSyllabusRequest(String courseName, Integer credits, String requirements) {
        this.courseName = courseName;
        this.credits = credits;
        this.requirements = requirements;
    }

    public String getCourseName() {
        return courseName;
    }

    public void setCourseName(String courseName) {
        this.courseName = courseName;
    }

    public Integer getCredits() {
        return credits;
    }

    public void setCredits(Integer credits) {
        this.credits = credits;
    }

    public String getRequirements() {
        return requirements;
    }

    public void setRequirements(String requirements) {
        this.requirements = requirements;
    }
}
