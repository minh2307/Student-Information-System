package com.rikkei.eduportal.course.service;

import com.rikkei.eduportal.course.dto.request.CourseCreateRequest;
import com.rikkei.eduportal.course.dto.request.CourseUpdateRequest;
import com.rikkei.eduportal.course.dto.response.BatchImportResult;
import com.rikkei.eduportal.course.dto.response.CourseResponse;
import com.rikkei.eduportal.course.entity.Course;
import com.rikkei.eduportal.course.exception.DuplicateResourceException;
import com.rikkei.eduportal.course.exception.InvalidOperationException;
import com.rikkei.eduportal.course.exception.ResourceNotFoundException;
import com.rikkei.eduportal.course.repository.ClassSectionRepository;
import com.rikkei.eduportal.course.repository.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final ClassSectionRepository classSectionRepository;

    public CourseServiceImpl(CourseRepository courseRepository, ClassSectionRepository classSectionRepository) {
        this.courseRepository = courseRepository;
        this.classSectionRepository = classSectionRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseResponse> getAllCourses(String keyword) {
        return courseRepository.searchCourses(keyword)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CourseResponse getCourseById(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn học với ID: " + id));
        return mapToResponse(course);
    }

    @Override
    public CourseResponse createCourse(CourseCreateRequest request) {
        String cleanCode = request.getCourseCode().trim().toUpperCase();
        if (courseRepository.existsByCourseCode(cleanCode)) {
            throw new DuplicateResourceException("Mã môn học '" + cleanCode + "' đã tồn tại trên hệ thống!");
        }

        Course prerequisite = null;
        if (request.getPrerequisiteCourseId() != null) {
            prerequisite = courseRepository.findById(request.getPrerequisiteCourseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn học tiên quyết với ID: " + request.getPrerequisiteCourseId()));
        } else if (request.getPrerequisiteCourseCode() != null && !request.getPrerequisiteCourseCode().trim().isEmpty()) {
            prerequisite = courseRepository.findByCourseCode(request.getPrerequisiteCourseCode().trim().toUpperCase())
                    .orElse(null);
        }

        Course course = new Course();
        course.setCourseCode(cleanCode);
        course.setName(request.getName().trim());
        course.setCredits(request.getCredits());
        course.setWeeklyHours(request.getWeeklyHours());
        course.setSyllabusDescription(request.getSyllabusDescription());
        course.setPrerequisiteCourse(prerequisite);

        Course saved = courseRepository.save(course);
        return mapToResponse(saved);
    }

    @Override
    public CourseResponse updateCourse(Long id, CourseUpdateRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn học với ID: " + id));

        String cleanCode = request.getCourseCode().trim().toUpperCase();
        if (courseRepository.existsByCourseCodeAndIdNot(cleanCode, id)) {
            throw new DuplicateResourceException("Mã môn học '" + cleanCode + "' đã được sử dụng bởi môn học khác!");
        }

        Course prerequisite = null;
        if (request.getPrerequisiteCourseId() != null) {
            if (request.getPrerequisiteCourseId().equals(id)) {
                throw new InvalidOperationException("Môn học không thể chọn chính mình làm môn tiên quyết!");
            }
            prerequisite = courseRepository.findById(request.getPrerequisiteCourseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn học tiên quyết với ID: " + request.getPrerequisiteCourseId()));
        }

        course.setCourseCode(cleanCode);
        course.setName(request.getName().trim());
        course.setCredits(request.getCredits());
        course.setWeeklyHours(request.getWeeklyHours());
        course.setSyllabusDescription(request.getSyllabusDescription());
        course.setPrerequisiteCourse(prerequisite);

        Course updated = courseRepository.save(course);
        return mapToResponse(updated);
    }

    @Override
    public void deleteCourse(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn học với ID: " + id));

        if (classSectionRepository.existsByCourseId(id)) {
            throw new InvalidOperationException("Không thể xóa môn học '" + course.getCourseCode() + "' vì đã có lớp học phần được tạo!");
        }

        if (courseRepository.existsByPrerequisiteCourseId(id)) {
            throw new InvalidOperationException("Không thể xóa môn học '" + course.getCourseCode() + "' vì đang là môn học tiên quyết của môn khác!");
        }

        courseRepository.delete(course);
    }

    @Override
    @Transactional(noRollbackFor = {Exception.class})
    public BatchImportResult<CourseResponse> batchImportCourses(List<CourseCreateRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return new BatchImportResult<>(0, 0, 0, List.of("Danh sách môn học rỗng"), List.of());
        }

        int total = requests.size();
        int successCount = 0;
        int failureCount = 0;
        List<String> errors = new java.util.ArrayList<>();
        List<CourseResponse> successfulItems = new java.util.ArrayList<>();

        for (int i = 0; i < requests.size(); i++) {
            CourseCreateRequest req = requests.get(i);
            int rowNum = i + 1;
            try {
                if (req.getCourseCode() == null || req.getCourseCode().trim().isEmpty()) {
                    throw new IllegalArgumentException("Dòng " + rowNum + ": Mã môn học không được để trống");
                }
                if (req.getName() == null || req.getName().trim().isEmpty()) {
                    throw new IllegalArgumentException("Dòng " + rowNum + ": Tên môn học không được để trống");
                }
                if (req.getCredits() == null || req.getCredits() < 1) {
                    req.setCredits(3);
                }
                if (req.getWeeklyHours() == null || req.getWeeklyHours() < 1) {
                    req.setWeeklyHours(req.getCredits() != null ? req.getCredits() + 1 : 4);
                }

                String cleanCode = req.getCourseCode().trim().toUpperCase();
                if (courseRepository.existsByCourseCode(cleanCode)) {
                    throw new DuplicateResourceException("Dòng " + rowNum + ": Mã môn học '" + cleanCode + "' đã tồn tại trên hệ thống!");
                }

                CourseResponse created = createCourse(req);
                successfulItems.add(created);
                successCount++;
            } catch (Exception ex) {
                failureCount++;
                errors.add(ex.getMessage() != null ? ex.getMessage() : ("Dòng " + rowNum + ": Lỗi không xác định"));
            }
        }

        return new BatchImportResult<>(total, successCount, failureCount, errors, successfulItems);
    }

    private CourseResponse mapToResponse(Course course) {
        CourseResponse response = new CourseResponse();
        response.setId(course.getId());
        response.setCourseCode(course.getCourseCode());
        response.setName(course.getName());
        response.setCredits(course.getCredits());
        response.setWeeklyHours(course.getWeeklyHours());
        response.setSyllabusDescription(course.getSyllabusDescription());

        if (course.getPrerequisiteCourse() != null) {
            response.setPrerequisiteCourseId(course.getPrerequisiteCourse().getId());
            response.setPrerequisiteCourseCode(course.getPrerequisiteCourse().getCourseCode());
            response.setPrerequisiteCourseName(course.getPrerequisiteCourse().getName());
        }

        return response;
    }
}
