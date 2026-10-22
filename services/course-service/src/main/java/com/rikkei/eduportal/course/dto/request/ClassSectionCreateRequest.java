package com.rikkei.eduportal.course.dto.request;

import com.rikkei.eduportal.common.SectionStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalTime;

public class ClassSectionCreateRequest {

    @NotBlank(message = "Mã lớp học phần không được để trống")
    private String sectionCode;

    @NotNull(message = "Môn học không được để trống")
    private Long courseId;

    @NotNull(message = "Giảng viên không được để trống")
    private Long lecturerId;

    @NotBlank(message = "Tên học kỳ không được để trống")
    private String semesterName;

    @NotBlank(message = "Thứ trong tuần không được để trống")
    @Pattern(regexp = "^(MON|TUE|WED|THU|FRI|SAT|SUN)$", message = "Thứ trong tuần phải là MON, TUE, WED, THU, FRI, SAT, hoặc SUN")
    private String dayOfWeek;

    @NotNull(message = "Giờ bắt đầu không được để trống")
    private LocalTime startTime;

    @NotNull(message = "Giờ kết thúc không được để trống")
    private LocalTime endTime;

    @NotBlank(message = "Phòng học không được để trống")
    private String roomName;

    @NotNull(message = "Sĩ số tối đa không được để trống")
    @Min(value = 1, message = "Sĩ số tối đa phải lớn hơn 0")
    private Integer maxCapacity = 40;

    private SectionStatus status = SectionStatus.OPEN;

    public ClassSectionCreateRequest() {}

    public String getSectionCode() { return sectionCode; }
    public void setSectionCode(String sectionCode) { this.sectionCode = sectionCode; }

    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }

    public Long getLecturerId() { return lecturerId; }
    public void setLecturerId(Long lecturerId) { this.lecturerId = lecturerId; }

    public String getSemesterName() { return semesterName; }
    public void setSemesterName(String semesterName) { this.semesterName = semesterName; }

    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }

    public Integer getMaxCapacity() { return maxCapacity; }
    public void setMaxCapacity(Integer maxCapacity) { this.maxCapacity = maxCapacity; }

    public SectionStatus getStatus() { return status; }
    public void setStatus(SectionStatus status) { this.status = status; }
}
