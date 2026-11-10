package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.ExamScheduleDto;
import com.rikkei.eduportal.enrollment.dto.ExamScheduleRequest;
import com.rikkei.eduportal.enrollment.entity.ClassSection;
import com.rikkei.eduportal.enrollment.entity.ExamSchedule;
import com.rikkei.eduportal.enrollment.entity.StudentProfile;
import com.rikkei.eduportal.enrollment.exception.BusinessException;
import com.rikkei.eduportal.enrollment.exception.ResourceNotFoundException;
import com.rikkei.eduportal.enrollment.repository.ClassSectionRepository;
import com.rikkei.eduportal.enrollment.repository.ExamScheduleRepository;
import com.rikkei.eduportal.enrollment.repository.StudentProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ExamScheduleService {

    private final ExamScheduleRepository examScheduleRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentDashboardService dashboardService;
    private final ClassSectionRepository classSectionRepository;

    public ExamScheduleService(ExamScheduleRepository examScheduleRepository,
                               StudentProfileRepository studentProfileRepository,
                               StudentDashboardService dashboardService,
                               ClassSectionRepository classSectionRepository) {
        this.examScheduleRepository = examScheduleRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.dashboardService = dashboardService;
        this.classSectionRepository = classSectionRepository;
    }

    @Transactional(readOnly = true)
    public List<ExamScheduleDto> getStudentExams(String studentIdentifier, String semester) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        List<ExamSchedule> list = examScheduleRepository.findExamSchedulesByStudent(student.getId(), semester);

        return list.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ExamScheduleDto getExamScheduleById(Long id) {
        ExamSchedule es = examScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch thi với ID: " + id));
        return mapToDto(es);
    }

    @Transactional(readOnly = true)
    public List<ExamScheduleDto> getAllExams(String semester) {
        return getAllAdminExams(semester, null);
    }

    @Transactional(readOnly = true)
    public List<ExamScheduleDto> getAllAdminExams(String semester, String keyword) {
        List<ExamSchedule> list = examScheduleRepository.findAllWithDetails(
                (semester != null && !semester.trim().isEmpty()) ? semester.trim() : null
        );

        String kw = (keyword != null) ? keyword.trim().toLowerCase() : null;

        return list.stream()
                .filter(es -> {
                    if (kw == null || kw.isEmpty()) return true;
                    ClassSection cs = es.getClassSection();
                    if (cs == null) return false;
                    boolean matchSection = cs.getSectionCode() != null && cs.getSectionCode().toLowerCase().contains(kw);
                    boolean matchCourseCode = cs.getCourse() != null && cs.getCourse().getCourseCode().toLowerCase().contains(kw);
                    boolean matchCourseName = cs.getCourse() != null && cs.getCourse().getName().toLowerCase().contains(kw);
                    boolean matchRoom = es.getRoomName() != null && es.getRoomName().toLowerCase().contains(kw);
                    return matchSection || matchCourseCode || matchCourseName || matchRoom;
                })
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ExamScheduleDto createExamSchedule(ExamScheduleRequest request) {
        if (request.getClassSectionId() == null) {
            throw new BusinessException("Vui lòng chọn lớp học phần cần xếp lịch thi");
        }
        if (request.getExamDate() == null) {
            throw new BusinessException("Ngày thi không được để trống");
        }
        if (request.getStartTime() == null || request.getEndTime() == null) {
            throw new BusinessException("Giờ bắt đầu và kết thúc không được để trống");
        }
        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new BusinessException("Giờ bắt đầu phải trước giờ kết thúc ca thi");
        }
        if (request.getRoomName() == null || request.getRoomName().trim().isEmpty()) {
            throw new BusinessException("Phòng thi không được để trống");
        }

        ClassSection section = classSectionRepository.findById(request.getClassSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp học phần với ID: " + request.getClassSectionId()));

        ExamSchedule es = new ExamSchedule();
        es.setClassSection(section);
        es.setExamDate(request.getExamDate());
        es.setStartTime(request.getStartTime());
        es.setEndTime(request.getEndTime());
        es.setRoomName(request.getRoomName().trim());
        es.setExamType(request.getExamType() != null && !request.getExamType().trim().isEmpty() ? request.getExamType().trim() : "TỰ LUẬN");
        es.setNotes(request.getNotes() != null ? request.getNotes().trim() : "Sinh viên mang theo Thẻ sinh viên khi vào phòng thi");

        ExamSchedule saved = examScheduleRepository.save(es);
        return mapToDto(saved);
    }

    @Transactional
    public ExamScheduleDto updateExamSchedule(Long id, ExamScheduleRequest request) {
        ExamSchedule es = examScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch thi với ID: " + id));

        if (request.getExamDate() != null) {
            es.setExamDate(request.getExamDate());
        }
        if (request.getStartTime() != null) {
            es.setStartTime(request.getStartTime());
        }
        if (request.getEndTime() != null) {
            es.setEndTime(request.getEndTime());
        }
        if (es.getStartTime() != null && es.getEndTime() != null && !es.getStartTime().isBefore(es.getEndTime())) {
            throw new BusinessException("Giờ bắt đầu phải trước giờ kết thúc ca thi");
        }
        if (request.getRoomName() != null && !request.getRoomName().trim().isEmpty()) {
            es.setRoomName(request.getRoomName().trim());
        }
        if (request.getExamType() != null && !request.getExamType().trim().isEmpty()) {
            es.setExamType(request.getExamType().trim());
        }
        if (request.getNotes() != null) {
            es.setNotes(request.getNotes().trim());
        }
        if (request.getClassSectionId() != null && (es.getClassSection() == null || !request.getClassSectionId().equals(es.getClassSection().getId()))) {
            ClassSection newSection = classSectionRepository.findById(request.getClassSectionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp học phần với ID: " + request.getClassSectionId()));
            es.setClassSection(newSection);
        }

        ExamSchedule updated = examScheduleRepository.save(es);
        return mapToDto(updated);
    }

    @Transactional
    public void deleteExamSchedule(Long id) {
        ExamSchedule es = examScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch thi với ID: " + id));
        examScheduleRepository.delete(es);
    }

    @Transactional
    public int autoGenerateExamSchedules(String semester) {
        String targetSemester = (semester != null && !semester.trim().isEmpty()) ? semester.trim() : "2024-25_SEM2";
        List<ClassSection> sections = classSectionRepository.findBySemester(targetSemester);

        int count = 0;
        LocalDate baseDate = LocalDate.now().plusWeeks(2);
        LocalTime[] startSlots = {LocalTime.of(8, 0), LocalTime.of(10, 30), LocalTime.of(13, 30), LocalTime.of(15, 45)};
        LocalTime[] endSlots = {LocalTime.of(9, 30), LocalTime.of(12, 0), LocalTime.of(15, 0), LocalTime.of(17, 15)};

        for (int i = 0; i < sections.size(); i++) {
            ClassSection cs = sections.get(i);
            if (examScheduleRepository.existsByClassSectionId(cs.getId())) {
                continue;
            }

            int slotIdx = i % 4;
            int dayOffset = (i / 4) % 10;
            LocalDate examDate = baseDate.plusDays(dayOffset);
            if (examDate.getDayOfWeek().getValue() == 7) {
                examDate = examDate.plusDays(1); // Tránh Chủ nhật
            }

            String examType = "TỰ LUẬN";
            if (cs.getCourse() != null) {
                String cName = cs.getCourse().getName().toLowerCase();
                if (cName.contains("thực hành") || cName.contains("lập trình") || cName.contains("web") || cName.contains("cơ sở dữ liệu")) {
                    examType = "THI MÁY";
                } else if (cName.contains("đồ án") || cName.contains("khóa luận")) {
                    examType = "BẢO VỆ ĐỒ ÁN";
                }
            }

            ExamSchedule es = new ExamSchedule();
            es.setClassSection(cs);
            es.setExamDate(examDate);
            es.setStartTime(startSlots[slotIdx]);
            es.setEndTime(endSlots[slotIdx]);
            es.setRoomName(cs.getRoomName() != null ? cs.getRoomName() : "LAB-201");
            es.setExamType(examType);
            es.setNotes("Sinh viên mang theo thẻ sinh viên và có mặt trước 15 phút");

            examScheduleRepository.save(es);
            count++;
        }

        return count;
    }

    public ExamScheduleDto mapToDto(ExamSchedule es) {
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
            dto.setClassSectionId(cs.getId());
            dto.setSectionCode(cs.getSectionCode());
            dto.setSemesterName(cs.getSemesterName());
            dto.setCurrentEnrolled(cs.getCurrentEnrolled());
            dto.setMaxCapacity(cs.getMaxCapacity());
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
