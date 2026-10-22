package com.rikkei.eduportal.ai.dto;

public class AssessmentSchemeDto {
    private int attendanceRate; // e.g. 10
    private int midtermRate;    // e.g. 30
    private int finalRate;      // e.g. 60
    private String notes;       // detailed assessment description

    public AssessmentSchemeDto() {
        this.attendanceRate = 10;
        this.midtermRate = 30;
        this.finalRate = 60;
        this.notes = "10% Chuyên cần & thái độ học tập, 30% Đánh giá giữa kỳ (Bài tập lớn/Thực hành/Kiểm tra), 60% Đồ án/Thi kết thúc học phần.";
    }

    public AssessmentSchemeDto(int attendanceRate, int midtermRate, int finalRate, String notes) {
        this.attendanceRate = attendanceRate;
        this.midtermRate = midtermRate;
        this.finalRate = finalRate;
        this.notes = notes;
    }

    public int getAttendanceRate() {
        return attendanceRate;
    }

    public void setAttendanceRate(int attendanceRate) {
        this.attendanceRate = attendanceRate;
    }

    public int getMidtermRate() {
        return midtermRate;
    }

    public void setMidtermRate(int midtermRate) {
        this.midtermRate = midtermRate;
    }

    public int getFinalRate() {
        return finalRate;
    }

    public void setFinalRate(int finalRate) {
        this.finalRate = finalRate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
