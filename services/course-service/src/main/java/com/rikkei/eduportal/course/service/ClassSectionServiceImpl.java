package com.rikkei.eduportal.course.service;

import com.rikkei.eduportal.common.SectionStatus;
import com.rikkei.eduportal.course.dto.request.ClassSectionCreateRequest;
import com.rikkei.eduportal.course.dto.request.ClassSectionUpdateRequest;
import com.rikkei.eduportal.course.dto.response.ClassSectionResponse;
import com.rikkei.eduportal.course.entity.ClassSection;
import com.rikkei.eduportal.course.entity.Course;
import com.rikkei.eduportal.course.entity.LecturerProfile;
import com.rikkei.eduportal.course.exception.*;
import com.rikkei.eduportal.course.repository.ClassSectionRepository;
import com.rikkei.eduportal.course.repository.CourseRepository;
import com.rikkei.eduportal.course.repository.EnrollmentRepository;
import com.rikkei.eduportal.course.repository.LecturerProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ClassSectionServiceImpl implements ClassSectionService {

    private final ClassSectionRepository classSectionRepository;
    private final CourseRepository courseRepository;
    private final LecturerProfileRepository lecturerProfileRepository;
    private final EnrollmentRepository enrollmentRepository;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    public ClassSectionServiceImpl(
            ClassSectionRepository classSectionRepository,
            CourseRepository courseRepository,
            LecturerProfileRepository lecturerProfileRepository,
            EnrollmentRepository enrollmentRepository) {
        this.classSectionRepository = classSectionRepository;
        this.courseRepository = courseRepository;
        this.lecturerProfileRepository = lecturerProfileRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClassSectionResponse> searchSections(String semesterName, SectionStatus status, String keyword) {
        return classSectionRepository.searchSections(semesterName, status, keyword)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ClassSectionResponse getSectionById(Long id) {
        ClassSection section = classSectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp học phần với ID: " + id));
        return mapToResponse(section);
    }

    @Override
    public ClassSectionResponse createSection(ClassSectionCreateRequest request) {
        String cleanCode = request.getSectionCode().trim().toUpperCase();
        if (classSectionRepository.existsBySectionCode(cleanCode)) {
            throw new DuplicateResourceException("Mã lớp học phần '" + cleanCode + "' đã tồn tại!");
        }

        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new InvalidOperationException("Giờ bắt đầu (" + request.getStartTime() + ") phải trước giờ kết thúc (" + request.getEndTime() + ")!");
        }

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn học với ID: " + request.getCourseId()));

        LecturerProfile lecturer = lecturerProfileRepository.findById(request.getLecturerId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giảng viên với ID: " + request.getLecturerId()));

        // 1. Kiểm tra trùng phòng học
        List<ClassSection> roomConflicts = classSectionRepository.findRoomConflicts(
                request.getSemesterName().trim(),
                request.getDayOfWeek().trim().toUpperCase(),
                request.getRoomName().trim(),
                request.getStartTime(),
                request.getEndTime(),
                null
        );
        if (!roomConflicts.isEmpty()) {
            ClassSection conflict = roomConflicts.get(0);
            throw new RoomConflictException("Xung đột phòng học: Phòng '" + request.getRoomName() +
                    "' đã được xếp cho lớp '" + conflict.getSectionCode() + "' (" +
                    conflict.getStartTime().format(TIME_FMT) + " - " + conflict.getEndTime().format(TIME_FMT) +
                    ") vào thứ " + request.getDayOfWeek() + "!");
        }

        // 2. Kiểm tra trùng lịch giảng viên
        List<ClassSection> lecturerConflicts = classSectionRepository.findLecturerConflicts(
                request.getSemesterName().trim(),
                request.getDayOfWeek().trim().toUpperCase(),
                request.getLecturerId(),
                request.getStartTime(),
                request.getEndTime(),
                null
        );
        if (!lecturerConflicts.isEmpty()) {
            ClassSection conflict = lecturerConflicts.get(0);
            String lecturerName = lecturer.getUser() != null ? lecturer.getUser().getFullName() : lecturer.getLecturerCode();
            throw new LecturerConflictException("Xung đột lịch giảng viên: Giảng viên '" + lecturerName +
                    "' đã có lịch dạy lớp '" + conflict.getSectionCode() + "' (" +
                    conflict.getStartTime().format(TIME_FMT) + " - " + conflict.getEndTime().format(TIME_FMT) +
                    ") tại phòng " + conflict.getRoomName() + " vào thứ " + request.getDayOfWeek() + "!");
        }

        ClassSection section = new ClassSection();
        section.setSectionCode(cleanCode);
        section.setCourse(course);
        section.setLecturer(lecturer);
        section.setSemesterName(request.getSemesterName().trim());
        section.setDayOfWeek(request.getDayOfWeek().trim().toUpperCase());
        section.setStartTime(request.getStartTime());
        section.setEndTime(request.getEndTime());
        section.setRoomName(request.getRoomName().trim());
        section.setMaxCapacity(request.getMaxCapacity());
        section.setCurrentEnrolled(0);
        section.setStatus(request.getStatus() != null ? request.getStatus() : SectionStatus.OPEN);

        ClassSection saved = classSectionRepository.save(section);
        return mapToResponse(saved);
    }

    @Override
    public ClassSectionResponse updateSection(Long id, ClassSectionUpdateRequest request) {
        ClassSection section = classSectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp học phần với ID: " + id));

        String cleanCode = request.getSectionCode().trim().toUpperCase();
        if (classSectionRepository.existsBySectionCodeAndIdNot(cleanCode, id)) {
            throw new DuplicateResourceException("Mã lớp học phần '" + cleanCode + "' đã được sử dụng bởi lớp khác!");
        }

        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new InvalidOperationException("Giờ bắt đầu (" + request.getStartTime() + ") phải trước giờ kết thúc (" + request.getEndTime() + ")!");
        }

        if (request.getMaxCapacity() < section.getCurrentEnrolled()) {
            throw new InvalidOperationException("Sĩ số tối đa mới (" + request.getMaxCapacity() +
                    ") không được nhỏ hơn số sinh viên hiện đã đăng ký (" + section.getCurrentEnrolled() + ")!");
        }

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn học với ID: " + request.getCourseId()));

        LecturerProfile lecturer = lecturerProfileRepository.findById(request.getLecturerId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giảng viên với ID: " + request.getLecturerId()));

        // 1. Kiểm tra trùng phòng học (loại trừ chính lớp này)
        List<ClassSection> roomConflicts = classSectionRepository.findRoomConflicts(
                request.getSemesterName().trim(),
                request.getDayOfWeek().trim().toUpperCase(),
                request.getRoomName().trim(),
                request.getStartTime(),
                request.getEndTime(),
                id
        );
        if (!roomConflicts.isEmpty()) {
            ClassSection conflict = roomConflicts.get(0);
            throw new RoomConflictException("Xung đột phòng học: Phòng '" + request.getRoomName() +
                    "' đã được xếp cho lớp '" + conflict.getSectionCode() + "' (" +
                    conflict.getStartTime().format(TIME_FMT) + " - " + conflict.getEndTime().format(TIME_FMT) +
                    ") vào thứ " + request.getDayOfWeek() + "!");
        }

        // 2. Kiểm tra trùng lịch giảng viên (loại trừ chính lớp này)
        List<ClassSection> lecturerConflicts = classSectionRepository.findLecturerConflicts(
                request.getSemesterName().trim(),
                request.getDayOfWeek().trim().toUpperCase(),
                request.getLecturerId(),
                request.getStartTime(),
                request.getEndTime(),
                id
        );
        if (!lecturerConflicts.isEmpty()) {
            ClassSection conflict = lecturerConflicts.get(0);
            String lecturerName = lecturer.getUser() != null ? lecturer.getUser().getFullName() : lecturer.getLecturerCode();
            throw new LecturerConflictException("Xung đột lịch giảng viên: Giảng viên '" + lecturerName +
                    "' đã có lịch dạy lớp '" + conflict.getSectionCode() + "' (" +
                    conflict.getStartTime().format(TIME_FMT) + " - " + conflict.getEndTime().format(TIME_FMT) +
                    ") tại phòng " + conflict.getRoomName() + " vào thứ " + request.getDayOfWeek() + "!");
        }

        section.setSectionCode(cleanCode);
        section.setCourse(course);
        section.setLecturer(lecturer);
        section.setSemesterName(request.getSemesterName().trim());
        section.setDayOfWeek(request.getDayOfWeek().trim().toUpperCase());
        section.setStartTime(request.getStartTime());
        section.setEndTime(request.getEndTime());
        section.setRoomName(request.getRoomName().trim());
        section.setMaxCapacity(request.getMaxCapacity());
        section.setStatus(request.getStatus());

        ClassSection updated = classSectionRepository.save(section);
        return mapToResponse(updated);
    }

    @Override
    public void deleteSection(Long id) {
        ClassSection section = classSectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp học phần với ID: " + id));

        if (section.getCurrentEnrolled() > 0 || enrollmentRepository.existsByClassSectionId(id)) {
            throw new InvalidOperationException("Không thể xóa lớp học phần '" + section.getSectionCode() +
                    "' vì đã có sinh viên đăng ký trên hệ thống!");
        }

        classSectionRepository.delete(section);
    }

    private ClassSectionResponse mapToResponse(ClassSection section) {
        ClassSectionResponse response = new ClassSectionResponse();
        response.setId(section.getId());
        response.setSectionCode(section.getSectionCode());
        response.setSemesterName(section.getSemesterName());
        response.setDayOfWeek(section.getDayOfWeek());
        response.setStartTime(section.getStartTime());
        response.setEndTime(section.getEndTime());
        response.setTimeDisplay(section.getStartTime().format(TIME_FMT) + " - " + section.getEndTime().format(TIME_FMT));
        response.setRoomName(section.getRoomName());
        response.setMaxCapacity(section.getMaxCapacity());
        response.setCurrentEnrolled(section.getCurrentEnrolled());
        response.setStatus(section.getStatus());

        if (section.getCourse() != null) {
            response.setCourseId(section.getCourse().getId());
            response.setCourseCode(section.getCourse().getCourseCode());
            response.setCourseName(section.getCourse().getName());
            response.setCredits(section.getCourse().getCredits());
        }

        if (section.getLecturer() != null) {
            response.setLecturerId(section.getLecturer().getId());
            response.setLecturerCode(section.getLecturer().getLecturerCode());
            response.setLecturerDepartment(section.getLecturer().getDepartment());
            if (section.getLecturer().getUser() != null) {
                response.setLecturerName(section.getLecturer().getUser().getFullName());
            }
        }

        return response;
    }
}
