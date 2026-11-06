package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.config.ScheduleOptimizerProperties;
import com.rikkei.eduportal.enrollment.dto.*;
import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.exception.BatchReservationException;
import com.rikkei.eduportal.enrollment.exception.BusinessException;
import com.rikkei.eduportal.enrollment.exception.ResourceNotFoundException;
import com.rikkei.eduportal.enrollment.repository.ClassSectionRepository;
import com.rikkei.eduportal.enrollment.repository.EnrollmentRepository;
import com.rikkei.eduportal.enrollment.repository.SlotReservationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronizationUtils;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TASK-D04-MINH: Complete Unit Tests for CSP Smart Schedule Optimizer")
class SmartScheduleOptimizerServiceTest {

    @Mock
    private ClassSectionRepository classSectionRepository;

    @Mock
    private RealtimeSeatService realtimeSeatService;

    @Mock
    private SlotReservationRepository slotReservationRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private StudentDashboardService dashboardService;

    @Mock
    private ScheduleOptimizerProperties properties;

    @InjectMocks
    private SmartScheduleOptimizerService optimizerService;

    private Course course1;
    private Course course2;
    private Course course3;
    private Course course4;
    private LecturerProfile lecturer;
    private StudentProfile student;

    @BeforeEach
    void setUp() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        TransactionSynchronizationManager.setActualTransactionActive(false);

        course1 = createCourse(101L, "CS101", "Nhập môn Lập trình", 3);
        course2 = createCourse(102L, "CS102", "Cấu trúc dữ liệu và giải thuật", 3);
        course3 = createCourse(103L, "CS103", "Cơ sở dữ liệu", 4);
        course4 = createCourse(104L, "CS104", "Mạng máy tính", 3);

        User user = new User();
        user.setId(10L);
        user.setFullName("TS. Nguyen Van A");

        lecturer = new LecturerProfile();
        lecturer.setId(1L);
        lecturer.setUser(user);

