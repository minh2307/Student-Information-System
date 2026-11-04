package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.*;
import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AcademicContextService {

    private static final Logger log = LoggerFactory.getLogger(AcademicContextService.class);

    private final StudentDashboardService dashboardService;
    private final StudentProfileRepository studentProfileRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final GradeRepository gradeRepository;
    private final CourseRepository courseRepository;
    private final ClassSectionRepository classSectionRepository;

    public AcademicContextService(StudentDashboardService dashboardService,
                                  StudentProfileRepository studentProfileRepository,
                                  EnrollmentRepository enrollmentRepository,
                                  GradeRepository gradeRepository,
                                  CourseRepository courseRepository,
                                  ClassSectionRepository classSectionRepository) {
        this.dashboardService = dashboardService;
        this.studentProfileRepository = studentProfileRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.gradeRepository = gradeRepository;
        this.courseRepository = courseRepository;
        this.classSectionRepository = classSectionRepository;
    }

    @Transactional(readOnly = true)
    public StudentAcademicContextDto getStudentAcademicContext(String studentIdentifier) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        log.info("Aggregating academic context for student: {} (ID: {})", student.getStudentCode(), student.getId());

        StudentAcademicContextDto context = new StudentAcademicContextDto();
        context.setStudentCode(student.getStudentCode());
        if (student.getUser() != null) {
            context.setFullName(student.getUser().getFullName());
        }
        context.setMajor(student.getMajor());
        context.setCurrentSemester(student.getCurrentSemester());
        context.setTotalRequiredCredits(student.getTotalRequiredCredits() != null ? student.getTotalRequiredCredits() : 160);
        context.setCurrentCgpa(student.getCurrentCgpa() != null ? student.getCurrentCgpa() : BigDecimal.ZERO);
        context.setPreviousCgpa(student.getPreviousCgpa() != null ? student.getPreviousCgpa() : BigDecimal.ZERO);
        context.setAcademicStanding(calculateStanding(student.getCurrentCgpa()));

        // 1. Process Grades & Completed/Failed Courses
        List<Grade> grades = gradeRepository.findByStudentId(student.getId());
        List<Enrollment> allEnrollments = enrollmentRepository.findAllByStudentId(student.getId());

        Set<Long> completedCourseIds = new HashSet<>();
        int completedCreditsFromGrades = 0;

        List<CompletedCourseDto> completedList = new ArrayList<>();
        List<FailedCourseDto> failedList = new ArrayList<>();

        for (Grade g : grades) {
            if (g.getEnrollment() != null && g.getEnrollment().getClassSection() != null) {
                ClassSection cs = g.getEnrollment().getClassSection();
                Course c = cs.getCourse();
                if (c != null) {
                    String letter = g.getLetterGrade() != null ? g.getLetterGrade().trim().toUpperCase() : "";
                    boolean isFailed = "F".equals(letter) || (g.getTotalScore() != null && g.getTotalScore().compareTo(BigDecimal.valueOf(4.0)) < 0);

                    if (isFailed) {
                        failedList.add(new FailedCourseDto(
                                c.getCourseCode(),
                                c.getName(),
                                c.getCredits(),
                                cs.getSemesterName(),
                                letter,
                                g.getTotalScore()
                        ));
                    } else {
                        completedCourseIds.add(c.getId());
                        completedCreditsFromGrades += (c.getCredits() != null ? c.getCredits() : 0);
                        completedList.add(new CompletedCourseDto(
                                c.getCourseCode(),
                                c.getName(),
                                c.getCredits(),
                                cs.getSemesterName(),
                                letter,
                                g.getTotalScore()
                        ));
                    }
                }
            }
        }

        // Check for any enrollments marked COMPLETED without explicit Grade entity
        for (Enrollment e : allEnrollments) {
            if ("COMPLETED".equalsIgnoreCase(e.getStatus()) && e.getClassSection() != null && e.getClassSection().getCourse() != null) {
                Course c = e.getClassSection().getCourse();
                if (!completedCourseIds.contains(c.getId())) {
                    completedCourseIds.add(c.getId());
                    completedCreditsFromGrades += (c.getCredits() != null ? c.getCredits() : 0);
                    completedList.add(new CompletedCourseDto(
                            c.getCourseCode(),
                            c.getName(),
                            c.getCredits(),
                            e.getClassSection().getSemesterName(),
                            "P",
                            BigDecimal.valueOf(8.0)
                    ));
                }
            }
        }

        int effectiveCompletedCredits = (student.getCreditsEarned() != null && student.getCreditsEarned() > 0)
                ? student.getCreditsEarned()
                : completedCreditsFromGrades;
        context.setCompletedCredits(effectiveCompletedCredits);
        context.setCompletedCourses(completedList);
        context.setFailedCourses(failedList);

        // 2. Active Enrollments & Timetable
        List<Enrollment> activeEnrollments = enrollmentRepository.findActiveEnrollmentsByStudent(student.getId());
        Set<Long> currentlyEnrolledCourseIds = new HashSet<>();
        List<CurrentEnrollmentDto> currentList = new ArrayList<>();
        List<TimetableItemDto> timetable = new ArrayList<>();
        List<String> conflictingSections = new ArrayList<>();
        int registeredCredits = 0;
        int conflictCount = 0;

        for (Enrollment e : activeEnrollments) {
            ClassSection cs = e.getClassSection();
            if (cs != null && cs.getCourse() != null) {
                Course c = cs.getCourse();
                currentlyEnrolledCourseIds.add(c.getId());
                registeredCredits += (c.getCredits() != null ? c.getCredits() : 0);

                String lecturerName = "Chưa phân công";
                if (cs.getLecturer() != null && cs.getLecturer().getUser() != null) {
                    String deg = cs.getLecturer().getDegree();
                    lecturerName = (deg != null ? deg + " " : "") + cs.getLecturer().getUser().getFullName();
                }

                boolean conflict = Boolean.TRUE.equals(e.getHasConflict());
                if (conflict) {
                    conflictCount++;
                    conflictingSections.add(cs.getSectionCode());
                }

                String start = cs.getStartTime() != null ? cs.getStartTime().toString().substring(0, 5) : "";
                String end = cs.getEndTime() != null ? cs.getEndTime().toString().substring(0, 5) : "";

                currentList.add(new CurrentEnrollmentDto(
                        c.getCourseCode(),
                        c.getName(),
                        cs.getSectionCode(),
                        c.getCredits(),
                        cs.getDayOfWeek(),
                        start,
                        end,
                        cs.getRoomName(),
                        lecturerName,
                        e.getStatus(),
                        conflict
                ));

                timetable.add(new TimetableItemDto(
                        c.getCourseCode(),
                        c.getName(),
                        cs.getSectionCode(),
                        cs.getDayOfWeek(),
                        start,
                        end,
                        cs.getRoomName(),
                        lecturerName,
                        conflict
                ));
            }
        }

        context.setRegisteredCredits(registeredCredits);
        context.setCurrentEnrollments(currentList);
        context.setTimetable(timetable);
        context.setScheduleConflictCount(conflictCount);
        context.setConflictingSections(conflictingSections);

        // Average Attendance Rate
        if (!activeEnrollments.isEmpty()) {
            double sumRate = activeEnrollments.stream()
                    .map(e -> e.getAttendanceRate() != null ? e.getAttendanceRate().doubleValue() : 100.0)
                    .reduce(0.0, Double::sum);
            context.setAttendanceRate(BigDecimal.valueOf(sumRate / activeEnrollments.size())
                    .setScale(1, RoundingMode.HALF_UP).doubleValue());
        } else {
            context.setAttendanceRate(100.0);
        }

        // 3. Available Courses and Prerequisite Resolution
        List<Course> allCourses = courseRepository.findAll();
        Map<Long, Course> courseMap = allCourses.stream()
                .collect(Collectors.toMap(Course::getId, c -> c, (a, b) -> a));

        List<ClassSection> openSections = classSectionRepository.searchSections(null, null).stream()
                .filter(s -> "OPEN".equalsIgnoreCase(s.getStatus()))
                .toList();

        Map<Long, List<ClassSection>> sectionsByCourseId = openSections.stream()
                .filter(s -> s.getCourse() != null)
                .collect(Collectors.groupingBy(s -> s.getCourse().getId()));

        List<AvailableCourseDto> availableCourses = new ArrayList<>();
        for (Course c : allCourses) {
            List<ClassSection> sections = sectionsByCourseId.getOrDefault(c.getId(), Collections.emptyList());
            if (sections.isEmpty()) {
                continue;
            }

            AvailableCourseDto av = new AvailableCourseDto();
            av.setCourseId(c.getId());
            av.setCourseCode(c.getCourseCode());
            av.setCourseName(c.getName());
            av.setCredits(c.getCredits());
            av.setOpenSectionsCount(sections.size());

            boolean isAlreadyCompleted = completedCourseIds.contains(c.getId());
            boolean isCurrentlyEnrolled = currentlyEnrolledCourseIds.contains(c.getId());
            av.setAlreadyCompleted(isAlreadyCompleted);
            av.setCurrentlyEnrolled(isCurrentlyEnrolled);

            Long prereqId = c.getPrerequisiteCourseId();
            if (prereqId == null) {
                av.setPrerequisiteSatisfied(true);
            } else {
                av.setPrerequisiteCourseId(prereqId);
                Course prereqCourse = courseMap.get(prereqId);
                if (prereqCourse != null) {
                    av.setPrerequisiteCourseCode(prereqCourse.getCourseCode());
                    av.setPrerequisiteCourseName(prereqCourse.getName());
                }
                av.setPrerequisiteSatisfied(completedCourseIds.contains(prereqId));
            }

            // Check if any open section conflicts with current timetable
            boolean anySectionConflict = sections.stream().anyMatch(sec -> hasConflictWithActive(sec, activeEnrollments));
            av.setHasScheduleConflict(anySectionConflict);

            availableCourses.add(av);
        }

        context.setAvailableCourses(availableCourses);
        return context;
    }

    private boolean hasConflictWithActive(ClassSection target, List<Enrollment> activeEnrollments) {
        if (target.getDayOfWeek() == null || target.getStartTime() == null || target.getEndTime() == null) {
            return false;
        }
        for (Enrollment e : activeEnrollments) {
            ClassSection registered = e.getClassSection();
            if (registered == null || target.getId().equals(registered.getId())) continue;
            if (target.getDayOfWeek().equalsIgnoreCase(registered.getDayOfWeek())) {
                LocalTime startA = target.getStartTime();
                LocalTime endA = target.getEndTime();
                LocalTime startB = registered.getStartTime();
                LocalTime endB = registered.getEndTime();
                if (startB != null && endB != null && startA.isBefore(endB) && endA.isAfter(startB)) {
                    return true;
                }
            }
        }
        return false;
    }

    private String calculateStanding(BigDecimal cgpa) {
        if (cgpa == null) return "Chưa xếp loại";
        double val = cgpa.doubleValue();
        if (val >= 8.5) return "Xuất sắc";
        if (val >= 8.0) return "Giỏi";
        if (val >= 7.0) return "Khá";
        if (val >= 5.0) return "Trung bình";
        return "Yếu";
    }
}
