package com.rikkei.eduportal.course.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record SemesterCreateRequest(
        @NotBlank(message = "Mã học kỳ không được để trống")
        String semesterCode,

        @NotBlank(message = "Tên học kỳ không được để trống")
        String semesterName,

        @NotBlank(message = "Năm học không được để trống")
        String academicYear,

        Boolean isActive,
        Boolean isRegistrationOpen,
        LocalDate startDate,
        LocalDate endDate
) {}