        student = new StudentProfile();
        student.setId(1L);
        student.setStudentCode("sv2024001");
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        TransactionSynchronizationManager.setActualTransactionActive(false);
    }

    // =========================================================================
    // Test Data Factory Helpers
    // =========================================================================

    private Course createCourse(Long id, String code, String name, Integer credits) {
        Course c = new Course();
        c.setId(id);
        c.setCourseCode(code);
        c.setName(name);
        c.setCredits(credits);
        c.setWeeklyHours(credits);
        return c;
    }

    private ClassSection createSection(Long id, String code, Course course, String day,
                                       LocalTime start, LocalTime end, Integer maxCap, Integer enrolled) {
        return createSection(id, code, course, day, start, end, maxCap, enrolled, "OPEN", "Room A-101", lecturer);
    }

    private ClassSection createSection(Long id, String code, Course course, String day,
                                       LocalTime start, LocalTime end, Integer maxCap, Integer enrolled,
                                       String status, String room, LecturerProfile lec) {
        ClassSection cs = new ClassSection();
        cs.setId(id);
        cs.setSectionCode(code);
        cs.setCourse(course);
        cs.setLecturer(lec);
        cs.setSemesterName("2024-25_SEM2");
        cs.setDayOfWeek(day);
        cs.setStartTime(start);
        cs.setEndTime(end);
        cs.setRoomName(room);
        cs.setMaxCapacity(maxCap);
        cs.setCurrentEnrolled(enrolled);
        cs.setStatus(status);
        return cs;
    }

    private ScheduleOptimizerRequest createBaseRequest(List<Long> courseIds) {
        ScheduleOptimizerRequest req = new ScheduleOptimizerRequest();
        req.setCourseIds(courseIds);
        req.setSemesterName("2024-25_SEM2");
        req.setOptimizationGoal("COMPACT");
        req.setPreferredShift("ANY");
        req.setOnlyAvailableSeats(true);
        return req;
    }

    // =========================================================================
    // Group A: Trường hợp có lời giải (Valid Solutions)
    // =========================================================================

    @Nested
    @DisplayName("Group A: Trường hợp có lời giải (Valid Solutions)")
    class GroupA_ValidSolutions {

        @Test
        @DisplayName("A01: Tất cả môn học đều có section hợp lệ -> tìm được lịch")
        void testA01_AllCoursesHaveValidSections_FindsSchedule() {
            ClassSection s1 = createSection(1L, "CS101-01", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 10);
            ClassSection s2 = createSection(2L, "CS102-01", course2, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 10);

            when(classSectionRepository.findBySemesterAndCourseIdIn(eq("2024-25_SEM2"), anyList()))
                    .thenReturn(List.of(s1, s2));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertNotNull(response);
            assertTrue(response.isSuccess());
            assertTrue(response.getIsComplete());
            assertEquals(OptimizationStatus.OPTIMAL, response.getStatus());
            assertEquals(2, response.getSchedule().size());
            assertEquals(6, response.getTotalCredits());
            assertEquals(0, response.getUnassignedCourses().size());
            assertFalse(response.getPlans().isEmpty());
        }

        @Test
        @DisplayName("A02: Chỉ có một môn học -> tìm được lịch hợp lệ")
        void testA02_SingleCourse_FindsSchedule() {
            ClassSection s1 = createSection(1L, "CS101-01", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 30), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertNotNull(response);
            assertTrue(response.isSuccess());
            assertEquals(1, response.getSchedule().size());
            assertEquals("CS101-01", response.getSchedule().get(0).getSectionCode());
            assertEquals("CS101", response.getSchedule().get(0).getCourseCode());
            assertEquals(3, response.getTotalCredits());
        }

        @Test
        @DisplayName("A03: Nhiều môn học không xung đột thời gian -> tìm được lịch")
        void testA03_MultipleCoursesNonConflicting_FindsSchedule() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, "WED", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s3 = createSection(3L, "S3", course3, "FRI", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1, s2, s3));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L, 103L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertNotNull(response);
            assertTrue(response.isSuccess());
            assertEquals(3, response.getSchedule().size());
            assertEquals(10, response.getTotalCredits());
        }

        @Test
        @DisplayName("A04: Có nhiều phương án -> chọn phương án có điểm đánh giá tốt nhất theo objective function")
        void testA04_MultipleOptions_SelectsHighestScoredPlan() {
            // Course 1 has Mon Morning (7-9:15) and Sat Morning (7-9:15)
            ClassSection s1Mon = createSection(1L, "S1-MON", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s1Sat = createSection(2L, "S1-SAT", course1, "SAT", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1Mon, s1Sat));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L));
            request.setAvoidDays(List.of("SAT", "SUN"));

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertNotNull(response);
            assertEquals("S1-MON", response.getSchedule().get(0).getSectionCode());
            SchedulePlanOption plan1 = response.getPlans().get(0);
            assertEquals(96, plan1.getMatchPercentage());
        }

        @Test
        @DisplayName("A05: Kiểm tra mọi môn học được phân công section hợp lệ")
        void testA05_AllRequestedCoursesAssignedValidSections() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, "MON", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1, s2));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            List<String> assignedCourseCodes = response.getSchedule().stream()
                    .map(ScheduleItemDto::getCourseCode)
                    .toList();
            assertThat(assignedCourseCodes).containsExactlyInAnyOrder("CS101", "CS102");
        }

        @Test
        @DisplayName("A06: Kiểm tra lịch kết quả không có xung đột thời gian")
        void testA06_ResultingScheduleHasNoTimeCollisions() {
            ClassSection s1A = createSection(1L, "S1A", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s1B = createSection(2L, "S1B", course1, "MON", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 5);
            ClassSection s2A = createSection(3L, "S2A", course2, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s2B = createSection(4L, "S2B", course2, "MON", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1A, s1B, s2A, s2B));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            List<ScheduleItemDto> items = response.getSchedule();
            assertEquals(2, items.size());
            ScheduleItemDto first = items.get(0);
            ScheduleItemDto second = items.get(1);

            // They must not collide in time
            ClassSection cs1 = createSection(1L, first.getSectionCode(), course1, first.getDayOfWeekText(),
                    LocalTime.parse(first.getStartTime()), LocalTime.parse(first.getEndTime()), 40, 0);
            ClassSection cs2 = createSection(2L, second.getSectionCode(), course2, second.getDayOfWeekText(),
                    LocalTime.parse(second.getStartTime()), LocalTime.parse(second.getEndTime()), 40, 0);
            assertFalse(optimizerService.hasTimeCollision(cs1, cs2));
        }

        @Test
        @DisplayName("A07: Kiểm tra không vi phạm các hard constraints (sĩ số, trạng thái active)")
        void testA07_HardConstraintsRespected() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 39);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L));
            request.setOnlyAvailableSeats(true);

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);
            assertTrue(response.isSuccess());
            assertEquals("S1", response.getSchedule().get(0).getSectionCode());
        }

        @Test
        @DisplayName("A08: Kiểm tra kết quả có đúng status khi thuật toán hoàn tất tìm kiếm")
        void testA08_SearchCompletedSuccessfully_ReturnsOptimalStatus() {
            ClassSection s1 = createSection(1L, "S1", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertEquals(OptimizationStatus.OPTIMAL, response.getStatus());
            assertTrue(response.getStatusMessage().contains("tìm thấy 1 phương án tối ưu"));
            assertTrue(response.getExecutionTimeMs() >= 0);
        }
    }

    // =========================================================================
    // Group B: Trường hợp không có lời giải (No Solution)
    // =========================================================================

    @Nested
    @DisplayName("Group B: Trường hợp không có lời giải (No Solution)")
    class GroupB_NoSolutions {

        @Test
        @DisplayName("B01: Hai môn học chỉ có section trùng hoàn toàn thời gian -> không có lời giải")
        void testB01_CompleteConflict_ReturnsNoSolution() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1, s2));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertNotNull(response);
            assertFalse(response.isSuccess());
            assertFalse(response.getIsComplete());
            assertEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
            assertEquals(0, response.getSchedule().size());
            assertEquals(0, response.getPlans().size());
            assertTrue(response.getConflictDetails().contains("Xung đột"));
            assertTrue(response.getConflictDetails().contains("Tất cả các lớp của 2 môn này đều bị xung đột thời gian"));
        }

        @Test
        @DisplayName("B02: Các môn học xung đột từng phần nhưng không thể kết hợp thành lịch hợp lệ")
        void testB02_PartialConflictsNoValidCombination_ReturnsNoSolution() {
            // C1 has Mon 8-10, Tue 8-10
            ClassSection s1A = createSection(1L, "S1A", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            ClassSection s1B = createSection(2L, "S1B", course1, "TUE", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            // C2 has Mon 8-10
            ClassSection s2A = createSection(3L, "S2A", course2, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            // C3 has Tue 8-10
            ClassSection s3A = createSection(4L, "S3A", course3, "TUE", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1A, s1B, s2A, s3A));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L, 103L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertFalse(response.isSuccess());
            assertEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
            assertEquals(3, response.getUnassignedCourses().size());
        }

        @Test
        @DisplayName("B03: Một môn học không có section khả dụng (không có lớp nào mở)")
        void testB03_CourseWithNoSections_ReturnsNoSolutionWithReason() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertFalse(response.isSuccess());
            assertEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
            assertEquals(1, response.getUnassignedCourses().size());
            UnassignedCourseDto unassigned = response.getUnassignedCourses().get(0);
            assertEquals("Môn #102", unassigned.getCourseCode());
            assertTrue(unassigned.getReason().contains("Không có lớp học phần nào mở"));
        }

        @Test
        @DisplayName("B04: Một môn học có domain rỗng (tất cả các lớp đều đã hết chỗ trống)")
        void testB04_CourseWithAllSectionsFull_ReturnsNoSolutionWithReason() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 10);
            ClassSection s2Full = createSection(2L, "S2", course2, "TUE", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 40);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1, s2Full));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            request.setOnlyAvailableSeats(true);

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertFalse(response.isSuccess());
            assertEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
            assertEquals(1, response.getUnassignedCourses().size());
            UnassignedCourseDto unassigned = response.getUnassignedCourses().get(0);
            assertEquals("CS102", unassigned.getCourseCode());
            assertTrue(unassigned.getReason().contains("đều đã hết chỗ trống"));
        }

        @Test
        @DisplayName("B05: Không tồn tại bất kỳ tổ hợp section nào thỏa mãn hard constraints")
        void testB05_NoCombinationSatisfiesHardConstraints() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(9, 0), LocalTime.of(11, 0), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, "MON", LocalTime.of(10, 0), LocalTime.of(12, 0), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1, s2));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
            assertNotNull(response.getConflictDetails());
        }

        @Test
        @DisplayName("B06: Kiểm tra status phân biệt giữa NO_SOLUTION và TIMEOUT_NO_SOLUTION")
        void testB06_DifferentiatesNoSolutionAndTimeoutNoSolution() {
            // Case 1: Search completed exhaustive, 0 solutions -> NO_SOLUTION
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(9, 0), LocalTime.of(11, 0), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, "MON", LocalTime.of(9, 0), LocalTime.of(11, 0), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1, s2));

            ScheduleOptimizerRequest reqCompleted = createBaseRequest(List.of(101L, 102L));
            ScheduleOptimizerResponse respCompleted = optimizerService.optimizeSchedule("sv2024001", reqCompleted);
            assertEquals(OptimizationStatus.NO_SOLUTION, respCompleted.getStatus());

            // Case 2: Max time 0ms, interrupted before solutions found -> TIMEOUT_NO_SOLUTION or TIME_LIMIT_EXCEEDED
            ScheduleOptimizerRequest reqTimeout = createBaseRequest(List.of(101L, 102L));
            reqTimeout.setMaxExecutionTimeMs(0L);

            ScheduleOptimizerResponse respTimeout = optimizerService.optimizeSchedule("sv2024001", reqTimeout);
            assertThat(respTimeout.getStatus())
                    .isIn(OptimizationStatus.TIMEOUT_NO_SOLUTION, OptimizationStatus.TIME_LIMIT_EXCEEDED);
            assertNotEquals(OptimizationStatus.NO_SOLUTION, respTimeout.getStatus());
        }
    }

    // =========================================================================
    // Group C: Ưu tiên ca sáng / chiều (Session Preference)
    // =========================================================================

    @Nested
    @DisplayName("Group C: Ưu tiên ca sáng / chiều (Session Preference)")
    class GroupC_SessionPreference {

        @Test
        @DisplayName("C01: Ưu tiên ca sáng -> chọn lịch có nhiều ca sáng hơn")
        void testC01_PreferredMorning_PrioritizesMorningSections() {
            ClassSection s1Morning = createSection(1L, "S1-MORN", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s1Afternoon = createSection(2L, "S1-AFT", course1, "MON", LocalTime.of(13, 0), LocalTime.of(15, 15), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1Morning, s1Afternoon));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L));
            request.setPreferredShift("MORNING");

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertEquals("S1-MORN", response.getSchedule().get(0).getSectionCode());
            assertTrue(response.getPlans().get(0).getHighlights().stream().anyMatch(h -> h.contains("Ca Sáng")));
        }

        @Test
        @DisplayName("C02: Ưu tiên ca chiều -> chọn lịch có nhiều ca chiều hơn")
        void testC02_PreferredAfternoon_PrioritizesAfternoonSections() {
            ClassSection s1Morning = createSection(1L, "S1-MORN", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s1Afternoon = createSection(2L, "S1-AFT", course1, "TUE", LocalTime.of(13, 0), LocalTime.of(15, 15), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1Morning, s1Afternoon));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L));
            request.setPreferredShift("AFTERNOON");

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertEquals("S1-AFT", response.getSchedule().get(0).getSectionCode());
            assertTrue(response.getPlans().get(0).getHighlights().stream().anyMatch(h -> h.contains("Ca Chiều")));
        }

        @Test
        @DisplayName("C03: Không có preference -> xử lý theo default")
        void testC03_NoPreference_HandledByDefault() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L));
            request.setPreferredShift(null);

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);
            assertTrue(response.isSuccess());
            assertEquals("S1", response.getSchedule().get(0).getSectionCode());
        }

        @Test
        @DisplayName("C04: Các section có cùng preference score -> kiểm tra tie-breaking an toàn chỗ trống")
        void testC04_EqualPreference_TieBreakingBySeatBuffer() {
            // S1 has 40 - 38 = 2 available seats (< 5)
            ClassSection s1Tight = createSection(1L, "S1-TIGHT", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 38);
            // S2 has 40 - 10 = 30 available seats (>= 5, score +5 bonus)
            ClassSection s2Plentiful = createSection(2L, "S2-PLENTY", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 10);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1Tight, s2Plentiful));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L));
            request.setPreferredShift("MORNING");

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);
            assertEquals("S2-PLENTY", response.getSchedule().get(0).getSectionCode());
        }

        @Test
        @DisplayName("C05: Preference không được phép làm vi phạm hard constraints")
        void testC05_PreferenceNeverViolatesHardConstraints() {
            // Course 1 has only morning (7:00-9:15)
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            // Course 2 has morning (conflicting 7:00-9:15) and afternoon (13:00-15:15)
            ClassSection s2MorningConflicting = createSection(2L, "S2-MORN", course2, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s2AfternoonValid = createSection(3L, "S2-AFT", course2, "MON", LocalTime.of(13, 0), LocalTime.of(15, 15), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1, s2MorningConflicting, s2AfternoonValid));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            request.setPreferredShift("MORNING"); // Request Morning!

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertTrue(response.isSuccess());
            List<String> codes = response.getSchedule().stream().map(ScheduleItemDto::getSectionCode).toList();
            assertThat(codes).containsExactlyInAnyOrder("S1", "S2-AFT");
        }

        @Test
        @DisplayName("C06: Không có section phù hợp preference -> trả về phương án khả thi tốt nhất, không crash")
        void testC06_NoMatchingPreferenceSection_ReturnsBestFeasibleSchedule() {
            // User wants MORNING, but sections are AFTERNOON
            ClassSection s1Afternoon = createSection(1L, "S1-AFT", course1, "MON", LocalTime.of(13, 0), LocalTime.of(15, 15), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1Afternoon));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L));
            request.setPreferredShift("MORNING");

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertTrue(response.isSuccess());
            assertEquals("S1-AFT", response.getSchedule().get(0).getSectionCode());
        }
    }

    // =========================================================================
    // Group D: Tối ưu số ngày đến trường (Minimize Campus Days)
    // =========================================================================

    @Nested
    @DisplayName("Group D: Tối ưu số ngày đến trường (Minimize Campus Days)")
    class GroupD_MinimizeCampusDays {

        @Test
        @DisplayName("D01: Xếp toàn bộ môn học trong 2 ngày -> ưu tiên phương án 2 ngày thay vì 3 ngày")
        void testD01_CompactGoal_PrioritizesTwoDaysOverThreeDays() {
            // Option 1: Mon 7-9:15 and Mon 9:30-11:45 (1 day total)
            ClassSection s1Mon = createSection(1L, "S1-MON", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s2Mon = createSection(2L, "S2-MON", course2, "MON", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 5);

            // Option 2: Wed 7-9:15 (would make 2 days)
            ClassSection s2Wed = createSection(3L, "S2-WED", course2, "WED", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1Mon, s2Mon, s2Wed));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            request.setOptimizationGoal("COMPACT");

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertTrue(response.isSuccess());
            SchedulePlanOption topPlan = response.getPlans().get(0);
            assertEquals(1, topPlan.getStudyDaysCount());
            assertTrue(topPlan.getHighlights().stream().anyMatch(h -> h.contains("Lịch cực kỳ gọn")));
        }

        @Test
        @DisplayName("D02: Có nhiều section lựa chọn -> chọn phương án giảm số ngày đến trường")
        void testD02_MultipleSections_ChoosesFewerDays() {
            // C1 on MON 7:00-9:15
            ClassSection s1Mon = createSection(1L, "S1-MON", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            // C2 has 2 options: MON 9:30-11:45 (stays on MON, 2 total days with C3) vs TUE 7:00-9:15 (adds TUE, 3 total days with C3)
            ClassSection s2Mon = createSection(2L, "S2-MON", course2, "MON", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 5);
            ClassSection s2Tue = createSection(3L, "S2-TUE", course2, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            // C3 on WED 7:00-9:15
            ClassSection s3Wed = createSection(4L, "S3-WED", course3, "WED", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1Mon, s2Mon, s2Tue, s3Wed));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L, 103L));
            request.setOptimizationGoal("COMPACT");

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertTrue(response.isSuccess());
            SchedulePlanOption topPlan = response.getPlans().get(0);
            assertEquals(2, topPlan.getStudyDaysCount(), "Phương án tốt nhất phải dồn vào 2 ngày (MON, WED) thay vì 3 ngày");
            assertThat(topPlan.getStudyDays()).containsExactlyInAnyOrder("MON", "WED");
        }

        @Test
        @DisplayName("D03: Nhiều môn học có thể gộp trong cùng ngày nếu không xung đột")
        void testD03_MultipleCoursesPackedInSameDayWithoutConflict() {
            ClassSection s1 = createSection(1L, "S1", course1, "THU", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, "THU", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 5);
            ClassSection s3 = createSection(3L, "S3", course3, "THU", LocalTime.of(13, 0), LocalTime.of(15, 15), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1, s2, s3));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L, 103L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertTrue(response.isSuccess());
            assertEquals(3, response.getSchedule().size());
            assertEquals(1, response.getPlans().get(0).getStudyDaysCount());
        }

        @Test
        @DisplayName("D04: Không thể giảm số ngày -> vẫn trả về lịch khả thi")
        void testD04_CannotReduceDays_ReturnsFeasibleSchedule() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s3 = createSection(3L, "S3", course3, "WED", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s4 = createSection(4L, "S4", course4, "THU", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1, s2, s3, s4));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L, 103L, 104L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertTrue(response.isSuccess());
            assertEquals(4, response.getSchedule().size());
            assertEquals(4, response.getPlans().get(0).getStudyDaysCount());
        }

        @Test
        @DisplayName("D05: Kiểm tra chính xác số ngày đến trường từ lịch kết quả")
        void testD05_VerifyExactCampusDaysCount() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, "FRI", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1, s2));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            SchedulePlanOption plan = response.getPlans().get(0);
            assertEquals(2, plan.getStudyDaysCount());
            assertThat(plan.getStudyDays()).containsExactlyInAnyOrder("MON", "FRI");
        }

        @Test
        @DisplayName("D06: Tiêu chí giảm số ngày không làm vi phạm hard constraints")
        void testD06_CampusDaysMinimizationDoesNotViolateHardConstraints() {
            // S1 on MON 7:00-9:15
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            // S2 on MON 7:00-9:15 (Same day, but CONFLICTING time)
            ClassSection s2MonConflicting = createSection(2L, "S2-MON", course2, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            // S2 on TUE 7:00-9:15 (2 days, but NO conflict)
            ClassSection s2Tue = createSection(3L, "S2-TUE", course2, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1, s2MonConflicting, s2Tue));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            request.setOptimizationGoal("COMPACT");

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertTrue(response.isSuccess());
            List<String> codes = response.getSchedule().stream().map(ScheduleItemDto::getSectionCode).toList();
            assertThat(codes).containsExactlyInAnyOrder("S1", "S2-TUE");
        }

        @Test
        @DisplayName("D07: Kiểm tra BALANCED goal phân bổ không quá 2 lớp/ngày")
        void testD07_BalancedGoal_DistributionScore() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1, s2));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            request.setOptimizationGoal("BALANCED");

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertTrue(response.isSuccess());
            assertTrue(response.getPlans().get(0).getHighlights().stream()
                    .anyMatch(h -> h.contains("Phân bổ cân bằng")));
        }
    }

    // =========================================================================
    // Group E: Edge Cases và Input Validation
    // =========================================================================

    @Nested
    @DisplayName("Group E: Edge Cases và Input Validation")
    class GroupE_EdgeCasesAndInputValidation {

        @Test
        @DisplayName("E01: Input null -> request == null -> NO_INPUT")
        void testE01_NullRequest_ReturnsNoInput() {
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", null);
            assertNotNull(response);
            assertFalse(response.isSuccess());
            assertFalse(response.getIsComplete());
            assertEquals(OptimizationStatus.NO_INPUT, response.getStatus());
            assertTrue(response.getStatusMessage().contains("ít nhất một môn học"));
        }

        @Test
        @DisplayName("E01b: CourseIds null -> request.getCourseIds() == null -> NO_INPUT")
        void testE01b_NullCourseIds_ReturnsNoInput() {
            ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
            request.setCourseIds(null);

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);
            assertNotNull(response);
            assertFalse(response.isSuccess());
            assertFalse(response.getIsComplete());
            assertEquals(OptimizationStatus.NO_INPUT, response.getStatus());
            assertTrue(response.getStatusMessage().contains("ít nhất một môn học"));
        }

        @Test
        @DisplayName("E02: Danh sách môn học rỗng -> NO_INPUT")
        void testE02_EmptyCourseList_ReturnsNoInput() {
            ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
            request.setCourseIds(Collections.emptyList());

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);
            assertNotNull(response);
            assertFalse(response.isSuccess());
            assertEquals(OptimizationStatus.NO_INPUT, response.getStatus());
        }

        @Test
        @DisplayName("E03: Danh sách môn học chứa phần tử null -> lọc null an toàn")
        void testE03_CourseListWithNullElements_FiltersNullsSafely() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1));

            ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
            List<Long> ids = new ArrayList<>();
            ids.add(null);
            ids.add(101L);
            ids.add(null);
            request.setCourseIds(ids);

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);
            assertTrue(response.isSuccess());
            assertEquals(1, response.getSchedule().size());
            assertEquals("S1", response.getSchedule().get(0).getSectionCode());
        }

        @Test
        @DisplayName("E03b: Danh sách môn học CHỈ chứa phần tử null -> NO_INPUT")
        void testE03b_CourseListAllNullElements_ReturnsNoInput() {
            ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
            List<Long> ids = new ArrayList<>();
            ids.add(null);
            ids.add(null);
            request.setCourseIds(ids);

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);
            assertFalse(response.isSuccess());
            assertEquals(OptimizationStatus.NO_INPUT, response.getStatus());
        }

        @Test
        @DisplayName("E04: Section null hoặc dữ liệu thời gian/thứ null -> lọc bỏ an toàn")
        void testE04_InvalidOrNullSectionData_FilteredSafely() {
            ClassSection nullSec = null;
            ClassSection noCourseSec = new ClassSection();
            noCourseSec.setId(10L);

            ClassSection noCourseIdSec = new ClassSection();
            noCourseIdSec.setId(11L);
            noCourseIdSec.setCourse(new Course());

            ClassSection cancelledSec = createSection(12L, "S-CAN", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            cancelledSec.setStatus("CANCELLED");

            ClassSection nullDaySec = createSection(13L, "S-NODAY", course1, null, LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection emptyDaySec = createSection(14L, "S-EMPTYDAY", course1, "   ", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

            ClassSection nullStartSec = createSection(15L, "S-NOSTART", course1, "MON", null, LocalTime.of(9, 15), 40, 5);
            ClassSection nullEndSec = createSection(16L, "S-NOEND", course1, "MON", LocalTime.of(7, 0), null, 40, 5);

            ClassSection validSec = createSection(17L, "S-VALID", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

            List<ClassSection> rawList = new ArrayList<>(Arrays.asList(
                    nullSec, noCourseSec, noCourseIdSec, cancelledSec, nullDaySec, emptyDaySec, nullStartSec, nullEndSec, validSec
            ));

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(rawList);

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertTrue(response.isSuccess());
            assertEquals(1, response.getSchedule().size());
            assertEquals("S-VALID", response.getSchedule().get(0).getSectionCode());
        }

        @Test
        @DisplayName("E05: Danh sách section chứa ID trùng lặp -> deduplicate")
        void testE05_DuplicateCourseIdsInRequest_Deduplicated() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 101L, 101L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertTrue(response.isSuccess());
            assertEquals(1, response.getSchedule().size());
            assertEquals(1, response.getRequestedCoursesCount());
        }

        @Test
        @DisplayName("E06: Dữ liệu thời gian không hợp lệ (endTime <= startTime) -> lọc bỏ an toàn")
        void testE06_EndTimeBeforeStartTime_FilteredSafely() {
            ClassSection invalidSec = createSection(1L, "S-INV", course1, "MON", LocalTime.of(10, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection equalTimeSec = createSection(2L, "S-EQ", course1, "MON", LocalTime.of(9, 0), LocalTime.of(9, 0), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(invalidSec, equalTimeSec));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertFalse(response.isSuccess());
            assertEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
        }

        @Test
        @DisplayName("E07: Không có môn học nào có section hợp lệ (repository trả về null) -> NO_SOLUTION")
        void testE07_NullRepositoryReturn_ReturnsNoSolution() {
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(null);

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertFalse(response.isSuccess());
            assertEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
        }
    }

    // =========================================================================
    // Group F: Timeout và Branch Pruning (HOTFIX-AI)
    // =========================================================================

    @Nested
    @DisplayName("Group F: Timeout và Branch Pruning (HOTFIX-AI)")
    class GroupF_TimeoutAndBranchPruning {

        @Test
        @DisplayName("F01: Search hoàn tất trong thời gian cho phép -> trả về OPTIMAL")
        void testF01_SearchCompletedWithinLimit_ReturnsOptimal() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertEquals(OptimizationStatus.OPTIMAL, response.getStatus());
            assertTrue(response.isSuccess());
        }

        @Test
        @DisplayName("F02: Timeout khi đã tìm được lời giải khả thi -> trả về FEASIBLE_TIMEOUT (best-so-far)")
        void testF02_TimeoutWithFeasibleSolution_ReturnsFeasibleTimeout() {
            // Course 1 has 2 sections, Course 2 has 2 sections
            ClassSection s1A = createSection(1L, "S1A", course1, "MON", LocalTime.of(7, 0), LocalTime.of(8, 0), 40, 5);
            ClassSection s1B = createSection(2L, "S1B", course1, "MON", LocalTime.of(8, 30), LocalTime.of(9, 30), 40, 5);

            ClassSection s2A = createSection(3L, "S2A", course2, "TUE", LocalTime.of(7, 0), LocalTime.of(8, 0), 40, 5);
            ClassSection s2B = createSection(4L, "S2B", course2, "TUE", LocalTime.of(8, 30), LocalTime.of(9, 30), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1A, s1B, s2A, s2B));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            request.setMaxExecutionTimeMs(0L); // 0ms timeout triggers right at node 1 after 1st solution is recorded!

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertNotNull(response);
            if (response.getStatus() == OptimizationStatus.FEASIBLE_TIMEOUT) {
                assertTrue(response.isSuccess());
                assertTrue(response.getIsComplete());
                assertEquals(2, response.getSchedule().size());
                assertTrue(response.getStatusMessage().contains("chạm giới hạn thời gian"));
            } else {
                // If timeout was evaluated even before recording
                assertThat(response.getStatus()).isIn(OptimizationStatus.TIMEOUT_NO_SOLUTION, OptimizationStatus.TIME_LIMIT_EXCEEDED);
            }
        }

        @Test
        @DisplayName("F03: Timeout khi chưa tìm được lời giải -> trả về TIMEOUT_NO_SOLUTION")
        void testF03_TimeoutWithoutSolution_ReturnsTimeoutNoSolution() {
            // Setup 4 courses with 5 non-conflicting sections each so node 1 is evaluated before reaching leaf
            List<ClassSection> sections = new ArrayList<>();
            List<Long> courseIds = new ArrayList<>();
            for (int c = 1; c <= 4; c++) {
                Long cId = 500L + c;
                courseIds.add(cId);
                Course course = createCourse(cId, "CS" + cId, "Course " + cId, 3);
                for (int s = 1; s <= 5; s++) {
                    sections.add(createSection((long) (c * 100 + s), "S" + c + "-" + s, course, "MON",
                            LocalTime.of(7 + s, 0), LocalTime.of(7 + s, 50), 40, 5));
                }
            }

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(sections);

            ScheduleOptimizerRequest request = createBaseRequest(courseIds);
            request.setMaxExecutionTimeMs(0L);

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertNotNull(response);
            assertFalse(response.isSuccess());
            assertThat(response.getStatus()).isIn(OptimizationStatus.TIMEOUT_NO_SOLUTION, OptimizationStatus.TIME_LIMIT_EXCEEDED);
            assertNotEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
        }

        @Test
        @DisplayName("F04: Timeout không được trả về status OPTIMAL")
        void testF04_TimeoutNeverReturnsOptimalStatus() {
            List<ClassSection> sections = new ArrayList<>();
            List<Long> courseIds = new ArrayList<>();
            for (int c = 1; c <= 3; c++) {
                Long cId = 600L + c;
                courseIds.add(cId);
                Course course = createCourse(cId, "CS" + cId, "Course " + cId, 3);
                for (int s = 1; s <= 4; s++) {
                    sections.add(createSection((long) (c * 100 + s), "S" + c + "-" + s, course, "WED",
                            LocalTime.of(7 + s, 0), LocalTime.of(7 + s, 50), 40, 5));
                }
            }

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(sections);

            ScheduleOptimizerRequest request = createBaseRequest(courseIds);
            request.setMaxExecutionTimeMs(0L);

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertNotEquals(OptimizationStatus.OPTIMAL, response.getStatus());
        }

        @Test
        @DisplayName("F05: Kết quả timeout vẫn thỏa mãn hard constraints (không xung đột)")
        void testF05_FeasibleTimeoutResultSatisfiesHardConstraints() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(8, 0), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, "TUE", LocalTime.of(7, 0), LocalTime.of(8, 0), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1, s2));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            request.setMaxSolutions(1);

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertTrue(response.isSuccess());
            List<ScheduleItemDto> items = response.getSchedule();
            assertEquals(2, items.size());
            assertNotEquals(items.get(0).getDayOfWeekText(), items.get(1).getDayOfWeekText());
        }

        @Test
        @DisplayName("F06: Branch pruning (Forward Checking) cắt tỉa nhánh xung đột sớm")
        void testF06_BranchPruningForwardChecking_PrunesEarly() {
            // Course 1 has S1A (MON 8-10) and S1B (TUE 8-10)
            ClassSection s1A = createSection(1L, "S1A", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            ClassSection s1B = createSection(2L, "S1B", course1, "TUE", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);

            // Course 2 has ONLY S2A (MON 8-10) -> conflicts with S1A!
            ClassSection s2A = createSection(3L, "S2A", course2, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1A, s1B, s2A));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertTrue(response.isSuccess());
            assertEquals(1, response.getPlans().size());
            List<String> codes = response.getSchedule().stream().map(ScheduleItemDto::getSectionCode).toList();
            assertThat(codes).containsExactlyInAnyOrder("S1B", "S2A");
        }

        @Test
        @DisplayName("F07: Search chạm maxSearchNodes dừng sớm an toàn với SEARCH_LIMIT_REACHED")
        void testF07_MaxSearchNodesLimit_ReturnsSearchLimitReached() {
            List<ClassSection> sections = new ArrayList<>();
            List<Long> courseIds = new ArrayList<>();
            for (int c = 1; c <= 4; c++) {
                Long cId = 700L + c;
                courseIds.add(cId);
                Course course = createCourse(cId, "CS" + cId, "Course " + cId, 3);
                for (int s = 1; s <= 5; s++) {
                    sections.add(createSection((long) (c * 100 + s), "S" + c + "-" + s, course, "MON",
                            LocalTime.of(7 + s, 0), LocalTime.of(7 + s, 50), 40, 5));
                }
            }

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(sections);

            ScheduleOptimizerRequest request = createBaseRequest(courseIds);
            request.setMaxSearchNodes(2);

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertNotNull(response);
            assertEquals(OptimizationStatus.SEARCH_LIMIT_REACHED, response.getStatus());
            assertTrue(response.getStatusMessage().contains("chạm giới hạn duyệt"));
        }

        @Test
        @DisplayName("F08: Concurrency & Thread safety - nhiều request đồng thời độc lập trạng thái")
        void testF08_ConcurrentRequests_ThreadSafe() throws Exception {
            ClassSection s1A = createSection(1L, "S1A", course1, "MON", LocalTime.of(7, 0), LocalTime.of(8, 0), 40, 5);
            ClassSection s1B = createSection(2L, "S1B", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(8, 0), 40, 5);
            ClassSection s2A = createSection(3L, "S2A", course2, "WED", LocalTime.of(7, 0), LocalTime.of(8, 0), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1A, s1B, s2A));

            int threadCount = 8;
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);
            CountDownLatch latch = new CountDownLatch(threadCount);
            AtomicInteger successCounter = new AtomicInteger(0);

            for (int i = 0; i < threadCount; i++) {
                final int idx = i;
                executor.submit(() -> {
                    try {
                        ScheduleOptimizerRequest req = createBaseRequest(List.of(101L, 102L));
                        req.setPreferredShift(idx % 2 == 0 ? "MORNING" : "AFTERNOON");

                        ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("user_" + idx, req);
                        if (resp.isSuccess() && resp.getSchedule().size() == 2) {
                            successCounter.incrementAndGet();
                        }
                    } finally {
                        latch.countDown();
                    }
                });
            }

            boolean finished = latch.await(5, TimeUnit.SECONDS);
            executor.shutdown();

            assertTrue(finished);
            assertEquals(threadCount, successCounter.get());
        }
    }

    // =========================================================================
    // Group G: Scoring, Diversification and Top Plans
    // =========================================================================

    @Nested
    @DisplayName("Group G: Đánh giá điểm và Top 3 phương án đa dạng")
    class GroupG_ScoringAndPlanDiversity {

        @Test
        @DisplayName("G01: Evaluate score với combo rỗng trả về ScoreDetail mặc định")
        void testG01_EvaluateScore_EmptyCombo() {
            SmartScheduleOptimizerService.ScoreDetail detail = optimizerService.evaluateScore(Collections.emptyList(), null);
            assertEquals(0, detail.totalScore);
            assertEquals(0, detail.uniqueDaysCount);
            assertTrue(detail.highlights.isEmpty());
        }

        @Test
        @DisplayName("G02: Avoid days - vi phạm bị trừ điểm (-30)")
        void testG02_AvoidDays_ViolationPenalty() {
            ClassSection satSec = createSection(1L, "S1", course1, "SAT", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            ClassSection monSec = createSection(2L, "S2", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            ScheduleOptimizerRequest req = new ScheduleOptimizerRequest();
            req.setAvoidDays(List.of("SAT", "SUN"));

            SmartScheduleOptimizerService.ScoreDetail detailViolated = optimizerService.evaluateScore(List.of(satSec), req);
            SmartScheduleOptimizerService.ScoreDetail detailClean = optimizerService.evaluateScore(List.of(monSec), req);

            assertTrue(detailViolated.totalScore < detailClean.totalScore, "Vi phạm avoid days phải có điểm thấp hơn phương án tránh thành công");
            assertFalse(detailViolated.highlights.stream().anyMatch(h -> h.contains("Tránh thành công")));
            assertTrue(detailClean.highlights.stream().anyMatch(h -> h.contains("Tránh thành công")));
        }

        @Test
        @DisplayName("G03: Lịch có tiết trống kéo dài giữa các ca (> 150 phút)")
        void testG03_LongGapBetweenClasses_Detected() {
            // Class 1 ends at 9:00, Class 2 starts at 12:30 -> gap = 210 mins (>150m)
            ClassSection c1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection c2 = createSection(2L, "S2", course2, "MON", LocalTime.of(12, 30), LocalTime.of(14, 30), 40, 5);

            ScheduleOptimizerRequest req = new ScheduleOptimizerRequest();
            req.setOptimizationGoal("COMPACT");

            SmartScheduleOptimizerService.ScoreDetail detail = optimizerService.evaluateScore(List.of(c1, c2), req);
            assertFalse(detail.highlights.stream().anyMatch(h -> h.contains("Không có tiết trống kéo dài")));
        }

        @Test
        @DisplayName("G04: Lịch rải rác >= 5 ngày trong tuần bị trừ điểm (-10)")
        void testG04_FiveDaysScatteredSchedule_PenaltyApplied() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(8, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, "TUE", LocalTime.of(8, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection s3 = createSection(3L, "S3", course3, "WED", LocalTime.of(8, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection s4 = createSection(4L, "S4", course4, "THU", LocalTime.of(8, 0), LocalTime.of(9, 0), 40, 5);
            Course c5 = createCourse(105L, "CS105", "Web Development", 3);
            ClassSection s5 = createSection(5L, "S5", c5, "FRI", LocalTime.of(8, 0), LocalTime.of(9, 0), 40, 5);

            ScheduleOptimizerRequest req = new ScheduleOptimizerRequest();
            req.setOptimizationGoal("COMPACT");

            SmartScheduleOptimizerService.ScoreDetail detail = optimizerService.evaluateScore(List.of(s1, s2, s3, s4, s5), req);
            assertEquals(5, detail.uniqueDaysCount);
        }

        @Test
        @DisplayName("G05: Sinh đủ 3 phương án đa dạng khi có nhiều lựa chọn")
        void testG05_SelectTopDiversePlans_ThreePlans() {
            ClassSection s1A = createSection(1L, "S1A", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s1B = createSection(2L, "S1B", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            ClassSection s1C = createSection(3L, "S1C", course1, "WED", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

            ClassSection s2A = createSection(4L, "S2A", course2, "THU", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1A, s1B, s1C, s2A));

            ScheduleOptimizerRequest request = createBaseRequest(List.of(101L, 102L));
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

            assertEquals(3, response.getPlans().size());
            assertEquals(96, response.getPlans().get(0).getMatchPercentage());
            assertEquals(90, response.getPlans().get(1).getMatchPercentage());
            assertEquals(85, response.getPlans().get(2).getMatchPercentage());
        }

        @Test
        @DisplayName("G06: selectTopDiversePlans với danh sách rỗng trả về rỗng")
        void testG06_SelectTopDiversePlans_EmptyInput() {
            List<SchedulePlanOption> plans = optimizerService.selectTopDiversePlans(Collections.emptyList(), null);
            assertTrue(plans.isEmpty());
        }
    }

    // =========================================================================
    // Group H: Collision Matrix, Periods and Day Normalization
    // =========================================================================

    @Nested
    @DisplayName("Group H: Ma trận xung đột, tính tiết học và chuẩn hóa thứ")
    class GroupH_PeriodCalculationAndDayNormalization {

        @Test
        @DisplayName("H01: hasConflictWithCurrent với target null hoặc current rỗng")
        void testH01_HasConflictWithCurrent_NullSafe() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            assertFalse(optimizerService.hasConflictWithCurrent(null, List.of(s1)));
            assertFalse(optimizerService.hasConflictWithCurrent(s1, null));
            assertFalse(optimizerService.hasConflictWithCurrent(s1, Collections.emptyList()));
        }

        @Test
        @DisplayName("H02: hasConflictWithCurrent phát hiện xung đột chính xác")
        void testH02_HasConflictWithCurrent_DetectsConflict() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            ClassSection s2Conflict = createSection(2L, "S2", course2, "MON", LocalTime.of(9, 0), LocalTime.of(11, 0), 40, 5);
            ClassSection s3NoConflict = createSection(3L, "S3", course3, "TUE", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);

            assertTrue(optimizerService.hasConflictWithCurrent(s2Conflict, List.of(s1, s3NoConflict)));
            assertFalse(optimizerService.hasConflictWithCurrent(s3NoConflict, List.of(s1)));
        }

        @Test
        @DisplayName("H03: hasTimeCollision bao phủ tất cả các nhánh null, thứ, giờ")
        void testH03_HasTimeCollision_AllBranches() {
            ClassSection valid = createSection(1L, "S1", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            ClassSection nullDay = createSection(2L, "S2", course2, null, LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            ClassSection nullStart = createSection(3L, "S3", course2, "MON", null, LocalTime.of(10, 0), 40, 5);
            ClassSection nullEnd = createSection(4L, "S4", course2, "MON", LocalTime.of(8, 0), null, 40, 5);
            ClassSection invertedTime = createSection(5L, "S5", course2, "MON", LocalTime.of(11, 0), LocalTime.of(10, 0), 40, 5);

            assertFalse(optimizerService.hasTimeCollision(null, valid));
            assertFalse(optimizerService.hasTimeCollision(valid, null));
            assertFalse(optimizerService.hasTimeCollision(valid, nullDay));
            assertFalse(optimizerService.hasTimeCollision(nullDay, valid));
            assertFalse(optimizerService.hasTimeCollision(valid, nullStart));
            assertFalse(optimizerService.hasTimeCollision(valid, nullEnd));
            assertFalse(optimizerService.hasTimeCollision(valid, invertedTime));

            // Adjacent periods do not collide
            ClassSection sAdjacent = createSection(6L, "S6", course2, "MON", LocalTime.of(10, 0), LocalTime.of(12, 0), 40, 5);
            assertFalse(optimizerService.hasTimeCollision(valid, sAdjacent));

            // Completely before / after
            ClassSection sAfter = createSection(7L, "S7", course2, "MON", LocalTime.of(13, 0), LocalTime.of(15, 0), 40, 5);
            assertFalse(optimizerService.hasTimeCollision(valid, sAfter));
            assertFalse(optimizerService.hasTimeCollision(sAfter, valid));
        }

        @ParameterizedTest(name = "normalizeDay \"{0}\" -> \"{1}\"")
        @CsvSource({
                "Thứ 2, MON",
                "MON, MON",
                "Monday, MON",
                "Thứ hai, MON",
                "Thứ 3, TUE",
                "TUE, TUE",
                "Tuesday, TUE",
                "Thứ ba, TUE",
                "Thứ 4, WED",
                "WED, WED",
                "Wednesday, WED",
                "Thứ Tư, WED",
                "Thu Tu, WED",
                "Thứ 5, THU",
                "THU, THU",
                "Thursday, THU",
                "Thứ Năm, THU",
                "Thu Nam, THU",
                "Thứ 6, FRI",
                "FRI, FRI",
                "Friday, FRI",
                "Thứ Sáu, FRI",
                "Thu Sau, FRI",
                "Thứ 7, SAT",
                "SAT, SAT",
                "Thứ Bảy, SAT",
                "Chủ Nhật, SUN",
                "Chu Nhat, SUN",
                "SUN, SUN",
                "Sunday, SUN",
                "CN, SUN",
                "Thứ 8, SUN"
        })
        @DisplayName("H04: Chuẩn hóa đa định dạng thứ trong tuần tiếng Việt và tiếng Anh")
        void testH04_NormalizeDay_AllVietnameseAndEnglishFormats(String inputDay, String expectedNormalized) {
            ClassSection s1 = createSection(1L, "S1", course1, inputDay, LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, expectedNormalized, LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            assertTrue(optimizerService.hasTimeCollision(s1, s2));
        }

        @Test
        @DisplayName("H05: buildCollisionMatrix hoạt động chính xác với mảng rỗng")
        void testH05_BuildCollisionMatrix_EmptyList() {
            boolean[][] matrix = optimizerService.buildCollisionMatrix(Collections.emptyList());
            assertEquals(0, matrix.length);
        }

        @Test
        @DisplayName("H06: Bao phủ tất cả các tiết bắt đầu và kết thúc (Periods 1 - 11)")
        void testH06_StartAndEndPeriodsCoverage() {
            // Test periods via toScheduleItemDto mapping
            LocalTime[] startTimes = {
                    LocalTime.of(7, 0),   // period 1 (<= 460)
                    LocalTime.of(8, 10),  // period 2 (<= 510)
                    LocalTime.of(9, 10),  // period 3 (<= 560)
                    LocalTime.of(10, 0),  // period 4 (<= 615)
                    LocalTime.of(11, 20), // period 5 (<= 700)
                    LocalTime.of(12, 40), // period 6 (<= 780)
                    LocalTime.of(13, 30), // period 7 (<= 835)
                    LocalTime.of(14, 30), // period 8 (<= 890)
                    LocalTime.of(15, 20), // period 9 (<= 940)
                    LocalTime.of(16, 20), // period 10 (<= 1000)
                    LocalTime.of(17, 30)  // period 11 (> 1000)
            };

            LocalTime[] endTimes = {
                    LocalTime.of(8, 0),   // period 1 (<= 505)
                    LocalTime.of(9, 10),  // period 2 (<= 555)
                    LocalTime.of(10, 5),  // period 3 (<= 610)
                    LocalTime.of(11, 5),  // period 4 (<= 670)
                    LocalTime.of(12, 10), // period 5 (<= 740)
                    LocalTime.of(13, 40), // period 6 (<= 830)
                    LocalTime.of(14, 35), // period 7 (<= 885)
                    LocalTime.of(15, 30), // period 8 (<= 935)
                    LocalTime.of(16, 30), // period 9 (<= 995)
                    LocalTime.of(17, 30), // period 10 (<= 1055)
                    LocalTime.of(18, 30)  // period 11 (> 1055)
            };

            for (int i = 0; i < startTimes.length; i++) {
                ClassSection sec = createSection((long) (i + 1), "SEC-" + i, course1, "MON",
                        startTimes[i], endTimes[i], 40, 5);

                when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                        .thenReturn(List.of(sec));

                ScheduleOptimizerRequest req = createBaseRequest(List.of(101L));
                ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv2024001", req);
                assertTrue(resp.isSuccess());
                assertNotNull(resp.getSchedule().get(0));
            }
        }
    }

    // =========================================================================
    // Group I: Batch Reservation Scenarios & Branches
    // =========================================================================

    @Nested
    @DisplayName("Group I: Giữ chỗ hàng loạt nguyên tử (Batch Reservation)")
    class GroupI_BatchReservationAtomicScenarios {

        @Test
        @DisplayName("I01: Request null hoặc danh sách rỗng ném BusinessException 400")
        void testI01_NullOrEmptyRequest_ThrowsBusinessException() {
            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv001", null))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("không được để trống");

            BatchReserveRequest emptyReq = new BatchReserveRequest(Collections.emptyList());
            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv001", emptyReq))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("không được để trống");

            BatchReserveRequest nullIdsReq = new BatchReserveRequest();
            nullIdsReq.setSectionIds(null);
            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv001", nullIdsReq))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("không được để trống");
        }

        @Test
        @DisplayName("I02: Section IDs chứa null ném BusinessException 400")
        void testI02_SectionIdsContainsNull_ThrowsBusinessException() {
            List<Long> ids = new ArrayList<>();
            ids.add(10L);
            ids.add(null);
            BatchReserveRequest req = new BatchReserveRequest(ids);

            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv001", req))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("không được chứa giá trị null");
        }

        @Test
        @DisplayName("I03: Vượt quá tối đa 4 môn ném BatchReservationException MAX_LIMIT_EXCEEDED")
        void testI03_ExceedsMaxBatchSize_ThrowsBatchReservationException() {
            BatchReserveRequest req = new BatchReserveRequest(List.of(1L, 2L, 3L, 4L, 5L));

            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv001", req))
                    .isInstanceOf(BatchReservationException.class)
                    .satisfies(e -> {
                        BatchReservationException bre = (BatchReservationException) e;
                        assertEquals("MAX_LIMIT_EXCEEDED", bre.getDetails().getReason());
                    });
        }

        @Test
        @DisplayName("I04: Danh sách trùng lặp mã lớp ném DUPLICATE_COURSE")
        void testI04_DuplicateSectionIds_ThrowsBatchReservationException() {
            BatchReserveRequest req = new BatchReserveRequest(List.of(10L, 10L));

            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv001", req))
                    .isInstanceOf(BatchReservationException.class)
                    .satisfies(e -> {
                        BatchReservationException bre = (BatchReservationException) e;
                        assertEquals("DUPLICATE_COURSE", bre.getDetails().getReason());
                    });
        }

        @Test
        @DisplayName("I05: Sinh viên không tồn tại trong dashboardService ném ResourceNotFoundException")
        void testI05_StudentNotFound_ThrowsResourceNotFoundException() {
            when(dashboardService.resolveStudent("sv_unknown")).thenReturn(null);
            BatchReserveRequest req = new BatchReserveRequest(List.of(10L));

            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv_unknown", req))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Không tìm thấy thông tin sinh viên");
        }

        @Test
        @DisplayName("I06: Lớp học phần không tồn tại ném SECTION_NOT_FOUND")
        void testI06_SectionNotFound_ThrowsBatchReservationException() {
            when(dashboardService.resolveStudent("sv2024001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(10L)).thenReturn(Optional.empty());
            when(classSectionRepository.findById(10L)).thenReturn(Optional.empty());

            BatchReserveRequest req = new BatchReserveRequest(List.of(10L));

            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv2024001", req))
                    .isInstanceOf(BatchReservationException.class)
                    .satisfies(e -> {
                        BatchReservationException bre = (BatchReservationException) e;
                        assertEquals("SECTION_NOT_FOUND", bre.getDetails().getReason());
                    });
        }

        @Test
        @DisplayName("I07: Combo chứa các lớp thuộc cùng môn học ném DUPLICATE_COURSE")
        void testI07_SectionsOfSameCourseInBatch_ThrowsDuplicateCourse() {
            ClassSection s1 = createSection(10L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection s2 = createSection(20L, "S2", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);

            when(dashboardService.resolveStudent("sv2024001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(10L)).thenReturn(Optional.of(s1));
            when(classSectionRepository.findByIdWithLock(20L)).thenReturn(Optional.of(s2));

            BatchReserveRequest req = new BatchReserveRequest(List.of(10L, 20L));

            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv2024001", req))
                    .isInstanceOf(BatchReservationException.class)
                    .satisfies(e -> {
                        BatchReservationException bre = (BatchReservationException) e;
                        assertEquals("DUPLICATE_COURSE", bre.getDetails().getReason());
                    });
        }

        @Test
        @DisplayName("I08: Trạng thái lớp không phải OPEN ném SECTION_CLOSED")
        void testI08_SectionStatusNotOpen_ThrowsSectionClosed() {
            ClassSection sClosed = createSection(10L, "S-CLOSED", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            sClosed.setStatus("CLOSED");

            when(dashboardService.resolveStudent("sv2024001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(10L)).thenReturn(Optional.of(sClosed));

            BatchReserveRequest req = new BatchReserveRequest(List.of(10L));

            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv2024001", req))
                    .isInstanceOf(BatchReservationException.class)
                    .satisfies(e -> {
                        BatchReservationException bre = (BatchReservationException) e;
                        assertEquals("SECTION_CLOSED", bre.getDetails().getReason());
                    });
        }

        @Test
        @DisplayName("I09: Sinh viên đã đăng ký lớp học này ném ALREADY_ENROLLED")
        void testI09_AlreadyEnrolledInSection_ThrowsAlreadyEnrolled() {
            ClassSection s1 = createSection(10L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);

            when(dashboardService.resolveStudent("sv2024001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(10L)).thenReturn(Optional.of(s1));

            Enrollment enr = new Enrollment();
            enr.setStatus("REGISTERED");
            when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 10L)).thenReturn(Optional.of(enr));

            BatchReserveRequest req = new BatchReserveRequest(List.of(10L));

            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv2024001", req))
                    .isInstanceOf(BatchReservationException.class)
                    .satisfies(e -> {
                        BatchReservationException bre = (BatchReservationException) e;
                        assertEquals("ALREADY_ENROLLED", bre.getDetails().getReason());
                    });
        }

        @Test
        @DisplayName("I10: Sinh viên đã hoàn thành môn học ném ALREADY_COMPLETED")
        void testI10_AlreadyCompletedCourse_ThrowsAlreadyCompleted() {
            ClassSection s1 = createSection(10L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);

            when(dashboardService.resolveStudent("sv2024001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(10L)).thenReturn(Optional.of(s1));
            when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 10L)).thenReturn(Optional.empty());

            Enrollment pastCompleted = new Enrollment();
            pastCompleted.setClassSection(s1);
            pastCompleted.setStatus("COMPLETED");
            when(enrollmentRepository.findAllByStudentId(1L)).thenReturn(List.of(pastCompleted));

            BatchReserveRequest req = new BatchReserveRequest(List.of(10L));

            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv2024001", req))
                    .isInstanceOf(BatchReservationException.class)
                    .satisfies(e -> {
                        BatchReservationException bre = (BatchReservationException) e;
                        assertEquals("ALREADY_COMPLETED", bre.getDetails().getReason());
                    });
        }

        @Test
        @DisplayName("I11: Hết chỗ trống (enrolled + holds >= maxCapacity) ném NO_AVAILABLE_SLOTS")
        void testI11_NoAvailableSlots_ThrowsNoAvailableSlots() {
            ClassSection s1 = createSection(10L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 39);

            when(dashboardService.resolveStudent("sv2024001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(10L)).thenReturn(Optional.of(s1));
            when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 10L)).thenReturn(Optional.empty());
            when(enrollmentRepository.findAllByStudentId(1L)).thenReturn(Collections.emptyList());

            when(slotReservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(1L), eq(10L), eq("ACTIVE")))
                    .thenReturn(Optional.empty());
            when(slotReservationRepository.countActiveReservations(eq(10L), any(LocalDateTime.class))).thenReturn(1L);

            BatchReserveRequest req = new BatchReserveRequest(List.of(10L));

            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv2024001", req))
                    .isInstanceOf(BatchReservationException.class)
                    .satisfies(e -> {
                        BatchReservationException bre = (BatchReservationException) e;
                        assertEquals("NO_AVAILABLE_SLOTS", bre.getDetails().getReason());
                    });
        }

        @Test
        @DisplayName("I12: Gia hạn giữ chỗ đã có và tạo mới thành công kèm TransactionSynchronization sau commit")
        void testI12_HoldExtensionAndNewReservation_Success() {
            ClassSection s1 = createSection(10L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 10);

            when(dashboardService.resolveStudent("sv2024001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(10L)).thenReturn(Optional.of(s1));
            when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 10L)).thenReturn(Optional.empty());
            when(enrollmentRepository.findAllByStudentId(1L)).thenReturn(Collections.emptyList());

            SlotReservation existingHold = new SlotReservation(student, s1, 5);
            existingHold.setId(99L);
            existingHold.setReservedAt(LocalDateTime.now().minusMinutes(2));
            existingHold.setExpiresAt(LocalDateTime.now().plusMinutes(3));
            existingHold.setStatus("ACTIVE");

            when(slotReservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(1L), eq(10L), eq("ACTIVE")))
                    .thenReturn(Optional.of(existingHold));
            when(slotReservationRepository.save(any(SlotReservation.class))).thenAnswer(inv -> inv.getArgument(0));

            // Setup Spring TransactionSynchronization
            TransactionSynchronizationManager.initSynchronization();
            TransactionSynchronizationManager.setActualTransactionActive(true);

            try {
                BatchReserveRequest req = new BatchReserveRequest(List.of(10L));
                BatchReserveResponse response = optimizerService.batchReserveSlots("sv2024001", req);

                assertNotNull(response);
                assertEquals(1, response.getSuccessCount());
                assertEquals(0, response.getFailedCount());
                assertEquals(1, response.getReservations().size());

                // Trigger afterCommit
                TransactionSynchronizationUtils.triggerAfterCommit();
                verify(realtimeSeatService).broadcastSeatUpdate(10L);
            } finally {
                TransactionSynchronizationManager.clearSynchronization();
                TransactionSynchronizationManager.setActualTransactionActive(false);
            }
        }
    }

    // =========================================================================
    // Group J: SearchContext and Properties Fallbacks
    // =========================================================================

    @Nested
    @DisplayName("Group J: SearchContext và cấu hình Properties")
    class GroupJ_SearchContextAndHelperClasses {

        @Test
        @DisplayName("J01: Constructor kiểm tra các overload của SmartScheduleOptimizerService")
        void testJ01_ServiceConstructors() {
            SmartScheduleOptimizerService s1 = new SmartScheduleOptimizerService(classSectionRepository, realtimeSeatService);
            assertNotNull(s1);

            ScheduleOptimizerProperties props = new ScheduleOptimizerProperties(100, 1000L, 10);
            SmartScheduleOptimizerService s2 = new SmartScheduleOptimizerService(classSectionRepository, realtimeSeatService, props);
            assertNotNull(s2);

            SmartScheduleOptimizerService s3 = new SmartScheduleOptimizerService(
                    classSectionRepository, realtimeSeatService, slotReservationRepository,
                    enrollmentRepository, dashboardService, null
            );
            assertNotNull(s3);
        }

        @Test
        @DisplayName("J02: SearchContext checkTimeout và isStopped logic")
        void testJ02_SearchContextMethods() {
            SmartScheduleOptimizerService.SearchContext ctx = new SmartScheduleOptimizerService.SearchContext(1000L, 50, 10);
            assertFalse(ctx.isStopped());
            assertFalse(ctx.checkTimeout());

            ctx.nodeLimitExceeded = true;
            assertTrue(ctx.isStopped());

            SmartScheduleOptimizerService.SearchContext ctxTimeout = new SmartScheduleOptimizerService.SearchContext(0L, 50, 10);
            assertTrue(ctxTimeout.checkTimeout());
            assertTrue(ctxTimeout.isStopped());
        }

        @Test
        @DisplayName("J03: SearchContext recordSolution cập nhật bestSolution và bestScore")
        void testJ03_SearchContextRecordSolution() {
            SmartScheduleOptimizerService.SearchContext ctx = new SmartScheduleOptimizerService.SearchContext(1000L, 50, 10);
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);

            ctx.recordSolution(List.of(s1), 80);
            assertEquals(1, ctx.solutions.size());
            assertEquals(80, ctx.bestScore);
            assertSame(s1, ctx.bestSolution.get(0));

            ctx.recordSolution(List.of(s2), 95);
            assertEquals(2, ctx.solutions.size());
            assertEquals(95, ctx.bestScore);
            assertSame(s2, ctx.bestSolution.get(0));
        }

        @Test
        @DisplayName("J04: ScheduleOptimizerProperties đọc từ thuộc tính mặc định")
        void testJ04_PropertiesUsageInOptimizeSchedule() {
            when(properties.getMaxSearchNodes()).thenReturn(20000);
            when(properties.getMaxExecutionTimeMs()).thenReturn(2000L);
            when(properties.getMaxSolutions()).thenReturn(5);

            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1));

            ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
            request.setCourseIds(List.of(101L));

            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);
            assertTrue(response.isSuccess());
        }
    }

    // =========================================================================
    // Group K: Chi tiết các nhánh bổ sung (Branch Coverage Deep Dive >= 90%)
    // =========================================================================

    @Nested
    @DisplayName("Group K: Chi tiết các nhánh bổ sung (Branch Coverage Deep Dive)")
    class GroupK_BranchCoverageDeepDive {

        @Test
        @DisplayName("K01: evaluateScore bao phủ tất cả nhánh shift, compactness, gaps và buffers")
        void testK01_EvaluateScore_ComprehensiveBranches() {
            // 1. null combo
            SmartScheduleOptimizerService.ScoreDetail dNull = optimizerService.evaluateScore(null, null);
            assertEquals(0, dNull.totalScore);

            // 2. null request and avoidDays null
            ClassSection sMorning = createSection(1L, "S1", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            SmartScheduleOptimizerService.ScoreDetail dReqNull = optimizerService.evaluateScore(List.of(sMorning), null);
            assertTrue(dReqNull.totalScore > 0);

            // 3. MORNING with partial morning
            ClassSection sAft = createSection(2L, "S2", course2, "TUE", LocalTime.of(13, 0), LocalTime.of(15, 0), 40, 5);
            ScheduleOptimizerRequest reqMorn = new ScheduleOptimizerRequest();
            reqMorn.setPreferredShift("MORNING");
            SmartScheduleOptimizerService.ScoreDetail dPartialMorn = optimizerService.evaluateScore(List.of(sMorning, sAft), reqMorn);
            assertTrue(dPartialMorn.totalScore > 0);

            // 4. AFTERNOON with 100% afternoon
            ScheduleOptimizerRequest reqAft = new ScheduleOptimizerRequest();
            reqAft.setPreferredShift("AFTERNOON");
            SmartScheduleOptimizerService.ScoreDetail dFullAft = optimizerService.evaluateScore(List.of(sAft), reqAft);
            assertTrue(dFullAft.highlights.stream().anyMatch(h -> h.contains("100% các lớp học thuộc Ca Chiều")));

            // 5. AFTERNOON with partial afternoon
            SmartScheduleOptimizerService.ScoreDetail dPartialAft = optimizerService.evaluateScore(List.of(sMorning, sAft), reqAft);
            assertTrue(dPartialAft.totalScore > 0);

            // 6. COMPACT with uniqueDays = 3 (+12)
            ClassSection sWed = createSection(3L, "S3", course3, "WED", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            ScheduleOptimizerRequest reqCompact = new ScheduleOptimizerRequest();
            reqCompact.setOptimizationGoal("COMPACT");
            SmartScheduleOptimizerService.ScoreDetail d3Days = optimizerService.evaluateScore(List.of(sMorning, sAft, sWed), reqCompact);
            assertTrue(d3Days.highlights.stream().anyMatch(h -> h.contains("Lịch gọn trong 3 ngày/tuần")));

            // 7. BALANCED with overload (3 classes on Monday)
            ClassSection sMon2 = createSection(4L, "S4", course2, "MON", LocalTime.of(10, 15), LocalTime.of(12, 0), 40, 5);
            ClassSection sMon3 = createSection(5L, "S5", course3, "MON", LocalTime.of(13, 0), LocalTime.of(15, 0), 40, 5);
            ScheduleOptimizerRequest reqBal = new ScheduleOptimizerRequest();
            reqBal.setOptimizationGoal("BALANCED");
            SmartScheduleOptimizerService.ScoreDetail dOverload = optimizerService.evaluateScore(List.of(sMorning, sMon2, sMon3), reqBal);
            assertFalse(dOverload.highlights.stream().anyMatch(h -> h.contains("Phân bổ cân bằng")));

            // 8. BALANCED without overload (2 classes on Monday)
            SmartScheduleOptimizerService.ScoreDetail dBalanced = optimizerService.evaluateScore(List.of(sMorning, sMon2), reqBal);
            assertTrue(dBalanced.highlights.stream().anyMatch(h -> h.contains("Phân bổ cân bằng")));

            // 9. plentySeats = false (remaining seats < 5)
            ClassSection sTight = createSection(6L, "S6", course1, "THU", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 38);
            SmartScheduleOptimizerService.ScoreDetail dTight = optimizerService.evaluateScore(List.of(sTight), reqCompact);
            assertFalse(dTight.highlights.stream().anyMatch(h -> h.contains("Chỗ trống an toàn")));

            // 10. section with null dayOfWeek
            ClassSection sNullDay = createSection(7L, "S7", course1, null, LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            SmartScheduleOptimizerService.ScoreDetail dNullDay = optimizerService.evaluateScore(List.of(sNullDay), reqCompact);
            assertEquals(0, dNullDay.uniqueDaysCount);
        }

        @Test
        @DisplayName("K02: selectTopDiversePlans bao phủ nhánh kế hoạch tương đồng và số lượng")
        void testK02_SelectTopDiversePlans_EdgeBranches() {
            // Null scored list
            List<SchedulePlanOption> nullPlans = optimizerService.selectTopDiversePlans(null, null);
            assertTrue(nullPlans.isEmpty());

            ClassSection s1A = createSection(1L, "S1A", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection s1B = createSection(2L, "S1B", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);

            SmartScheduleOptimizerService.ScoreDetail d1 = new SmartScheduleOptimizerService.ScoreDetail(90, 1, List.of("MON"), List.of("H1"));
            SmartScheduleOptimizerService.ScoreDetail d2 = new SmartScheduleOptimizerService.ScoreDetail(85, 1, List.of("MON"), List.of("H2"));

            // Case with identical sections (mostCompact and alternative will be null)
            SmartScheduleOptimizerService.ScoredCombination sc1 = new SmartScheduleOptimizerService.ScoredCombination(List.of(s1A), d1);
            SmartScheduleOptimizerService.ScoredCombination sc2Same = new SmartScheduleOptimizerService.ScoredCombination(List.of(s1A), d2);

            List<SchedulePlanOption> plansOnlyOne = optimizerService.selectTopDiversePlans(List.of(sc1, sc2Same), null);
            assertEquals(1, plansOnlyOne.size());
            assertEquals(96, plansOnlyOne.get(0).getMatchPercentage());

            // Case with 2 distinct combinations (alternative will be null)
            SmartScheduleOptimizerService.ScoredCombination sc2Diff = new SmartScheduleOptimizerService.ScoredCombination(List.of(s1B), d2);
            List<SchedulePlanOption> plansTwo = optimizerService.selectTopDiversePlans(List.of(sc1, sc2Diff), null);
            assertEquals(2, plansTwo.size());
            assertEquals(96, plansTwo.get(0).getMatchPercentage());
            assertEquals(90, plansTwo.get(1).getMatchPercentage());
        }

        @Test
        @DisplayName("K03: optimizeSchedule các nhánh fallback của cấu hình properties và request limits")
        void testK03_OptimizeSchedule_ConfigAndLimitFallbacks() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1));

            // Default properties (null properties passed via constructor fallback)
            SmartScheduleOptimizerService bareService = new SmartScheduleOptimizerService(classSectionRepository, realtimeSeatService);

            ScheduleOptimizerRequest req = new ScheduleOptimizerRequest();
            req.setCourseIds(List.of(101L));
            req.setSemesterName(null); // Triggers semester fallback to "2024-25_SEM2"
            req.setOnlyAvailableSeats(null); // Triggers onlyAvailableSeats fallback to true
            req.setMaxSearchNodes(-1); // Triggers fallback to properties / default
            req.setMaxExecutionTimeMs(-1L); // Triggers fallback to properties / default
            req.setMaxSolutions(-1); // Triggers fallback to properties / default

            ScheduleOptimizerResponse resp = bareService.optimizeSchedule("sv001", req);
            assertTrue(resp.isSuccess());
            assertEquals("2024-25_SEM2", resp.getSemesterName());

            // Whitespace semester
            req.setSemesterName("   ");
            ScheduleOptimizerResponse respWhitespaceSem = bareService.optimizeSchedule("sv001", req);
            assertTrue(respWhitespaceSem.isSuccess());
            assertEquals("2024-25_SEM2", respWhitespaceSem.getSemesterName());
        }

        @Test
        @DisplayName("K04: optimizeSchedule hỗ trợ onlyAvailableSeats = false")
        void testK04_OptimizeSchedule_OnlyAvailableSeatsFalse() {
            ClassSection sFull = createSection(1L, "S-FULL", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 40);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(sFull));

            ScheduleOptimizerRequest req = new ScheduleOptimizerRequest();
            req.setCourseIds(List.of(101L));
            req.setOnlyAvailableSeats(false);

            ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", req);
            assertTrue(resp.isSuccess());
            assertEquals(1, resp.getSchedule().size());
            assertEquals("S-FULL", resp.getSchedule().get(0).getSectionCode());
        }

        @Test
        @DisplayName("K05: optimizeSchedule với section có thông tin Course và Lecturer thiếu sót (Null Safety)")
        void testK05_OptimizeSchedule_MissingCourseAndLecturerFields() {
            Course sparseCourse = new Course();
            sparseCourse.setId(101L);
            sparseCourse.setCourseCode(null);
            sparseCourse.setName(null);
            sparseCourse.setCredits(null);

            ClassSection sparseSec = createSection(1L, "S-SPARSE", sparseCourse, "MON",
                    LocalTime.of(10, 0), LocalTime.of(9, 0), null, null, "OPEN", null, null);
            // End time before start time, but let's make end time valid
            sparseSec.setEndTime(LocalTime.of(12, 0));

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(sparseSec));

            ScheduleOptimizerRequest req = createBaseRequest(List.of(101L));
            ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", req);

            assertTrue(resp.isSuccess());
            assertEquals(1, resp.getSchedule().size());
            assertNull(resp.getSchedule().get(0).getCourseCode());
            assertEquals(3, resp.getTotalCredits());
            assertEquals("", resp.getSchedule().get(0).getLecturerName());
        }

        @Test
        @DisplayName("K06: batchReserveSlots khi dashboardService là null")
        void testK06_BatchReserveSlots_DashboardServiceNull() {
            SmartScheduleOptimizerService bareService = new SmartScheduleOptimizerService(
                    classSectionRepository, realtimeSeatService, slotReservationRepository,
                    enrollmentRepository, null, properties
            );

            ClassSection s1 = createSection(10L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(classSectionRepository.findByIdWithLock(10L)).thenReturn(Optional.of(s1));
            when(slotReservationRepository.save(any(SlotReservation.class))).thenAnswer(inv -> {
                SlotReservation r = inv.getArgument(0);
                r.setId(100L);
                return r;
            });

            // With studentCode != null
            BatchReserveRequest req = new BatchReserveRequest(List.of(10L));
            BatchReserveResponse resp1 = bareService.batchReserveSlots("sv_test_code", req);
            assertNotNull(resp1);
            assertEquals(1, resp1.getSuccessCount());

            // With studentCode == null -> fallback to "sv2024001"
            BatchReserveResponse resp2 = bareService.batchReserveSlots(null, req);
            assertNotNull(resp2);
            assertEquals(1, resp2.getSuccessCount());
        }

        @Test
        @DisplayName("K07: batchReserveSlots khi classSectionRepository tìm thấy bằng findById sau khi findByIdWithLock rỗng")
        void testK07_BatchReserveSlots_FallbackToFindById() {
            ClassSection s1 = createSection(10L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(dashboardService.resolveStudent("sv001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(10L)).thenReturn(Optional.empty());
            when(classSectionRepository.findById(10L)).thenReturn(Optional.of(s1));
            when(slotReservationRepository.save(any(SlotReservation.class))).thenAnswer(inv -> {
                SlotReservation r = inv.getArgument(0);
                r.setId(101L);
                return r;
            });

            BatchReserveRequest req = new BatchReserveRequest(List.of(10L));
            BatchReserveResponse resp = optimizerService.batchReserveSlots("sv001", req);
            assertEquals(1, resp.getSuccessCount());
        }

        @Test
        @DisplayName("K08: batchReserveSlots legacy fallback khi slotReservationRepository là null")
        void testK08_BatchReserveSlots_LegacyFallbackRealtimeSeatService() {
            SmartScheduleOptimizerService legacyService = new SmartScheduleOptimizerService(
                    classSectionRepository, realtimeSeatService
            );

            when(realtimeSeatService.reserveSlot("sv001", 10L)).thenReturn(
                    new SlotReservationResponse(1L, 10L, "S1", "CS101", LocalDateTime.now(), LocalDateTime.now().plusMinutes(5), 300, "RESERVED", "OK")
            );

            BatchReserveRequest req = new BatchReserveRequest(List.of(10L));
            BatchReserveResponse resp = legacyService.batchReserveSlots("sv001", req);

            assertEquals(1, resp.getSuccessCount());
            assertEquals(1, resp.getReservations().size());
        }

        @Test
        @DisplayName("K09: batchReserveSlots sinh viên có đăng ký PENDING bị từ chối ALREADY_ENROLLED")
        void testK09_BatchReserveSlots_PendingEnrollmentRejected() {
            ClassSection s1 = createSection(10L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(dashboardService.resolveStudent("sv001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(10L)).thenReturn(Optional.of(s1));

            Enrollment pendingEnr = new Enrollment();
            pendingEnr.setStatus("PENDING");
            when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 10L)).thenReturn(Optional.of(pendingEnr));

            BatchReserveRequest req = new BatchReserveRequest(List.of(10L));
            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv001", req))
                    .isInstanceOf(BatchReservationException.class)
                    .satisfies(e -> assertEquals("ALREADY_ENROLLED", ((BatchReservationException) e).getDetails().getReason()));
        }

        @Test
        @DisplayName("K10: batchReserveSlots sinh viên có đăng ký PENDING ở lớp khác cùng môn bị từ chối")
        void testK10_BatchReserveSlots_PendingEnrollmentInOtherSectionRejected() {
            ClassSection s1 = createSection(10L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection sOther = createSection(20L, "S-OTHER", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);

            when(dashboardService.resolveStudent("sv001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(10L)).thenReturn(Optional.of(s1));
            when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 10L)).thenReturn(Optional.empty());

            Enrollment otherPending = new Enrollment();
            otherPending.setClassSection(sOther);
            otherPending.setStatus("PENDING");
            when(enrollmentRepository.findAllByStudentId(1L)).thenReturn(List.of(otherPending));

            BatchReserveRequest req = new BatchReserveRequest(List.of(10L));
            assertThatThrownBy(() -> optimizerService.batchReserveSlots("sv001", req))
                    .isInstanceOf(BatchReservationException.class)
                    .satisfies(e -> assertEquals("ALREADY_ENROLLED", ((BatchReservationException) e).getDetails().getReason()));
        }

        @Test
        @DisplayName("K11: batchReserveSlots khi phát sóng SSE gặp lỗi ngoại lệ được log an toàn không crash")
        void testK11_BatchReserveSlots_SseBroadcastExceptionHandled() {
            ClassSection s1 = createSection(10L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(dashboardService.resolveStudent("sv001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(10L)).thenReturn(Optional.of(s1));
            when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 10L)).thenReturn(Optional.empty());
            when(enrollmentRepository.findAllByStudentId(1L)).thenReturn(Collections.emptyList());

            SlotReservation hold = new SlotReservation(student, s1, 5);
            hold.setId(100L);
            hold.setExpiresAt(LocalDateTime.now().plusMinutes(5));
            when(slotReservationRepository.save(any(SlotReservation.class))).thenReturn(hold);

            doThrow(new RuntimeException("SSE network timeout")).when(realtimeSeatService).broadcastSeatUpdate(10L);

            TransactionSynchronizationManager.initSynchronization();
            TransactionSynchronizationManager.setActualTransactionActive(true);

            try {
                BatchReserveRequest req = new BatchReserveRequest(List.of(10L));
                BatchReserveResponse resp = optimizerService.batchReserveSlots("sv001", req);
                assertEquals(1, resp.getSuccessCount());

                // Trigger afterCommit -> catches exception safely
                assertDoesNotThrow(TransactionSynchronizationUtils::triggerAfterCommit);
            } finally {
                TransactionSynchronizationManager.clearSynchronization();
                TransactionSynchronizationManager.setActualTransactionActive(false);
            }
        }

        @Test
        @DisplayName("K12: sortCandidateSections với số lượng <= 1 hoặc request null")
        void testK12_SortCandidateSections_EdgeBranches() {
            // Empty list and single element list
            List<ClassSection> empty = new ArrayList<>();
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            List<ClassSection> single = new ArrayList<>(List.of(s1));

            // With null request and afternoon shift
            ClassSection sAft = createSection(2L, "S2", course1, "MON", LocalTime.of(13, 0), LocalTime.of(15, 0), 40, 5);
            List<ClassSection> two = new ArrayList<>(List.of(s1, sAft));

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(two);

            ScheduleOptimizerRequest reqAft = new ScheduleOptimizerRequest();
            reqAft.setCourseIds(List.of(101L));
            reqAft.setPreferredShift("AFTERNOON");

            ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", reqAft);
            assertTrue(resp.isSuccess());
            assertEquals("S2", resp.getSchedule().get(0).getSectionCode());
        }

        @Test
        @DisplayName("K13: SearchContext kiểm tra isStopped với các điều kiện dừng khác nhau")
        void testK13_SearchContext_IsStoppedConditions() {
            SmartScheduleOptimizerService.SearchContext ctx = new SmartScheduleOptimizerService.SearchContext(5000L, 100, 2);
            assertFalse(ctx.isStopped());

            // 1. timeLimitExceeded
            ctx.timeLimitExceeded = true;
            assertTrue(ctx.isStopped());
            ctx.timeLimitExceeded = false;

            // 2. nodeLimitExceeded
            ctx.nodeLimitExceeded = true;
            assertTrue(ctx.isStopped());
            ctx.nodeLimitExceeded = false;

            // 3. interrupted
            ctx.interrupted = true;
            assertTrue(ctx.isStopped());
            ctx.interrupted = false;

            // 4. solutions size reaches maxSolutions
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ctx.recordSolution(List.of(s1), 90);
            assertFalse(ctx.isStopped());
            ctx.recordSolution(List.of(s1), 85);
            assertTrue(ctx.isStopped(), "Khi đạt maxSolutions = 2 thì isStopped() phải trả về true");
        }
    }

    // =========================================================================
    // Group L: Bao phủ các nhánh chi tiết (Comprehensive Branch Coverage)
    // =========================================================================

    @Nested
    @DisplayName("Group L: Bao phủ các nhánh chi tiết (Comprehensive Branch Coverage)")
    class GroupL_ComprehensiveBranchCoverage {

        @Test
        @DisplayName("L01: hasTimeCollision bao phủ tất cả nhánh phủ định và biên")
        void testL01_HasTimeCollision_EdgeBranches() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            ClassSection sEmptyDay = createSection(2L, "S2", course2, "", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            ClassSection sUnknownDay = createSection(3L, "S3", course2, "UNKNOWN_DAY_1", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
            ClassSection sOtherUnknownDay = createSection(4L, "S4", course2, "UNKNOWN_DAY_2", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);

            assertFalse(optimizerService.hasTimeCollision(sEmptyDay, s1));
            assertFalse(optimizerService.hasTimeCollision(s1, sEmptyDay));
            assertFalse(optimizerService.hasTimeCollision(sUnknownDay, sOtherUnknownDay));

            // Start / End null branches
            ClassSection sNullStartA = createSection(5L, "S5", course1, "MON", null, LocalTime.of(10, 0), 40, 5);
            ClassSection sNullEndA = createSection(6L, "S6", course1, "MON", LocalTime.of(8, 0), null, 40, 5);
            ClassSection sNullStartB = createSection(7L, "S7", course2, "MON", null, LocalTime.of(10, 0), 40, 5);
            ClassSection sNullEndB = createSection(8L, "S8", course2, "MON", LocalTime.of(8, 0), null, 40, 5);

            assertFalse(optimizerService.hasTimeCollision(sNullStartA, s1));
            assertFalse(optimizerService.hasTimeCollision(sNullEndA, s1));
            assertFalse(optimizerService.hasTimeCollision(s1, sNullStartB));
            assertFalse(optimizerService.hasTimeCollision(s1, sNullEndB));

            // Inverted times
            ClassSection sInvertedA = createSection(9L, "S9", course1, "MON", LocalTime.of(11, 0), LocalTime.of(10, 0), 40, 5);
            ClassSection sInvertedB = createSection(10L, "S10", course2, "MON", LocalTime.of(11, 0), LocalTime.of(10, 0), 40, 5);
            assertFalse(optimizerService.hasTimeCollision(sInvertedA, s1));
            assertFalse(optimizerService.hasTimeCollision(s1, sInvertedB));
        }

        @Test
        @DisplayName("L02: toScheduleItemDto bao phủ tất cả trường null và fallback period")
        void testL02_ToScheduleItemDto_NullAndFallbackFields() {
            ClassSection csNoCourse = createSection(1L, "SEC-NOCOURSE", null, "MON", LocalTime.of(14, 0), LocalTime.of(16, 0), 40, 5);
            ClassSection csNoLec = createSection(2L, "SEC-NOLEC", course1, "TUE", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5, "OPEN", "Room B", null);
            LecturerProfile lecNoUser = new LecturerProfile();
            lecNoUser.setId(99L);
            ClassSection csLecNoUser = createSection(3L, "SEC-LECNOUSER", course1, "WED", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5, "OPEN", "Room B", lecNoUser);
            ClassSection csSparse = createSection(4L, "SEC-SPARSE", course1, null, null, null, 40, 5, "OPEN", null, null);
            ClassSection csInvertedPeriod = createSection(5L, "SEC-INVPERIOD", course1, "THU", LocalTime.of(10, 25), LocalTime.of(7, 30), 40, 5);

            SmartScheduleOptimizerService.ScoreDetail detail = new SmartScheduleOptimizerService.ScoreDetail(90, 1, List.of("MON"), List.of());
            List<SchedulePlanOption> plans = optimizerService.selectTopDiversePlans(
                    List.of(new SmartScheduleOptimizerService.ScoredCombination(List.of(csNoCourse, csNoLec, csLecNoUser, csSparse, csInvertedPeriod), detail)),
                    null
            );
            assertFalse(plans.isEmpty());
            assertEquals(5, plans.get(0).getSections().size());
        }

        @Test
        @DisplayName("L03: optimizeSchedule các ngày học đa dạng SUN, SAT")
        void testL03_OptimizeSchedule_SundayAndSaturdayVariants() {
            String[] sundayVariants = {"CN", "SUN", "SUNDAY", "Chủ Nhật", "Chu Nhat", "8"};
            for (int i = 0; i < sundayVariants.length; i++) {
                ClassSection sec = createSection((long) (i + 1), "SEC-SUN-" + i, course1, sundayVariants[i],
                        LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
                when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                        .thenReturn(List.of(sec));

                ScheduleOptimizerRequest req = createBaseRequest(List.of(101L));
                ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", req);
                assertTrue(resp.isSuccess());
                assertEquals("SUN", resp.getPlans().get(0).getStudyDays().get(0));
            }

            String[] satVariants = {"7", "SAT", "Thứ 7", "Thứ Bảy"};
            for (int i = 0; i < satVariants.length; i++) {
                ClassSection sec = createSection((long) (10 + i), "SEC-SAT-" + i, course1, satVariants[i],
                        LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
                when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                        .thenReturn(List.of(sec));

                ScheduleOptimizerRequest req = createBaseRequest(List.of(101L));
                ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", req);
                assertTrue(resp.isSuccess());
                assertEquals("SAT", resp.getPlans().get(0).getStudyDays().get(0));
            }
        }

        @Test
        @DisplayName("L04: batchReserveSlots các nhánh phụ thuộc Course null, enrollment status khác nhau")
        void testL04_BatchReserveSlots_NullCourseAndDiverseEnrollmentStatuses() {
            ClassSection s1 = createSection(50L, "S50", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), null, null);
            when(dashboardService.resolveStudent("sv001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(50L)).thenReturn(Optional.of(s1));

            Enrollment dropped = new Enrollment();
            dropped.setStatus("DROPPED");
            when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 50L)).thenReturn(Optional.of(dropped));

            // allStudentEnrollments with null course, null classSection
            Enrollment nullSecEnr = new Enrollment();
            nullSecEnr.setClassSection(null);
            Enrollment nullCourseEnr = new Enrollment();
            ClassSection dummySec = new ClassSection();
            dummySec.setCourse(null);
            nullCourseEnr.setClassSection(dummySec);

            when(enrollmentRepository.findAllByStudentId(1L)).thenReturn(List.of(nullSecEnr, nullCourseEnr));
            when(slotReservationRepository.save(any(SlotReservation.class))).thenAnswer(inv -> {
                SlotReservation r = inv.getArgument(0);
                r.setId(500L);
                return r;
            });

            BatchReserveRequest req = new BatchReserveRequest(List.of(50L));
            BatchReserveResponse resp = optimizerService.batchReserveSlots("sv001", req);
            assertEquals(1, resp.getSuccessCount());
        }

        @Test
        @DisplayName("L04b: batchReserveSlots khi section có Course là null")
        void testL04b_BatchReserveSlots_NullCourse() {
            ClassSection sNoCourse = new ClassSection();
            sNoCourse.setId(60L);
            sNoCourse.setSectionCode("SEC-NO-COURSE");
            sNoCourse.setStatus("OPEN");
            sNoCourse.setMaxCapacity(null);
            sNoCourse.setCurrentEnrolled(null);

            when(dashboardService.resolveStudent("sv001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(60L)).thenReturn(Optional.of(sNoCourse));
            when(slotReservationRepository.save(any(SlotReservation.class))).thenAnswer(inv -> {
                SlotReservation r = inv.getArgument(0);
                r.setId(600L);
                return r;
            });

            BatchReserveRequest req = new BatchReserveRequest(List.of(60L));
            BatchReserveResponse resp = optimizerService.batchReserveSlots("sv001", req);
            assertEquals(1, resp.getSuccessCount());
        }

        @Test
        @DisplayName("L05: Properties limits <= 0 fallback to defaults")
        void testL05_PropertiesLimitsZeroFallback() {
            ScheduleOptimizerProperties zeroProps = new ScheduleOptimizerProperties(0, 0L, 0);
            SmartScheduleOptimizerService serviceZero = new SmartScheduleOptimizerService(
                    classSectionRepository, realtimeSeatService, zeroProps
            );

            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(s1));

            ScheduleOptimizerRequest req = new ScheduleOptimizerRequest();
            req.setCourseIds(List.of(101L));

            ScheduleOptimizerResponse resp = serviceZero.optimizeSchedule("sv001", req);
            assertTrue(resp.isSuccess());
        }

        @Test
        @DisplayName("L06: SearchContext 2-arg constructor và timeout nhánh isInterrupted")
        void testL06_SearchContext_InterruptedTimeout() {
            SmartScheduleOptimizerService.SearchContext ctx = new SmartScheduleOptimizerService.SearchContext(System.nanoTime(), 1000L, 50, 10);
            assertFalse(ctx.checkTimeout());

            Thread.currentThread().interrupt();
            try {
                assertTrue(ctx.checkTimeout());
                assertTrue(ctx.interrupted);
                assertTrue(ctx.isStopped());
            } finally {
                Thread.interrupted(); // clear
            }
        }

        @Test
        @DisplayName("L07: sortCandidateSections bao phủ mọi tổ hợp avoid days, shifts và seat bounds")
        void testL07_SortCandidateSections_AllPermutations() {
            ClassSection secA = createSection(1L, "SA", course1, null, LocalTime.of(8, 0), LocalTime.of(10, 0), null, null);
            ClassSection secB = createSection(2L, "SB", course1, "SAT", LocalTime.of(13, 0), LocalTime.of(15, 0), 40, 39);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(secA, secB));

            // 1. With preferredShift MORNING
            ScheduleOptimizerRequest reqMorn = createBaseRequest(List.of(101L));
            reqMorn.setPreferredShift("MORNING");
            reqMorn.setAvoidDays(List.of("SAT", "SUN"));
            ScheduleOptimizerResponse resp1 = optimizerService.optimizeSchedule("sv001", reqMorn);
            assertTrue(resp1.isSuccess());

            // 2. With preferredShift AFTERNOON
            ScheduleOptimizerRequest reqAft = createBaseRequest(List.of(101L));
            reqAft.setPreferredShift("AFTERNOON");
            reqAft.setAvoidDays(Collections.emptyList());
            ScheduleOptimizerResponse resp2 = optimizerService.optimizeSchedule("sv001", reqAft);
            assertTrue(resp2.isSuccess());
        }

        @Test
        @DisplayName("L08: batchReserveSlots khi enrollmentRepository và classSectionRepository là null")
        void testL08_BatchReserveSlots_NullRepositories() {
            // bare service without enrollmentRepository
            SmartScheduleOptimizerService noEnrService = new SmartScheduleOptimizerService(
                    classSectionRepository, realtimeSeatService, slotReservationRepository,
                    null, dashboardService, properties
            );

            ClassSection s1 = createSection(10L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(dashboardService.resolveStudent("sv001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(10L)).thenReturn(Optional.of(s1));
            when(slotReservationRepository.save(any(SlotReservation.class))).thenAnswer(inv -> {
                SlotReservation r = inv.getArgument(0);
                r.setId(700L);
                return r;
            });

            BatchReserveRequest req = new BatchReserveRequest(List.of(10L));
            BatchReserveResponse resp = noEnrService.batchReserveSlots("sv001", req);
            assertEquals(1, resp.getSuccessCount());

            // bare service without classSectionRepository
            SmartScheduleOptimizerService noCsService = new SmartScheduleOptimizerService(
                    null, realtimeSeatService, slotReservationRepository,
                    null, dashboardService, properties
            );
            assertThatThrownBy(() -> noCsService.batchReserveSlots("sv001", req))
                    .isInstanceOf(BatchReservationException.class)
                    .satisfies(e -> assertEquals("SECTION_NOT_FOUND", ((BatchReservationException) e).getDetails().getReason()));
        }

        @Test
        @DisplayName("L09: activeSections lọc các lớp có status null và normalizeDay thành công")
        void testL09_ActiveSections_NullStatusAndCustomDays() {
            ClassSection secNullStatus = createSection(1L, "S-NULLSTATUS", course1, "THU", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5, null, "Room A", lecturer);
            ClassSection secFri = createSection(2L, "S-FRI", course1, "FRI", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(secNullStatus, secFri));

            ScheduleOptimizerRequest req = createBaseRequest(List.of(101L));
            ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", req);
            assertTrue(resp.isSuccess());
        }
    }

    // =========================================================================
    // Group M: Bao phủ vi mô các nhánh điều kiện (Micro Branch Coverage)
    // =========================================================================

    @Nested
    @DisplayName("Group M: Bao phủ vi mô các nhánh điều kiện (Micro Branch Coverage)")
    class GroupM_MicroBranchCoverage {

        @Test
        @DisplayName("M01: selectTopDiversePlans bao phủ mọi nhánh isSameSections và kích thước khác nhau")
        void testM01_DiversePlans_DifferentSizesAndIdenticalCheck() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection s3 = createSection(3L, "S3", course3, "WED", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);

            SmartScheduleOptimizerService.ScoreDetail d1 = new SmartScheduleOptimizerService.ScoreDetail(95, 1, List.of("MON"), List.of("H1"));
            SmartScheduleOptimizerService.ScoreDetail d2 = new SmartScheduleOptimizerService.ScoreDetail(90, 2, List.of("MON", "TUE"), List.of("H2"));
            SmartScheduleOptimizerService.ScoreDetail d3 = new SmartScheduleOptimizerService.ScoreDetail(85, 3, List.of("MON", "TUE", "WED"), List.of("H3"));

            SmartScheduleOptimizerService.ScoredCombination sc1 = new SmartScheduleOptimizerService.ScoredCombination(List.of(s1), d1);
            SmartScheduleOptimizerService.ScoredCombination sc2DiffSize = new SmartScheduleOptimizerService.ScoredCombination(List.of(s1, s2), d2);
            SmartScheduleOptimizerService.ScoredCombination sc3DiffSize = new SmartScheduleOptimizerService.ScoredCombination(List.of(s1, s2, s3), d3);

            List<SchedulePlanOption> plans = optimizerService.selectTopDiversePlans(List.of(sc1, sc2DiffSize, sc3DiffSize), null);
            assertEquals(3, plans.size());
            assertEquals(96, plans.get(0).getMatchPercentage());
            assertEquals(90, plans.get(1).getMatchPercentage());
            assertEquals(85, plans.get(2).getMatchPercentage());
        }

        @Test
        @DisplayName("M02: evaluateScore bao phủ MAX_FREE_DAYS và UNKNOWN goal")
        void testM02_EvaluateScore_MaxFreeDaysAndUnknownGoal() {
            ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection s2 = createSection(2L, "S2", course2, "MON", LocalTime.of(9, 30), LocalTime.of(11, 30), 40, 5);

            // MAX_FREE_DAYS (covers line 1098 second condition)
            ScheduleOptimizerRequest reqFreeDays = new ScheduleOptimizerRequest();
            reqFreeDays.setOptimizationGoal("MAX_FREE_DAYS");
            SmartScheduleOptimizerService.ScoreDetail dFree = optimizerService.evaluateScore(List.of(s1, s2), reqFreeDays);
            assertTrue(dFree.highlights.stream().anyMatch(h -> h.contains("Lịch cực kỳ gọn")));

            // UNKNOWN goal (covers line 1098 false, line 1114 false)
            ScheduleOptimizerRequest reqUnknown = new ScheduleOptimizerRequest();
            reqUnknown.setOptimizationGoal("UNKNOWN_GOAL");
            SmartScheduleOptimizerService.ScoreDetail dUnknown = optimizerService.evaluateScore(List.of(s1, s2), reqUnknown);
            assertTrue(dUnknown.totalScore >= 30);
        }

        @Test
        @DisplayName("M03: evaluateScore bao phủ các nhánh s.getDayOfWeek() null, startTime null, endTime null trong gaps")
        void testM03_EvaluateScore_NullFieldsInComboGaps() {
            ClassSection sNullEnd = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), null, 40, 5);
            ClassSection sNullStart = createSection(2L, "S2", course2, "MON", null, LocalTime.of(12, 0), 40, 5);
            ClassSection sValid1 = createSection(3L, "S3", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection sValid2 = createSection(4L, "S4", course2, "TUE", LocalTime.of(9, 30), LocalTime.of(11, 30), 40, 5);

            ScheduleOptimizerRequest req = new ScheduleOptimizerRequest();
            req.setOptimizationGoal("COMPACT");

            SmartScheduleOptimizerService.ScoreDetail d = optimizerService.evaluateScore(
                    List.of(sNullEnd, sNullStart, sValid1, sValid2), req
            );
            assertNotNull(d);
        }

        @Test
        @DisplayName("M04: batchReserveSlots khi cả slotReservationRepository và realtimeSeatService đều là null")
        void testM04_BatchReserveSlots_BothRepositoriesNull() {
            SmartScheduleOptimizerService bare = new SmartScheduleOptimizerService(
                    classSectionRepository, null, null, null, dashboardService, properties
            );

            when(dashboardService.resolveStudent("sv001")).thenReturn(student);

            BatchReserveRequest req = new BatchReserveRequest(List.of(77L));
            BatchReserveResponse resp = bare.batchReserveSlots("sv001", req);
            assertNotNull(resp);
            assertEquals(1, resp.getSuccessCount());
            assertTrue(resp.getReservations().isEmpty());
        }

        @Test
        @DisplayName("M05: CourseTarget constructor với candidateSections null")
        void testM05_CourseTarget_NullCandidates() {
            SmartScheduleOptimizerService.CourseTarget target = new SmartScheduleOptimizerService.CourseTarget(
                    101L, "CS101", "Name", 3, null
            );
            assertNotNull(target.candidateSections);
            assertTrue(target.candidateSections.isEmpty());
        }

        @Test
        @DisplayName("M06: toScheduleItemDto và toDto khi section có Course null hoặc credits null")
        void testM06_ScheduleItemDto_NullCreditsAndNullCourse() {
            Course cNoCredits = new Course();
            cNoCredits.setId(101L);
            cNoCredits.setCourseCode("CS101");
            cNoCredits.setName("Name");
            cNoCredits.setCredits(null);

            ClassSection sec = createSection(1L, "SEC1", cNoCredits, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(sec));

            ScheduleOptimizerRequest req = createBaseRequest(List.of(101L));
            ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", req);

            assertTrue(resp.isSuccess());
            assertEquals(3, resp.getTotalCredits());
            assertEquals(3, resp.getSchedule().get(0).getCredits());
        }

        @Test
        @DisplayName("M07: optimizeSchedule khi properties là null hoàn toàn trong constructor")
        void testM07_OptimizeSchedule_NullPropertiesConstructor() {
            SmartScheduleOptimizerService nullPropsService = new SmartScheduleOptimizerService(
                    classSectionRepository, realtimeSeatService, slotReservationRepository,
                    enrollmentRepository, dashboardService, null
            );

            ClassSection sec = createSection(1L, "SEC1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(sec));

            ScheduleOptimizerRequest req = new ScheduleOptimizerRequest();
            req.setCourseIds(List.of(101L));

            ScheduleOptimizerResponse resp = nullPropsService.optimizeSchedule("sv001", req);
            assertTrue(resp.isSuccess());
        }

        @Test
        @DisplayName("M08: dayOfWeekToInt kiểm tra các thứ trong tuần và giá trị không xác định")
        void testM08_DayOfWeekToInt_AllSwitchCases() {
            String[] days = {"Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật", "UNKNOWN_XYZ"};
            for (int i = 0; i < days.length; i++) {
                ClassSection sec = createSection((long) (i + 1), "S" + i, course1, days[i],
                        LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
                when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                        .thenReturn(List.of(sec));

                ScheduleOptimizerRequest req = createBaseRequest(List.of(101L));
                ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", req);
                assertTrue(resp.isSuccess());
                assertNotNull(resp.getSchedule().get(0));
            }
        }

        @Test
        @DisplayName("M09: sortCandidateSections kiểm tra mọi nhánh ưu tiên ca, ngày tránh và sĩ số")
        void testM09_SortCandidateSections_AllBranches() {
            // Case 1: shift = MORNING, avoid = MON
            ClassSection sec1 = createSection(1L, "SEC1", course1, "MON", LocalTime.of(13, 0), LocalTime.of(15, 0), 40, 38); // avoid, afternoon, low seats (<5)
            ClassSection sec2 = createSection(2L, "SEC2", course1, "TUE", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 10);  // good day, morning, plenty seats (>=5)
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(sec1, sec2));

            ScheduleOptimizerRequest req1 = createBaseRequest(List.of(101L));
            req1.setPreferredShift("MORNING");
            req1.setAvoidDays(List.of("MON"));
            ScheduleOptimizerResponse resp1 = optimizerService.optimizeSchedule("sv001", req1);
            assertTrue(resp1.isSuccess());
            assertEquals("SEC2", resp1.getSchedule().get(0).getSectionCode());

            // Case 2: shift = AFTERNOON, avoid = TUE
            ScheduleOptimizerRequest req2 = createBaseRequest(List.of(101L));
            req2.setPreferredShift("AFTERNOON");
            req2.setAvoidDays(List.of("TUE"));
            ScheduleOptimizerResponse resp2 = optimizerService.optimizeSchedule("sv001", req2);
            assertTrue(resp2.isSuccess());
            assertEquals("SEC1", resp2.getSchedule().get(0).getSectionCode());

            // Case 3: shift = null, avoidDays = null, section with null properties
            ClassSection sec3 = new ClassSection();
            sec3.setId(3L);
            sec3.setSectionCode("SEC3");
            sec3.setCourse(course1);
            sec3.setDayOfWeek(null);
            sec3.setMaxCapacity(null);
            sec3.setCurrentEnrolled(null);
            sec3.setStartTime(LocalTime.of(7, 0));
            sec3.setEndTime(LocalTime.of(9, 0));

            ClassSection sec4 = createSection(4L, "SEC4", course1, "WED", LocalTime.of(9, 0), LocalTime.of(11, 0), 30, 29); // low seats
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(sec3, sec4));

            ScheduleOptimizerRequest req3 = createBaseRequest(List.of(101L));
            req3.setPreferredShift(null);
            req3.setAvoidDays(null);
            ScheduleOptimizerResponse resp3 = optimizerService.optimizeSchedule("sv001", req3);
            assertTrue(resp3.isSuccess());
        }

        @Test
        @DisplayName("M10: toScheduleItemDto bao phủ nhánh endPeriod < startPeriod, null user, null course properties")
        void testM10_ToScheduleItemDto_EdgeCases() {
            // secA: start at 07:45 (period 2), end at 08:20 (period 1) -> endPeriod < startPeriod -> endPeriod = startPeriod = 2
            ClassSection secA = createSection(1L, "SECA", course1, "MON", LocalTime.of(7, 45), LocalTime.of(8, 20), 40, 5);
            LecturerProfile lecWithoutUser = new LecturerProfile();
            lecWithoutUser.setId(99L);
            lecWithoutUser.setUser(null);
            secA.setLecturer(lecWithoutUser);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(secA));

            ScheduleOptimizerRequest req = createBaseRequest(List.of(101L));
            ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", req);
            assertTrue(resp.isSuccess());
            ScheduleItemDto item = resp.getSchedule().get(0);
            assertEquals(2, item.getStartPeriod());
            assertEquals(2, item.getEndPeriod());
            assertEquals(item.getStartPeriod(), item.getEndPeriod());
            assertEquals("", item.getLecturerName());

            // secB: course with null credits, null roomName
            Course courseWithNullCredits = new Course();
            courseWithNullCredits.setId(102L);
            courseWithNullCredits.setCourseCode("CS102_NULL");
            courseWithNullCredits.setName("Course Null Credits");
            courseWithNullCredits.setCredits(null);

            ClassSection secB = createSection(2L, "SECB", courseWithNullCredits, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            secB.setRoomName(null);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(secB));

            ScheduleOptimizerRequest reqB = createBaseRequest(List.of(102L));
            ScheduleOptimizerResponse respB = optimizerService.optimizeSchedule("sv001", reqB);
            assertTrue(respB.isSuccess());
            ScheduleItemDto itemB = respB.getSchedule().get(0);
            assertEquals(3, itemB.getCredits()); // defaults to 3
            assertEquals("", itemB.getRoomName());
        }

        @Test
        @DisplayName("M11: solveWithMrv với maxSolutions = 1 kích hoạt dừng sớm và nhánh isStopped()")
        void testM11_SolveWithMrv_MaxSolutions_Pruning() {
            ClassSection c1s1 = createSection(1L, "C1S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection c1s2 = createSection(2L, "C1S2", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection c1s3 = createSection(3L, "C1S3", course1, "WED", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);

            ClassSection c2s1 = createSection(4L, "C2S1", course2, "THU", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection c2s2 = createSection(5L, "C2S2", course2, "FRI", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection c2s3 = createSection(6L, "C2S3", course2, "SAT", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(c1s1, c1s2, c1s3, c2s1, c2s2, c2s3));

            ScheduleOptimizerRequest req = createBaseRequest(List.of(101L, 102L));
            req.setMaxSolutions(1);

            ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", req);
            assertTrue(resp.isSuccess());
            assertEquals(1, resp.getTotalSolutions());
        }

        @Test
        @DisplayName("M12: evaluateScore bao phủ phân nhánh điểm số, tỷ lệ ca sáng/chiều, uniqueDaysCount == 4 và gap dài")
        void testM12_EvaluateScore_Branches_ScoreClamp_UniqueDays4_Balanced() {
            // Combo rỗng
            SmartScheduleOptimizerService.ScoreDetail emptyScore = optimizerService.evaluateScore(Collections.emptyList(), null);
            assertEquals(0, emptyScore.totalScore);
            assertEquals(0, emptyScore.uniqueDaysCount);

            // Shift MORNING với 1 sáng, 1 chiều (tỷ lệ 50%)
            ClassSection sMorning = createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 0);
            ClassSection sAfternoon = createSection(2L, "S2", course2, "TUE", LocalTime.of(13, 0), LocalTime.of(15, 0), 40, 0);
            ScheduleOptimizerRequest morningReq = createBaseRequest(List.of(101L, 102L));
            morningReq.setPreferredShift("MORNING");
            SmartScheduleOptimizerService.ScoreDetail mornScore = optimizerService.evaluateScore(List.of(sMorning, sAfternoon), morningReq);
            assertTrue(mornScore.totalScore > 0);

            // Shift AFTERNOON với 1 sáng, 1 chiều (tỷ lệ 50%)
            ScheduleOptimizerRequest aftReq = createBaseRequest(List.of(101L, 102L));
            aftReq.setPreferredShift("AFTERNOON");
            SmartScheduleOptimizerService.ScoreDetail aftScore = optimizerService.evaluateScore(List.of(sMorning, sAfternoon), aftReq);
            assertTrue(aftScore.totalScore > 0);

            // BALANCED với quá tải (3 lớp cùng 1 ngày)
            ClassSection sMon1 = createSection(3L, "S3", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 0);
            ClassSection sMon2 = createSection(4L, "S4", course2, "MON", LocalTime.of(9, 0), LocalTime.of(11, 0), 40, 0);
            ClassSection sMon3 = createSection(5L, "S5", course3, "MON", LocalTime.of(13, 0), LocalTime.of(15, 0), 40, 0);
            ScheduleOptimizerRequest balReq = createBaseRequest(List.of(101L, 102L, 103L));
            balReq.setOptimizationGoal("BALANCED");
            SmartScheduleOptimizerService.ScoreDetail balOverloadScore = optimizerService.evaluateScore(List.of(sMon1, sMon2, sMon3), balReq);
            assertFalse(balOverloadScore.highlights.contains("Phân bổ cân bằng, tối đa 2 lớp/ngày không gây quá tải"));

            // COMPACT với uniqueDaysCount == 4 (MON, TUE, WED, THU)
            Course course4 = new Course();
            course4.setId(104L);
            course4.setCourseCode("CS104");
            ClassSection sWed = createSection(6L, "S6", course3, "WED", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 0);
            ClassSection sThu = createSection(7L, "S7", course4, "THU", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 0);
            ScheduleOptimizerRequest comp4Req = createBaseRequest(List.of(101L, 102L, 103L, 104L));
            comp4Req.setOptimizationGoal("COMPACT");
            SmartScheduleOptimizerService.ScoreDetail comp4Score = optimizerService.evaluateScore(List.of(sMorning, sAfternoon, sWed, sThu), comp4Req);
            assertEquals(4, comp4Score.uniqueDaysCount);

            // COMPACT với Long Gap (>150 phút) trên cùng 1 ngày
            ClassSection sGap1 = createSection(8L, "S8", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 0);
            ClassSection sGap2 = createSection(9L, "S9", course2, "MON", LocalTime.of(15, 0), LocalTime.of(17, 0), 40, 0);
            SmartScheduleOptimizerService.ScoreDetail gapScore = optimizerService.evaluateScore(List.of(sGap1, sGap2), comp4Req);
            assertFalse(gapScore.highlights.contains("Không có tiết trống kéo dài giữa các ca"));

            // CheckLongGaps với section có null dayOfWeek hoặc null startTime hoặc null endTime
            ClassSection sNullTime1 = new ClassSection();
            sNullTime1.setId(10L);
            sNullTime1.setDayOfWeek("MON");
            sNullTime1.setStartTime(LocalTime.of(7, 0));
            sNullTime1.setEndTime(null);

            ClassSection sNullTime2 = new ClassSection();
            sNullTime2.setId(11L);
            sNullTime2.setDayOfWeek("MON");
            sNullTime2.setStartTime(LocalTime.of(9, 0));
            sNullTime2.setEndTime(LocalTime.of(11, 0));

            SmartScheduleOptimizerService.ScoreDetail nullTimeScore = optimizerService.evaluateScore(List.of(sNullTime1, sNullTime2), comp4Req);
            assertNotNull(nullTimeScore);
        }

        @Test
        @DisplayName("M13: selectTopDiversePlans, isSameSections và createPlanOption bao phủ các nhánh phụ")
        void testM13_SelectTopDiversePlans_IsSameSections_AndToDto() {
            // Null hoặc empty scored combinations
            List<SchedulePlanOption> pEmpty = optimizerService.selectTopDiversePlans(Collections.emptyList(), null);
            assertTrue(pEmpty.isEmpty());

            List<SchedulePlanOption> pNull = optimizerService.selectTopDiversePlans(null, null);
            assertTrue(pNull.isEmpty());

            // Combination có section không có course hoặc credits null
            ClassSection secNoCourse = new ClassSection();
            secNoCourse.setId(1L);
            secNoCourse.setSectionCode("SEC_NC");
            secNoCourse.setDayOfWeek("MON");
            secNoCourse.setStartTime(null);
            secNoCourse.setEndTime(null);

            ClassSection secNullCredits = new ClassSection();
            secNullCredits.setId(2L);
            secNullCredits.setSectionCode("SEC_NCRED");
            secNullCredits.setDayOfWeek("TUE");
            Course cNullCred = new Course();
            cNullCred.setId(200L);
            cNullCred.setCourseCode("NC200");
            cNullCred.setName("Null Credits Course");
            cNullCred.setCredits(null);
            secNullCredits.setCourse(cNullCred);

            SmartScheduleOptimizerService.ScoreDetail scDetail = new SmartScheduleOptimizerService.ScoreDetail(
                    90, 2, List.of("MON", "TUE"), List.of("Highlight 1")
            );
            SmartScheduleOptimizerService.ScoredCombination sc = new SmartScheduleOptimizerService.ScoredCombination(
                    List.of(secNoCourse, secNullCredits), scDetail
            );

            List<SchedulePlanOption> plans = optimizerService.selectTopDiversePlans(List.of(sc), null);
            assertEquals(1, plans.size());
            assertEquals(6, plans.get(0).getTotalCredits()); // 3 + 3
        }

        @Test
        @DisplayName("M14: SearchContext bao phủ checkTimeout khi timeLimitExceeded = true, recordSolution điểm thấp hơn")
        void testM14_SearchContext_AllBranches() {
            SmartScheduleOptimizerService.SearchContext ctx = new SmartScheduleOptimizerService.SearchContext(1000, 100, 5);
            assertFalse(ctx.isStopped());

            // record first solution
            List<ClassSection> sol1 = List.of(createSection(1L, "S1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 0));
            ctx.recordSolution(sol1, 80);
            assertEquals(80, ctx.bestScore);
            assertEquals(sol1, ctx.bestSolution);

            // record solution with higher score
            List<ClassSection> sol2 = List.of(createSection(2L, "S2", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 0));
            ctx.recordSolution(sol2, 90);
            assertEquals(90, ctx.bestScore);
            assertEquals(sol2, ctx.bestSolution);

            // record solution with lower score
            List<ClassSection> sol3 = List.of(createSection(3L, "S3", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 0));
            ctx.recordSolution(sol3, 70);
            assertEquals(90, ctx.bestScore); // does not change
            assertEquals(sol2, ctx.bestSolution);

            // checkTimeout when already timeLimitExceeded
            ctx.timeLimitExceeded = true;
            assertTrue(ctx.checkTimeout());
            assertTrue(ctx.isStopped());

            // isStopped with nodeLimitExceeded
            SmartScheduleOptimizerService.SearchContext ctx2 = new SmartScheduleOptimizerService.SearchContext(1000, 100, 5);
            ctx2.nodeLimitExceeded = true;
            assertTrue(ctx2.isStopped());

            // isStopped with interrupted
            SmartScheduleOptimizerService.SearchContext ctx3 = new SmartScheduleOptimizerService.SearchContext(1000, 100, 5);
            ctx3.interrupted = true;
            assertTrue(ctx3.isStopped());
        }

        @Test
        @DisplayName("M15: Search interrupted trả về OptimizationStatus.TIME_LIMIT_EXCEEDED")
        void testM15_SearchInterrupted_OptimizationStatusTimeLimitExceeded() {
            ClassSection sec1 = createSection(1L, "SEC1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection sec2 = createSection(2L, "SEC2", course2, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5); // conflict
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(sec1, sec2));

            ScheduleOptimizerRequest req = createBaseRequest(List.of(101L, 102L));

            try {
                Thread.currentThread().interrupt();
                ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", req);
                assertFalse(resp.isSuccess());
                assertEquals(OptimizationStatus.TIME_LIMIT_EXCEEDED, resp.getStatus());
                assertTrue(resp.getStatusMessage().contains("ngắt an toàn"));
            } finally {
                // Đảm bảo xóa cờ ngắt thread để không ảnh hưởng các test khác
                Thread.interrupted();
            }
        }

        @Test
        @DisplayName("M16: batchReserveSlots bao phủ fallback findById khi findByIdWithLock trả về empty")
        void testM16_BatchReserve_FindByIdWithLock_FallbackToFindById() {
            ClassSection sec1 = createSection(1L, "SEC1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(dashboardService.resolveStudent("sv001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(1L)).thenReturn(Optional.empty());
            when(classSectionRepository.findById(1L)).thenReturn(Optional.of(sec1));
            when(enrollmentRepository.findByStudentIdAndClassSectionId(student.getId(), 1L)).thenReturn(Optional.empty());
            when(enrollmentRepository.findAllByStudentId(student.getId())).thenReturn(Collections.emptyList());
            when(slotReservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(student.getId()), eq(1L), eq("ACTIVE")))
                    .thenReturn(Optional.empty());
            when(slotReservationRepository.countActiveReservations(eq(1L), any(LocalDateTime.class))).thenReturn(0L);
            when(slotReservationRepository.save(any(SlotReservation.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            BatchReserveRequest req = new BatchReserveRequest(List.of(1L));
            BatchReserveResponse resp = optimizerService.batchReserveSlots("sv001", req);
            assertNotNull(resp);
            assertEquals(1, resp.getSuccessCount());
        }

        @Test
        @DisplayName("M17: batchReserveSlots xử lý ngoại lệ trong afterCommit broadcastSeatUpdate mà không throw lỗi")
        void testM17_BatchReserve_AfterCommit_ExceptionLogging() {
            TransactionSynchronizationManager.initSynchronization();
            TransactionSynchronizationManager.setActualTransactionActive(true);

            try {
                ClassSection sec1 = createSection(1L, "SEC1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
                when(dashboardService.resolveStudent("sv001")).thenReturn(student);
                when(classSectionRepository.findByIdWithLock(1L)).thenReturn(Optional.of(sec1));
                when(enrollmentRepository.findByStudentIdAndClassSectionId(student.getId(), 1L)).thenReturn(Optional.empty());
                when(enrollmentRepository.findAllByStudentId(student.getId())).thenReturn(Collections.emptyList());
                when(slotReservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(student.getId()), eq(1L), eq("ACTIVE")))
                        .thenReturn(Optional.empty());
                when(slotReservationRepository.countActiveReservations(eq(1L), any(LocalDateTime.class))).thenReturn(0L);
                when(slotReservationRepository.save(any(SlotReservation.class)))
                        .thenAnswer(inv -> inv.getArgument(0));

                doThrow(new RuntimeException("Simulated SSE network failure"))
                        .when(realtimeSeatService).broadcastSeatUpdate(1L);

                BatchReserveRequest req = new BatchReserveRequest(List.of(1L));
                BatchReserveResponse resp = optimizerService.batchReserveSlots("sv001", req);
                assertNotNull(resp);

                // Kích hoạt afterCommit thủ công
                for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
                    sync.afterCommit();
                }
                verify(realtimeSeatService).broadcastSeatUpdate(1L);
            } finally {
                TransactionSynchronizationManager.clearSynchronization();
                TransactionSynchronizationManager.setActualTransactionActive(false);
            }
        }

        @Test
        @DisplayName("M18: normalizeDay bao phủ toàn bộ các token thứ trong tuần theo chuẩn tiếng Việt và tiếng Anh")
        void testM18_NormalizeDay_AllTokens() {
            String[] tokens = {
                    "2", "MON", "MONDAY", "HAI", "THỨ HAI",
                    "3", "TUE", "TUESDAY", "BA", "THỨ BA",
                    "4", "WED", "WEDNESDAY", "TƯ", "TU",
                    "5", "THU", "THURSDAY", "NĂM", "NAM",
                    "6", "FRI", "FRIDAY", "SÁU", "SAU",
                    "7", "SAT", "BẢY", "BAY",
                    "CN", "SUN", "SUNDAY", "CHỦ", "CHU", "8",
                    "UNKNOWN_DAY"
            };

            for (long i = 0; i < tokens.length; i++) {
                ClassSection sec1 = createSection(i + 1, "S1_" + i, course1, tokens[(int) i], LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
                ClassSection sec2 = createSection(i + 100, "S2_" + i, course2, tokens[(int) i], LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
                // Kiểm tra hasTimeCollision
                boolean coll = optimizerService.hasTimeCollision(sec1, sec2);
                if (!"UNKNOWN_DAY".equals(tokens[(int) i])) {
                    assertTrue(coll, "Failed for token: " + tokens[(int) i]);
                } else {
                    // Cả 2 cùng mang "UNKNOWN_DAY" nên normalizeDay trả về "UNKNOWN_DAY" giống nhau -> cũng va chạm
                    assertTrue(coll);
                }
            }
        }
    }

    @Nested
    @DisplayName("Group N: Đạt chỉ tiêu Branch Coverage >= 90% (Targeted Branch Coverage)")
    class GroupN_TargetedBranchCoverage {

        @Test
        @DisplayName("N01: properties có giá trị <= 0 kích hoạt fallback sang hằng số mặc định")
        void testN01_PropertiesZeroOrNegative_FallsBackToDefaults() {
            when(properties.getMaxSearchNodes()).thenReturn(0);
            when(properties.getMaxExecutionTimeMs()).thenReturn(0L);
            when(properties.getMaxSolutions()).thenReturn(0);

            ClassSection sec = createSection(1L, "SEC1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(sec));

            ScheduleOptimizerRequest req = new ScheduleOptimizerRequest();
            req.setCourseIds(List.of(101L));
            req.setMaxSearchNodes(null);
            req.setMaxExecutionTimeMs(null);
            req.setMaxSolutions(null);

            ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", req);
            assertTrue(resp.isSuccess());
        }

        @Test
        @DisplayName("N02: sortCandidateSections bao phủ avoidDays rỗng, ca học lạ và capacity/enrolled null")
        void testN02_SortCandidateSections_EmptyAvoidDays_UnknownShift_NullCapAndEnrolled() {
            // secA với maxCapacity = null, currentEnrolled = null
            ClassSection secA = createSection(1L, "SECA", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            secA.setMaxCapacity(null);
            secA.setCurrentEnrolled(null);

            // secB với maxCapacity = 40, currentEnrolled = 38 (available < 5)
            ClassSection secB = createSection(2L, "SECB", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 38);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(secA, secB));

            ScheduleOptimizerRequest req = createBaseRequest(List.of(101L));
            req.setAvoidDays(new ArrayList<>()); // Empty list -> !avoidDays.isEmpty() là false
            req.setPreferredShift("EVENING_OR_UNKNOWN"); // Ca lạ -> cả MORNING và AFTERNOON đều false

            ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", req);
            assertTrue(resp.isSuccess());

            // Đổi ngược vị trí: secA có available < 5, secB có null cap/enrolled
            secA.setMaxCapacity(40);
            secA.setCurrentEnrolled(38);
            secB.setMaxCapacity(null);
            secB.setCurrentEnrolled(null);

            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(secA, secB));
            ScheduleOptimizerResponse resp2 = optimizerService.optimizeSchedule("sv001", req);
            assertTrue(resp2.isSuccess());
        }

        @Test
        @DisplayName("N03: batchReserveSlots bao phủ course.getId() == null, enrollment status PENDING và DROPPED")
        void testN03_BatchReserve_CourseNullId_PendingEnrollment_DroppedEnrollment() {
            // Case 1: sec có course != null nhưng course.getId() == null
            ClassSection secNoCourseId = createSection(1L, "SEC1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            Course cNullId = new Course();
            cNullId.setId(null);
            cNullId.setCourseCode("CNULL");
            cNullId.setName("Course Null ID");
            secNoCourseId.setCourse(cNullId);

            when(dashboardService.resolveStudent("sv001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(1L)).thenReturn(Optional.of(secNoCourseId));
            when(enrollmentRepository.findByStudentIdAndClassSectionId(student.getId(), 1L)).thenReturn(Optional.empty());
            when(slotReservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(student.getId()), eq(1L), eq("ACTIVE")))
                    .thenReturn(Optional.empty());
            when(slotReservationRepository.countActiveReservations(eq(1L), any(LocalDateTime.class))).thenReturn(0L);
            when(slotReservationRepository.save(any(SlotReservation.class))).thenAnswer(inv -> inv.getArgument(0));

            BatchReserveRequest req1 = new BatchReserveRequest(List.of(1L));
            BatchReserveResponse resp1 = optimizerService.batchReserveSlots("sv001", req1);
            assertNotNull(resp1);

            // Case 2: enrollment status là PENDING -> ném ALREADY_ENROLLED
            ClassSection secNormal = createSection(2L, "SEC2", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(classSectionRepository.findByIdWithLock(2L)).thenReturn(Optional.of(secNormal));

            Enrollment pendingEnrollment = new Enrollment();
            pendingEnrollment.setId(10L);
            pendingEnrollment.setClassSection(secNormal);
            pendingEnrollment.setStatus("PENDING");

            when(enrollmentRepository.findByStudentIdAndClassSectionId(student.getId(), 2L)).thenReturn(Optional.empty());
            when(enrollmentRepository.findAllByStudentId(student.getId())).thenReturn(List.of(pendingEnrollment));

            BatchReserveRequest req2 = new BatchReserveRequest(List.of(2L));
            BatchReservationException ex2 = assertThrows(BatchReservationException.class,
                    () -> optimizerService.batchReserveSlots("sv001", req2));
            assertEquals("ALREADY_ENROLLED", ex2.getDetails().getReason());

            // Case 3: enrollment status là DROPPED hoặc FAILED -> không ném lỗi ALREADY_ENROLLED hoặc ALREADY_COMPLETED
            Enrollment droppedEnrollment = new Enrollment();
            droppedEnrollment.setId(11L);
            droppedEnrollment.setClassSection(secNormal);
            droppedEnrollment.setStatus("DROPPED");

            when(enrollmentRepository.findAllByStudentId(student.getId())).thenReturn(List.of(droppedEnrollment));
            when(slotReservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(student.getId()), eq(2L), eq("ACTIVE")))
                    .thenReturn(Optional.empty());
            when(slotReservationRepository.countActiveReservations(eq(2L), any(LocalDateTime.class))).thenReturn(0L);

            BatchReserveResponse resp3 = optimizerService.batchReserveSlots("sv001", req2);
            assertNotNull(resp3);
        }

        @Test
        @DisplayName("N04: selectTopDiversePlans bao phủ mostCompact == null và isSameSections với null/kích thước khác nhau")
        void testN04_SelectTopDiversePlans_IdenticalCombinations_MostCompactNull() {
            ClassSection sec1 = createSection(1L, "SEC1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection sec2 = createSection(2L, "SEC2", course2, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);

            SmartScheduleOptimizerService.ScoreDetail detail = new SmartScheduleOptimizerService.ScoreDetail(
                    90, 1, List.of("MON"), List.of("Highlight")
            );

            // Hai tổ hợp giống hệt nhau -> mostCompact sẽ là null vì lọc !isSameSections ra rỗng
            SmartScheduleOptimizerService.ScoredCombination sc1 = new SmartScheduleOptimizerService.ScoredCombination(
                    List.of(sec1), detail
            );
            SmartScheduleOptimizerService.ScoredCombination sc1Duplicate = new SmartScheduleOptimizerService.ScoredCombination(
                    List.of(sec1), detail
            );

            List<SchedulePlanOption> plans = optimizerService.selectTopDiversePlans(List.of(sc1, sc1Duplicate), null);
            // Chỉ có 1 phương án duy nhất (Plan 1) vì không có tổ hợp khác cho Plan 2 và Plan 3
            assertEquals(1, plans.size());

            // Tổ hợp với danh sách sections có kích thước khác nhau hoặc null
            SmartScheduleOptimizerService.ScoreDetail detailCompact = new SmartScheduleOptimizerService.ScoreDetail(
                    95, 1, List.of("TUE"), List.of("Compact")
            );
            SmartScheduleOptimizerService.ScoreDetail detailAlternative = new SmartScheduleOptimizerService.ScoreDetail(
                    85, 3, List.of("MON", "TUE"), List.of("Alternative")
            );
            SmartScheduleOptimizerService.ScoreDetail detailNullSec = new SmartScheduleOptimizerService.ScoreDetail(
                    80, 99, List.of("MON"), List.of("NullSections")
            );

            SmartScheduleOptimizerService.ScoredCombination sc2Compact = new SmartScheduleOptimizerService.ScoredCombination(
                    List.of(sec2), detailCompact
            );
            SmartScheduleOptimizerService.ScoredCombination sc3DiffSize = new SmartScheduleOptimizerService.ScoredCombination(
                    List.of(sec1, sec2), detailAlternative
            );
            SmartScheduleOptimizerService.ScoredCombination scNullSections = new SmartScheduleOptimizerService.ScoredCombination(
                    null, detailNullSec
            );

            List<SchedulePlanOption> plansWithDiff = optimizerService.selectTopDiversePlans(
                    List.of(sc1, sc2Compact, sc3DiffSize, scNullSections), null
            );
            assertEquals(3, plansWithDiff.size());
        }

        @Test
        @DisplayName("N05: evaluateScore bao phủ goal null, section không có dayOfWeek, endTime null, startTime null")
        void testN05_EvaluateScore_NullGoal_NullDayOfWeek_NullStartEndTime() {
            // Goal == null -> mặc định là COMPACT
            ScheduleOptimizerRequest reqNullGoal = createBaseRequest(List.of(101L));
            reqNullGoal.setOptimizationGoal(null);

            ClassSection secNormal = createSection(1L, "SEC1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            SmartScheduleOptimizerService.ScoreDetail detail1 = optimizerService.evaluateScore(List.of(secNormal), reqNullGoal);
            assertNotNull(detail1);

            // Section có dayOfWeek == null trong mục tiêu BALANCED
            ClassSection secNoDay = createSection(2L, "SEC2", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            secNoDay.setDayOfWeek(null);

            ScheduleOptimizerRequest reqBalanced = createBaseRequest(List.of(101L));
            reqBalanced.setOptimizationGoal("BALANCED");
            SmartScheduleOptimizerService.ScoreDetail detail2 = optimizerService.evaluateScore(List.of(secNoDay), reqBalanced);
            assertNotNull(detail2);

            // isMorning với section có endTime == null (trả về true)
            ClassSection secNoEndTime = createSection(3L, "SEC3", course1, "MON", LocalTime.of(7, 0), null, 40, 5);
            secNoEndTime.setEndTime(null);
            ScheduleOptimizerRequest reqMorning = createBaseRequest(List.of(101L));
            reqMorning.setPreferredShift("MORNING");
            SmartScheduleOptimizerService.ScoreDetail detail3 = optimizerService.evaluateScore(List.of(secNoEndTime), reqMorning);
            assertTrue(detail3.highlights.contains("100% các lớp học thuộc Ca Sáng"));

            // isAfternoon với section có startTime == null (trả về false)
            ClassSection secNoStartTime = createSection(4L, "SEC4", course1, "MON", null, LocalTime.of(15, 0), 40, 5);
            secNoStartTime.setStartTime(null);
            ScheduleOptimizerRequest reqAfternoon = createBaseRequest(List.of(101L));
            reqAfternoon.setPreferredShift("AFTERNOON");
            SmartScheduleOptimizerService.ScoreDetail detail4 = optimizerService.evaluateScore(List.of(secNoStartTime), reqAfternoon);
            assertFalse(detail4.highlights.contains("100% các lớp học thuộc Ca Chiều"));
        }

        @Test
        @DisplayName("N06: optimizeSchedule lọc section có dayOfWeek chỉ gồm khoảng trắng")
        void testN06_FilterWhitespaceDayOfWeek() {
            ClassSection secWhitespace = createSection(1L, "SEC1", course1, "   ", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                    .thenReturn(List.of(secWhitespace));

            ScheduleOptimizerRequest req = createBaseRequest(List.of(101L));
            ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv001", req);
            assertFalse(resp.isSuccess());
            assertEquals(OptimizationStatus.NO_SOLUTION, resp.getStatus());
        }

        @Test
        @DisplayName("N07: batchReserveSlots bao phủ danh sách enrollment chứa section null, course null và khác môn")
        void testN07_BatchReserve_DiverseEnrollmentsInHistory() {
            ClassSection sec = createSection(1L, "SEC1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            when(dashboardService.resolveStudent("sv001")).thenReturn(student);
            when(classSectionRepository.findByIdWithLock(1L)).thenReturn(Optional.of(sec));
            when(enrollmentRepository.findByStudentIdAndClassSectionId(student.getId(), 1L)).thenReturn(Optional.empty());

            Enrollment eNullSec = new Enrollment();
            eNullSec.setId(101L);
            eNullSec.setClassSection(null);

            Enrollment eNullCourse = new Enrollment();
            eNullCourse.setId(102L);
            ClassSection secNoCourse = new ClassSection();
            secNoCourse.setCourse(null);
            eNullCourse.setClassSection(secNoCourse);

            Enrollment eDiffCourse = new Enrollment();
            eDiffCourse.setId(103L);
            ClassSection secDiffCourse = new ClassSection();
            Course diffCourse = new Course();
            diffCourse.setId(9999L);
            secDiffCourse.setCourse(diffCourse);
            eDiffCourse.setClassSection(secDiffCourse);

            when(enrollmentRepository.findAllByStudentId(student.getId()))
                    .thenReturn(List.of(eNullSec, eNullCourse, eDiffCourse));
            when(slotReservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(student.getId()), eq(1L), eq("ACTIVE")))
                    .thenReturn(Optional.empty());
            when(slotReservationRepository.countActiveReservations(eq(1L), any(LocalDateTime.class))).thenReturn(0L);
            when(slotReservationRepository.save(any(SlotReservation.class))).thenAnswer(inv -> inv.getArgument(0));

            BatchReserveRequest req = new BatchReserveRequest(List.of(1L));
            BatchReserveResponse resp = optimizerService.batchReserveSlots("sv001", req);
            assertNotNull(resp);
            assertEquals(1, resp.getSuccessCount());
        }

        @Test
        @DisplayName("N08: selectTopDiversePlans bao phủ nhánh loại bỏ tổ hợp trùng với mostCompact khi chọn Plan 3")
        void testN08_SelectTopDiversePlans_FilterOutDuplicateOfMostCompact() {
            ClassSection sec1 = createSection(1L, "SEC1", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection sec2 = createSection(2L, "SEC2", course2, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);
            ClassSection sec3 = createSection(3L, "SEC3", course3, "WED", LocalTime.of(7, 0), LocalTime.of(9, 0), 40, 5);

            SmartScheduleOptimizerService.ScoreDetail d1 = new SmartScheduleOptimizerService.ScoreDetail(95, 2, List.of("MON"), List.of("H1"));
            SmartScheduleOptimizerService.ScoreDetail d2 = new SmartScheduleOptimizerService.ScoreDetail(90, 1, List.of("TUE"), List.of("H2"));
            SmartScheduleOptimizerService.ScoreDetail d3 = new SmartScheduleOptimizerService.ScoreDetail(85, 3, List.of("WED"), List.of("H3"));

            SmartScheduleOptimizerService.ScoredCombination scBest = new SmartScheduleOptimizerService.ScoredCombination(List.of(sec1), d1);
            SmartScheduleOptimizerService.ScoredCombination scCompact = new SmartScheduleOptimizerService.ScoredCombination(List.of(sec2), d2);
            SmartScheduleOptimizerService.ScoredCombination scCompactDup = new SmartScheduleOptimizerService.ScoredCombination(List.of(sec2), d2); // trùng sec2
            SmartScheduleOptimizerService.ScoredCombination scAlt = new SmartScheduleOptimizerService.ScoredCombination(List.of(sec3), d3);

            List<SchedulePlanOption> plans = optimizerService.selectTopDiversePlans(
                    List.of(scBest, scCompact, scCompactDup, scAlt), null
            );
            assertEquals(3, plans.size());
            assertEquals("Phương án 3: Dự phòng tối ưu", plans.get(2).getTitle());
        }
    }
}

