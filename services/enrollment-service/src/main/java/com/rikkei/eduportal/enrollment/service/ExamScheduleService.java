package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.ExamScheduleDto;
import com.rikkei.eduportal.enrollment.entity.ClassSection;
import com.rikkei.eduportal.enrollment.entity.ExamSchedule;
import com.rikkei.eduportal.enrollment.entity.StudentProfile;
import com.rikkei.eduportal.enrollment.repository.ExamScheduleRepository;
import com.rikkei.eduportal.enrollment.repository.StudentProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ExamScheduleService {

    private final ExamScheduleRepository examScheduleRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentDashboardService dashboardService;

    public ExamScheduleService(ExamScheduleRepository examScheduleRepository,
                               StudentProfileRepository studentProfileRepository,
                               StudentDashboardService dashboardService) {
        this.examScheduleRepository = examScheduleRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.dashboardService = dashboardService;
    }

    @Transactional(readOnly = true)
    public List<ExamScheduleDto> getStudentExams(String studentIdentifier, String semester) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        List<ExamSchedule> list = examScheduleRepository.findExamSchedulesByStudent(student.getId(), semester);

        return list.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExamScheduleDto> getAllExams(String semester) {
        return examScheduleRepository.findAll().stream()
                .filter(es -> semester == null || semester.isEmpty() || (es.getClassSection() != null && semester.equalsIgnoreCase(es.getClassSection().getSemesterName())))
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private ExamScheduleDto mapToDto(ExamSchedule es) {
        ExamScheduleDto dto = new ExamScheduleDto();
        dto.setId(es.getId());
        dto.setExamDate(es.getExamDate());
        dto.setStartTime(es.getStartTime());
        dto.setEndTime(es.getEndTime());
        dto.setRoomName(es.getRoomName());
        dto.setExamType(es.getExamType());
        dto.setNotes(es.getNotes());

        ClassSection cs = es.getClassSection();
        if (cs != null) {
            dto.setSectionCode(cs.getSectionCode());
            if (cs.getCourse() != null) {
                dto.setCourseCode(cs.getCourse().getCourseCode());
                dto.setCourseName(cs.getCourse().getName());
                dto.setCredits(cs.getCourse().getCredits());
            }
            if (cs.getLecturer() != null && cs.getLecturer().getUser() != null) {
                String deg = cs.getLecturer().getDegree();
                dto.setLecturerName((deg != null ? deg + " " : "") + cs.getLecturer().getUser().getFullName());
            }
        }
        return dto;
    }
}
