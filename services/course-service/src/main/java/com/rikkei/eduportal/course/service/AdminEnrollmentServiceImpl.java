package com.rikkei.eduportal.course.service;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.course.dto.response.PendingEnrollmentResponse;
import com.rikkei.eduportal.course.entity.ClassSection;
import com.rikkei.eduportal.course.entity.Enrollment;
import com.rikkei.eduportal.course.exception.InvalidOperationException;
import com.rikkei.eduportal.course.exception.ResourceNotFoundException;
import com.rikkei.eduportal.course.exception.SectionCapacityFullException;
import com.rikkei.eduportal.course.repository.ClassSectionRepository;
import com.rikkei.eduportal.course.repository.EnrollmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdminEnrollmentServiceImpl implements AdminEnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final ClassSectionRepository classSectionRepository;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    public AdminEnrollmentServiceImpl(
            EnrollmentRepository enrollmentRepository,
            ClassSectionRepository classSectionRepository) {
        this.enrollmentRepository = enrollmentRepository;
        this.classSectionRepository = classSectionRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PendingEnrollmentResponse> getPendingEnrollments() {
        return enrollmentRepository.findByStatusWithDetails(EnrollmentStatus.PENDING)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public PendingEnrollmentResponse approveEnrollment(Long enrollmentId) {
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu đăng ký với ID: " + enrollmentId));

        if (enrollment.getStatus() != EnrollmentStatus.PENDING) {
            throw new InvalidOperationException("Chỉ có thể phê duyệt yêu cầu ở trạng thái PENDING. Trạng thái hiện tại: " + enrollment.getStatus());
        }

        ClassSection section = enrollment.getClassSection();
        if (section.getCurrentEnrolled() >= section.getMaxCapacity()) {
            throw new SectionCapacityFullException("Lớp học phần '" + section.getSectionCode() +
                    "' đã đạt sĩ số tối đa (" + section.getMaxCapacity() + "/" + section.getMaxCapacity() + "). Không thể duyệt thêm sinh viên!");
        }

        section.setCurrentEnrolled(section.getCurrentEnrolled() + 1);
        classSectionRepository.save(section);

        enrollment.setStatus(EnrollmentStatus.REGISTERED);
        Enrollment updated = enrollmentRepository.save(enrollment);

        return mapToResponse(updated);
    }

    @Override
    public PendingEnrollmentResponse rejectEnrollment(Long enrollmentId) {
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu đăng ký với ID: " + enrollmentId));

        if (enrollment.getStatus() != EnrollmentStatus.PENDING) {
            throw new InvalidOperationException("Chỉ có thể từ chối yêu cầu ở trạng thái PENDING. Trạng thái hiện tại: " + enrollment.getStatus());
        }

        enrollment.setStatus(EnrollmentStatus.REJECTED);
        Enrollment updated = enrollmentRepository.save(enrollment);

        return mapToResponse(updated);
    }

    private PendingEnrollmentResponse mapToResponse(Enrollment enrollment) {
        PendingEnrollmentResponse response = new PendingEnrollmentResponse();
        response.setEnrollmentId(enrollment.getId());
        response.setStatus(enrollment.getStatus());
        response.setRegisteredAt(enrollment.getRegisteredAt());

        if (enrollment.getStudent() != null) {
            response.setStudentId(enrollment.getStudent().getId());
            response.setStudentCode(enrollment.getStudent().getStudentCode());
            response.setStudentMajor(enrollment.getStudent().getMajor());
            if (enrollment.getStudent().getUser() != null) {
                response.setStudentName(enrollment.getStudent().getUser().getFullName());
            }
        }

        ClassSection section = enrollment.getClassSection();
        if (section != null) {
            response.setClassSectionId(section.getId());
            response.setSectionCode(section.getSectionCode());
            response.setSemesterName(section.getSemesterName());
            response.setDayOfWeek(section.getDayOfWeek());
            response.setRoomName(section.getRoomName());
            response.setMaxCapacity(section.getMaxCapacity());
            response.setCurrentEnrolled(section.getCurrentEnrolled());
            if (section.getStartTime() != null && section.getEndTime() != null) {
                response.setTimeDisplay(section.getStartTime().format(TIME_FMT) + " - " + section.getEndTime().format(TIME_FMT));
            }

            if (section.getCourse() != null) {
                response.setCourseCode(section.getCourse().getCourseCode());
                response.setCourseName(section.getCourse().getName());
                response.setCredits(section.getCourse().getCredits());
            }

            if (section.getLecturer() != null && section.getLecturer().getUser() != null) {
                response.setLecturerName(section.getLecturer().getUser().getFullName());
            }
        }

        return response;
    }
}
