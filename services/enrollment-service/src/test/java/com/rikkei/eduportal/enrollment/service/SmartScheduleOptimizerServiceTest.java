package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.*;
import com.rikkei.eduportal.enrollment.entity.ClassSection;
import com.rikkei.eduportal.enrollment.entity.Course;
import com.rikkei.eduportal.enrollment.entity.LecturerProfile;
import com.rikkei.eduportal.enrollment.entity.User;
import com.rikkei.eduportal.enrollment.repository.ClassSectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Test Suite: AI CSP Schedule Optimizer (SmartScheduleOptimizerService)")
class SmartScheduleOptimizerServiceTest {

    @Mock
    private ClassSectionRepository classSectionRepository;

    @Mock
    private RealtimeSeatService realtimeSeatService;

    @InjectMocks
    private SmartScheduleOptimizerService optimizerService;

    private Course course1;
    private Course course2;
    private Course course3;
    private LecturerProfile lecturer;

    @BeforeEach
    void setUp() {
        course1 = new Course();
        course1.setId(101L);
        course1.setCourseCode("CS101");
        course1.setName("Introduction to Programming");
        course1.setCredits(3);
        course1.setWeeklyHours(3);

        course2 = new Course();
        course2.setId(102L);
        course2.setCourseCode("CS102");
        course2.setName("Object Oriented Programming");
        course2.setCredits(3);
        course2.setWeeklyHours(3);

        course3 = new Course();
        course3.setId(103L);
        course3.setCourseCode("CS103");
        course3.setName("Data Structures and Algorithms");
        course3.setCredits(4);
        course3.setWeeklyHours(4);

        User user = new User();
        user.setId(1L);
        user.setFullName("Nguyen Van Giảng Viên");

        lecturer = new LecturerProfile();
        lecturer.setId(1L);
        lecturer.setUser(user);
    }

    private ClassSection createSection(Long id, String code, Course course, String day,
                                       LocalTime start, LocalTime end, int maxCap, int enrolled) {
        ClassSection cs = new ClassSection();
        cs.setId(id);
        cs.setSectionCode(code);
        cs.setCourse(course);
        cs.setLecturer(lecturer);
        cs.setSemesterName("2024-25_SEM2");
        cs.setDayOfWeek(day);
        cs.setStartTime(start);
        cs.setEndTime(end);
        cs.setRoomName("Room A-101");
        cs.setMaxCapacity(maxCap);
        cs.setCurrentEnrolled(enrolled);
        cs.setStatus("OPEN");
        return cs;
    }

    @Test
    @DisplayName("TC-OPT-01: Kiểm tra xung đột thời gian hai lớp học phần (Interval Collision)")
    void testTimeCollisionLogic() {
        // Cùng Thứ 2: 09:00 - 10:30 và 10:00 - 11:30 (Trùng nhau 30 phút -> Xung đột)
        ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 10);
        ClassSection s2 = createSection(2L, "S2", course2, "MON", LocalTime.of(10, 0), LocalTime.of(11, 30), 40, 10);
        assertTrue(optimizerService.hasTimeCollision(s1, s2));

        // Cùng Thứ 2: 09:00 - 10:30 và 10:30 - 12:00 (Nối tiếp nhau, không giao khoảng -> Không xung đột)
        ClassSection s3 = createSection(3L, "S3", course2, "MON", LocalTime.of(10, 30), LocalTime.of(12, 0), 40, 10);
        assertFalse(optimizerService.hasTimeCollision(s1, s3));

