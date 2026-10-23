package com.rikkei.eduportal.course.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
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
) {
    @JsonProperty("registrationOpen")
    public Boolean registrationOpen() {
        return isRegistrationOpen;
    }
}
