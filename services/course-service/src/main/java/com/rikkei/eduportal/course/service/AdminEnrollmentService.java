package com.rikkei.eduportal.course.service;

import com.rikkei.eduportal.course.dto.response.PendingEnrollmentResponse;

import java.util.List;

public interface AdminEnrollmentService {

    List<PendingEnrollmentResponse> getPendingEnrollments();

    PendingEnrollmentResponse approveEnrollment(Long enrollmentId);

    PendingEnrollmentResponse rejectEnrollment(Long enrollmentId);
}