        // Khác ngày: MON 09:00 - 10:30 và TUE 09:00 - 10:30 -> Không xung đột
        ClassSection s4 = createSection(4L, "S4", course2, "TUE", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 10);
        assertFalse(optimizerService.hasTimeCollision(s1, s4));
    }

    @Test
    @DisplayName("TC-OPT-02: optimizeSchedule với danh sách môn rỗng trả về thông báo hợp lệ không văng lỗi")
    void testOptimizeSchedule_EmptyCourses_ReturnsEarly() {
        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(new ArrayList<>());

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);
        assertNotNull(response);
        assertFalse(response.isSuccess());
        assertEquals(0, response.getPlans().size());
        assertTrue(response.getStatusMessage().contains("ít nhất một môn học"));
    }

    @Test
    @DisplayName("TC-OPT-03: CSP Backtracking giải thành công tổ hợp không trùng lịch")
    void testOptimizeSchedule_SolvesNonConflictingCombination() {
        // Course 1 có 2 lớp: S1A (Thứ 2, 9h) và S1B (Thứ 3, 9h)
        ClassSection s1A = createSection(1L, "S1A", course1, "MON", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 10);
        ClassSection s1B = createSection(2L, "S1B", course1, "TUE", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 10);

        // Course 2 có 1 lớp: S2A (Thứ 2, 9h -> Xung đột với S1A)
        ClassSection s2A = createSection(3L, "S2A", course2, "MON", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 10);

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(Arrays.asList(s1A, s1B, s2A));

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(Arrays.asList(101L, 102L));
        request.setSemesterName("2024-25_SEM2");
        request.setOptimizationGoal("COMPACT");

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertTrue(response.getIsComplete());
        assertEquals(1, response.getValidOptionsCount());
        assertEquals(1, response.getPlans().size());
        assertEquals(2, response.getSchedule().size());

        // Phương án hợp lệ duy nhất phải là S1B (TUE) ghép với S2A (MON)
        SchedulePlanOption plan = response.getPlans().get(0);
        List<ClassSectionDto> sections = plan.getSections();
        assertEquals(2, sections.size());
        assertTrue(sections.stream().anyMatch(s -> s.getSectionCode().equals("S1B")));
        assertTrue(sections.stream().anyMatch(s -> s.getSectionCode().equals("S2A")));
    }

    @Test
    @DisplayName("TC-OPT-04: Đánh giá điểm ưu tiên Tránh ngày học (Avoid Days)")
    void testOptimizeSchedule_AvoidDaysPreference() {
        // S1: Thứ 7 (Học ngày cuối tuần)
        ClassSection s1 = createSection(1L, "S1-SAT", course1, "SAT", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 5);
        // S2: Thứ 2 (Ngày trong tuần)
        ClassSection s2 = createSection(2L, "S2-MON", course1, "MON", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 5);

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(Arrays.asList(s1, s2));

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(List.of(101L));
        request.setAvoidDays(List.of("SAT", "SUN"));

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

        assertNotNull(response);
        assertTrue(response.getPlans().size() >= 1);
        SchedulePlanOption topPlan = response.getPlans().get(0);
        assertEquals("S2-MON", topPlan.getSections().get(0).getSectionCode());
        assertTrue(topPlan.getHighlights().stream().anyMatch(h -> h.contains("Tránh thành công")));
    }

    @Test
    @DisplayName("TC-OPT-05: 1-Click Batch Reserve giữ chỗ thành công các lớp học phần trong gói")
    void testBatchReserveSlots_Success() {
        SlotReservationResponse r1 = new SlotReservationResponse(1L, 10L, "CS101-01", "Introduction to Programming",
                LocalDateTime.now(), LocalDateTime.now().plusMinutes(5), 300, "RESERVED", "Giữ chỗ thành công");
        SlotReservationResponse r2 = new SlotReservationResponse(2L, 20L, "CS102-01", "Object Oriented Programming",
                LocalDateTime.now(), LocalDateTime.now().plusMinutes(5), 300, "RESERVED", "Giữ chỗ thành công");

        when(realtimeSeatService.reserveSlot("sv2024001", 10L)).thenReturn(r1);
        when(realtimeSeatService.reserveSlot("sv2024001", 20L)).thenReturn(r2);

        BatchReserveRequest req = new BatchReserveRequest(Arrays.asList(10L, 20L));
        BatchReserveResponse response = optimizerService.batchReserveSlots("sv2024001", req);

        assertNotNull(response);
        assertEquals(2, response.getSuccessCount());
        assertEquals(0, response.getFailedCount());
        assertEquals(2, response.getReservations().size());
    }

    @Test
    @DisplayName("TC-OPT-06: Xung đột khung giờ 100% -> Tuyệt đối không crash HTTP 500, trả về NO_SOLUTION với recommendations rỗng")
    void testOptimizeSchedule_100PercentConflict_TriggersPartialFallback() {
        // CS101 và CS102 chỉ có duy nhất 1 lớp và trùng giờ hoàn toàn vào Thứ 2 09:00 - 10:30
        ClassSection s1 = createSection(1L, "CS101-01", course1, "MON", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 10);
        ClassSection s2 = createSection(2L, "CS102-01", course2, "MON", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 10);

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(Arrays.asList(s1, s2));

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(Arrays.asList(101L, 102L));
        request.setSemesterName("2024-25_SEM2");

        // Chạy thuật toán không được văng Exception
        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

        assertNotNull(response);
        assertFalse(response.isSuccess(), "API phải trả về success: false khi không tìm được phương án");
        assertFalse(response.getIsComplete(), "isComplete phải là false");
        assertEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
        assertEquals(0, response.getSchedule().size(), "Schedule phải là danh sách rỗng");
        assertEquals(0, response.getPlans().size(), "Plans phải là danh sách rỗng");
        assertEquals(2, response.getUnassignedCourses().size(), "Cả 2 môn đều được ghi nhận lý do xung đột");
        assertTrue(response.getStatusMessage().contains("Xung đột") || response.getStatusMessage().contains("xung đột"));
        assertNotNull(response.getConflictDetails());
    }

    @Test
    @DisplayName("TC-OPT-07: Có môn không còn lớp mở hoặc hết chỗ -> Trả về NO_SOLUTION và ghi nhận môn không có lớp khả dụng")
    void testOptimizeSchedule_CourseWithNoOpenSections() {
        // CS101 có 1 lớp mở
        ClassSection s1 = createSection(1L, "CS101-01", course1, "MON", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 10);
        // CS102 KHÔNG có lớp nào mở trong repository

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(List.of(s1));

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(Arrays.asList(101L, 102L));
        request.setSemesterName("2024-25_SEM2");

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

        assertNotNull(response);
        assertFalse(response.isSuccess());
        assertFalse(response.getIsComplete());
        assertEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
        assertEquals(0, response.getSchedule().size());
        assertEquals(0, response.getPlans().size());

        assertEquals(1, response.getUnassignedCourses().size());
        UnassignedCourseDto unassigned = response.getUnassignedCourses().get(0);
        assertTrue(unassigned.getReason().contains("Không có lớp học phần nào mở"));
    }

    @Test
    @DisplayName("TC-OPT-08: Lọc bỏ lớp học phần đã hết chỗ khi onlyAvailableSeats = true")
    void testOptimizeSchedule_FilterOutFullSections() {
        // CS101 có lớp đã đầy (40/40)
        ClassSection s1Full = createSection(1L, "CS101-FULL", course1, "MON", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 40);
        // CS101 có lớp còn chỗ (15/40)
        ClassSection s1Open = createSection(2L, "CS101-OPEN", course1, "TUE", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 15);

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(Arrays.asList(s1Full, s1Open));

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(List.of(101L));
        request.setOnlyAvailableSeats(true);

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertEquals(1, response.getSchedule().size());
        assertEquals("CS101-OPEN", response.getSchedule().get(0).getSectionCode());
    }

    @Test
    @DisplayName("TC-OPT-09: Thời gian thực thi không vượt quá 2.5s và trả về executionTimeMs chính xác")
    void testOptimizeSchedule_ExecutionTimeReported() {
        ClassSection s1 = createSection(1L, "CS101-01", course1, "MON", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 10);
        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(List.of(s1));

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(List.of(101L));

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

        assertNotNull(response);
        assertTrue(response.getExecutionTimeMs() >= 0);
        assertTrue(response.getExecutionTimeMs() <= 2500, "Thời gian thực thi phải <= 2500ms");
    }

    @Test
    @DisplayName("TC-OPT-10: buildCollisionMatrix xây dựng ma trận kiểm tra xung đột thời gian O(N^2)")
    void testBuildCollisionMatrix_IdentifiesConflictsCorrectly() {
        ClassSection s1 = createSection(1L, "S1", course1, "MON", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 5);
        ClassSection s2 = createSection(2L, "S2", course2, "MON", LocalTime.of(10, 0), LocalTime.of(11, 30), 40, 5); // Overlap with S1
        ClassSection s3 = createSection(3L, "S3", course2, "MON", LocalTime.of(10, 30), LocalTime.of(12, 0), 40, 5); // Adjacent to S1, no overlap
        ClassSection s4 = createSection(4L, "S4", course2, "TUE", LocalTime.of(9, 0), LocalTime.of(10, 30), 40, 5); // Different day

        List<ClassSection> sections = List.of(s1, s2, s3, s4);
        boolean[][] matrix = optimizerService.buildCollisionMatrix(sections);

        assertEquals(4, matrix.length);
        assertEquals(4, matrix[0].length);

        // s1 vs s2: Trùng giờ Thứ 2 -> true
        assertTrue(matrix[0][1]);
        assertTrue(matrix[1][0]);

        // s1 vs s3: Liền kề Thứ 2 (10:30) -> false
        assertFalse(matrix[0][2]);
        assertFalse(matrix[2][0]);

        // s1 vs s4: Khác thứ -> false
        assertFalse(matrix[0][3]);
        assertFalse(matrix[3][0]);
    }

    @Test
    @DisplayName("TC-OPT-11: Trả về Top 3 phương án thời khóa biểu đa dạng chuẩn hóa (96%, 90%, 85%)")
    void testOptimizeSchedule_Top3DiversePlans_YieldsCalibratedTiers() {
        // Tạo 3 lớp cho Course 1 và 2 lớp cho Course 2 để sinh nhiều tổ hợp
        ClassSection s1A = createSection(1L, "S1A", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
        ClassSection s1B = createSection(2L, "S1B", course1, "MON", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 5);
        ClassSection s1C = createSection(3L, "S1C", course1, "WED", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

        ClassSection s2A = createSection(4L, "S2A", course2, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
        ClassSection s2B = createSection(5L, "S2B", course2, "THU", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(Arrays.asList(s1A, s1B, s1C, s2A, s2B));

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(Arrays.asList(101L, 102L));
        request.setSemesterName("2024-25_SEM2");
        request.setPreferredShift("MORNING");
        request.setAvoidDays(List.of("SAT", "SUN"));

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

        assertNotNull(response);
        assertEquals(3, response.getPlans().size());

        SchedulePlanOption p1 = response.getPlans().get(0);
        SchedulePlanOption p2 = response.getPlans().get(1);
        SchedulePlanOption p3 = response.getPlans().get(2);

        assertEquals(96, p1.getMatchPercentage());
        assertEquals(90, p2.getMatchPercentage());
        assertEquals(85, p3.getMatchPercentage());

        assertTrue(p1.getTitle().contains("Phương án 1"));
        assertTrue(p2.getTitle().contains("Phương án 2"));
        assertTrue(p3.getTitle().contains("Phương án 3"));
    }

    @Test
    @DisplayName("TC-OPT-12: Ưu tiên Ca Sáng (Preferred Shift MORNING)")
    void testOptimizeSchedule_PreferredMorningShift() {
        // Lớp S1: Ca Sáng (07:00 - 09:15)
        ClassSection s1Morning = createSection(1L, "S1-MORN", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 5);
        // Lớp S2: Ca Chiều (13:00 - 15:15)
        ClassSection s2Afternoon = createSection(2L, "S2-AFT", course1, "TUE", LocalTime.of(13, 0), LocalTime.of(15, 15), 40, 5);

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(Arrays.asList(s1Morning, s2Afternoon));

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(List.of(101L));
        request.setPreferredShift("MORNING");

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

        assertNotNull(response);
        assertTrue(response.getPlans().size() >= 1);
        SchedulePlanOption topPlan = response.getPlans().get(0);
        assertEquals("S1-MORN", topPlan.getSections().get(0).getSectionCode());
        assertTrue(topPlan.getHighlights().stream().anyMatch(h -> h.contains("Ca Sáng")));
    }

    @Test
    @DisplayName("TC-OPT-13: Chạm giới hạn số node duyệt trả về SEARCH_LIMIT_REACHED và KHÔNG ĐƯỢC báo NO_SOLUTION")
    void testOptimizeSchedule_SearchLimitReached_DoesNotReportNoSolution() {
        // Tạo 4 courses, mỗi course có 5 lớp học không trùng giờ
        List<ClassSection> sections = new ArrayList<>();
        List<Long> courseIds = new ArrayList<>();
        for (int c = 1; c <= 4; c++) {
            Long cId = 200L + c;
            courseIds.add(cId);
            Course course = new Course();
            course.setId(cId);
            course.setCourseCode("CS" + cId);
            course.setName("Course " + cId);
            course.setCredits(3);
            for (int s = 1; s <= 5; s++) {
                sections.add(createSection((long) (c * 100 + s), "S" + c + "-" + s, course, "MON",
                        LocalTime.of(7 + s, 0), LocalTime.of(7 + s, 50), 40, 5));
            }
        }

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(sections);

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(courseIds);
        request.setSemesterName("2024-25_SEM2");
        request.setMaxSearchNodes(3); // Giới hạn cực thấp để chắc chắn chạm limit trước khi tìm thấy nghiệm

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

        assertNotNull(response);
        assertEquals(OptimizationStatus.SEARCH_LIMIT_REACHED, response.getStatus());
        assertNotEquals(OptimizationStatus.NO_SOLUTION, response.getStatus(),
                "Khi chạm giới hạn tìm kiếm, tuyệt đối không được báo NO_SOLUTION!");
        assertTrue(response.getStatusMessage().contains("chạm giới hạn"));
        assertEquals(0, response.getPlans().size());
    }

    @Test
    @DisplayName("TC-OPT-14: Quá thời gian tìm kiếm trả về TIME_LIMIT_EXCEEDED và KHÔNG ĐƯỢC báo NO_SOLUTION")
    void testOptimizeSchedule_TimeLimitExceeded_DoesNotReportNoSolution() {
        List<ClassSection> sections = new ArrayList<>();
        List<Long> courseIds = new ArrayList<>();
        for (int c = 1; c <= 4; c++) {
            Long cId = 300L + c;
            courseIds.add(cId);
            Course course = new Course();
            course.setId(cId);
            course.setCourseCode("CS" + cId);
            course.setName("Course " + cId);
            course.setCredits(3);
            for (int s = 1; s <= 5; s++) {
                sections.add(createSection((long) (c * 100 + s), "S" + c + "-" + s, course, "TUE",
                        LocalTime.of(7 + s, 0), LocalTime.of(7 + s, 50), 40, 5));
            }
        }

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(sections);

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(courseIds);
        request.setSemesterName("2024-25_SEM2");
        request.setMaxExecutionTimeMs(0L); // Giới hạn 0ms để hết hạn ngay lập tức

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

        assertNotNull(response);
        assertTrue(response.getStatus() == OptimizationStatus.TIME_LIMIT_EXCEEDED
                || response.getStatus() == OptimizationStatus.TIMEOUT_NO_SOLUTION);
        assertNotEquals(OptimizationStatus.NO_SOLUTION, response.getStatus(),
                "Một CSP Solver hết thời gian chưa có nghĩa là bài toán vô nghiệm!");
        assertTrue(response.getStatusMessage().contains("vượt quá giới hạn") || response.getStatusMessage().contains("chạm giới hạn"));
    }

    @Test
    @DisplayName("TC-OPT-15: Giới hạn maxSolutions kết thúc tìm kiếm sớm khi đủ số nghiệm yêu cầu")
    void testOptimizeSchedule_MaxSolutionsLimit_StopsEarly() {
        // Course 1 có 3 lớp khác giờ, Course 2 có 3 lớp khác giờ -> Tổng cộng 9 tổ hợp hợp lệ
        ClassSection s1A = createSection(1L, "S1A", course1, "MON", LocalTime.of(7, 0), LocalTime.of(8, 0), 40, 5);
        ClassSection s1B = createSection(2L, "S1B", course1, "MON", LocalTime.of(8, 0), LocalTime.of(9, 0), 40, 5);
        ClassSection s1C = createSection(3L, "S1C", course1, "MON", LocalTime.of(9, 0), LocalTime.of(10, 0), 40, 5);

        ClassSection s2A = createSection(4L, "S2A", course2, "TUE", LocalTime.of(7, 0), LocalTime.of(8, 0), 40, 5);
        ClassSection s2B = createSection(5L, "S2B", course2, "TUE", LocalTime.of(8, 0), LocalTime.of(9, 0), 40, 5);
        ClassSection s2C = createSection(6L, "S2C", course2, "TUE", LocalTime.of(9, 0), LocalTime.of(10, 0), 40, 5);

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(Arrays.asList(s1A, s1B, s1C, s2A, s2B, s2C));

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(Arrays.asList(101L, 102L));
        request.setSemesterName("2024-25_SEM2");
        request.setMaxSolutions(2); // Chỉ yêu cầu tối đa 2 nghiệm

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

        assertNotNull(response);
        assertTrue(response.getStatus() == OptimizationStatus.SUCCESS || response.getStatus() == OptimizationStatus.OPTIMAL);
        assertEquals(2, response.getTotalSolutions());
        assertEquals(2, response.getValidOptionsCount());
    }

    @Test
    @DisplayName("TC-OPT-16: Kiểm thử Concurrency - Nhiều request chạy đồng thời không rò rỉ trạng thái")
    void testOptimizeSchedule_ConcurrentRequests_ThreadSafe() throws Exception {
        ClassSection s1A = createSection(1L, "S1A", course1, "MON", LocalTime.of(7, 0), LocalTime.of(8, 0), 40, 5);
        ClassSection s1B = createSection(2L, "S1B", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(8, 0), 40, 5);
        ClassSection s2A = createSection(3L, "S2A", course2, "WED", LocalTime.of(7, 0), LocalTime.of(8, 0), 40, 5);

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(Arrays.asList(s1A, s1B, s2A));

        int threadCount = 10;
        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(threadCount);
        java.util.concurrent.CountDownLatch latch = new java.util.concurrent.CountDownLatch(threadCount);
        java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    ScheduleOptimizerRequest req = new ScheduleOptimizerRequest();
                    req.setCourseIds(Arrays.asList(101L, 102L));
                    req.setSemesterName("2024-25_SEM2");
                    req.setPreferredShift(index % 2 == 0 ? "MORNING" : "AFTERNOON");

                    ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("sv_user_" + index, req);
                    if ((resp.getStatus() == OptimizationStatus.SUCCESS || resp.getStatus() == OptimizationStatus.OPTIMAL)
                            && resp.getValidOptionsCount() == 2) {
                        successCount.incrementAndGet();
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        boolean completed = latch.await(5, java.util.concurrent.TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "Tất cả các thread đồng thời phải hoàn tất trong 5 giây");
        assertEquals(threadCount, successCount.get(), "Toàn bộ 10 request đồng thời phải cho kết quả chính xác độc lập");
    }

    @Test
    @DisplayName("TC-OPT-17: Kiểm tra ngắt Thread Interruption - Dừng tìm kiếm an toàn")
    void testOptimizeSchedule_InterruptionHandling() throws Exception {
        List<ClassSection> sections = new ArrayList<>();
        List<Long> courseIds = new ArrayList<>();
        for (int c = 1; c <= 4; c++) {
            Long cId = 400L + c;
            courseIds.add(cId);
            Course course = new Course();
            course.setId(cId);
            course.setCourseCode("CS" + cId);
            course.setName("Course " + cId);
            course.setCredits(3);
            for (int s = 1; s <= 6; s++) {
                sections.add(createSection((long) (c * 100 + s), "S" + c + "-" + s, course, "WED",
                        LocalTime.of(7 + s, 0), LocalTime.of(7 + s, 50), 40, 5));
            }
        }

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(sections);

        Thread currentThread = Thread.currentThread();
        currentThread.interrupt();

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(courseIds);
        request.setSemesterName("2024-25_SEM2");

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);

        // Clear interrupted status for JUnit
        Thread.interrupted();

        assertNotNull(response);
        assertNotNull(response.getStatus());
    }
}
