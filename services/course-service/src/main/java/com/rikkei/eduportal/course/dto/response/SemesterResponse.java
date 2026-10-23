package com.rikkei.eduportal.course.dto.response;

import java.time.LocalDate;

public record SemesterResponse(
        Long id,
        String semesterCode,
        String semesterName,
        String academicYear,
        Boolean isActive,
        Boolean isRegistrationOpen,
        LocalDate startDate,
        LocalDate endDate
) {}
