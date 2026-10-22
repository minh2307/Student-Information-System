package com.rikkei.eduportal.ai.dto;

public class LearningOutcomeDto {
    private String code;         // e.g. "CLO1", "CLO2"
    private String description;  // e.g. "Hiểu và phân tích cấu trúc dữ liệu tuyến tính..."
    private String bloomLevel;   // e.g. "Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"

    public LearningOutcomeDto() {
    }

    public LearningOutcomeDto(String code, String description, String bloomLevel) {
        this.code = code;
        this.description = description;
        this.bloomLevel = bloomLevel;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getBloomLevel() {
        return bloomLevel;
    }

    public void setBloomLevel(String bloomLevel) {
        this.bloomLevel = bloomLevel;
    }
}
