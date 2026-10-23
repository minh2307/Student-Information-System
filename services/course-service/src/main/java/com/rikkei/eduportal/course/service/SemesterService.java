package com.rikkei.eduportal.course.service;

import com.rikkei.eduportal.course.dto.request.SemesterCreateRequest;
import com.rikkei.eduportal.course.dto.response.SemesterResponse;
import com.rikkei.eduportal.course.entity.Semester;
import com.rikkei.eduportal.course.exception.DuplicateResourceException;
import com.rikkei.eduportal.course.exception.ResourceNotFoundException;
import com.rikkei.eduportal.course.repository.SemesterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class SemesterService {

    private final SemesterRepository semesterRepository;

    public SemesterService(SemesterRepository semesterRepository) {
        this.semesterRepository = semesterRepository;
    }

    public List<SemesterResponse> getAllSemesters() {
        return semesterRepository.findAllByOrderByAcademicYearDescSemesterCodeDesc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public SemesterResponse getActiveSemester() {
        return semesterRepository.findByIsActiveTrue()
                .map(this::toResponse)
                .orElseGet(() -> {
                    List<Semester> all = semesterRepository.findAllByOrderByAcademicYearDescSemesterCodeDesc();
                    if (!all.isEmpty()) return toResponse(all.get(0));
                    throw new ResourceNotFoundException("Chưa có học kỳ nào được thiết lập trong hệ thống");
                });
    }

    @Transactional
    public SemesterResponse createSemester(SemesterCreateRequest req) {
        if (semesterRepository.existsBySemesterCode(req.semesterCode().trim())) {
            throw new DuplicateResourceException("Mã học kỳ đã tồn tại: " + req.semesterCode());
        }

        Semester sem = new Semester(
                req.semesterCode().trim(),
                req.semesterName().trim(),
                req.academicYear().trim(),
                Boolean.TRUE.equals(req.isActive()),
                req.isRegistrationOpen() != null ? req.isRegistrationOpen() : true
        );
        sem.setStartDate(req.startDate());
        sem.setEndDate(req.endDate());

        // Nếu đặt làm active, hủy active của các kỳ khác
        if (Boolean.TRUE.equals(req.isActive())) {
            semesterRepository.findByIsActiveTrue().ifPresent(old -> {
                old.setIsActive(false);
                semesterRepository.save(old);
            });
        }

        Semester saved = semesterRepository.save(sem);
        return toResponse(saved);
    }

    @Transactional
    public SemesterResponse toggleRegistration(Long id, Boolean isOpen) {
        Semester sem = semesterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy học kỳ với ID: " + id));
        sem.setIsRegistrationOpen(isOpen != null ? isOpen : !Boolean.TRUE.equals(sem.getIsRegistrationOpen()));
        return toResponse(semesterRepository.save(sem));
    }

    private SemesterResponse toResponse(Semester s) {
        return new SemesterResponse(
                s.getId(),
                s.getSemesterCode(),
                s.getSemesterName(),
                s.getAcademicYear(),
                s.getIsActive(),
                s.getIsRegistrationOpen(),
                s.getStartDate(),
                s.getEndDate()
        );
    }
}
