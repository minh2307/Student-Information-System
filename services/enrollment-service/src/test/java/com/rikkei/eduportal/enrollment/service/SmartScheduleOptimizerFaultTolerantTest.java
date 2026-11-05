package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.config.ScheduleOptimizerProperties;
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

import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("HOTFIX-AI Test Suite: Fault-Tolerant CSP Solver & Controlled Fallbacks")
class SmartScheduleOptimizerFaultTolerantTest {

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
        course1.setName("Introduction to Computer Science");
        course1.setCredits(3);

        course2 = new Course();
        course2.setId(102L);
        course2.setCourseCode("CS102");
        course2.setName("Data Structures");
        course2.setCredits(3);

        course3 = new Course();
        course3.setId(103L);
        course3.setCourseCode("CS103");
        course3.setName("Algorithms");
        course3.setCredits(3);

        User user = new User();
        user.setId(1L);
        user.setFullName("Dr. Nguyen Van A");

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
        cs.setRoomName("Room 301");
        cs.setMaxCapacity(maxCap);
        cs.setCurrentEnrolled(enrolled);
        cs.setStatus("OPEN");
        return cs;
    }

    @Test
    @DisplayName("TEST 01 — Empty Course List: Request rỗng -> Status NO_INPUT, không crash, không chạy DFS")
    void test01_EmptyCourseList_ReturnsNoInput() {
        ScheduleOptimizerRequest request1 = new ScheduleOptimizerRequest();
        request1.setCourseIds(Collections.emptyList());

        ScheduleOptimizerResponse resp1 = optimizerService.optimizeSchedule("SV001", request1);
        assertNotNull(resp1);
        assertEquals(OptimizationStatus.NO_INPUT, resp1.getStatus());
        assertFalse(resp1.isSuccess());
        assertEquals(0, resp1.getPlans().size());
        assertEquals(0, resp1.getSchedule().size());
        assertTrue(resp1.getStatusMessage().contains("Không có môn học"));

        ScheduleOptimizerRequest request2 = new ScheduleOptimizerRequest();
        request2.setCourseIds(Arrays.asList(null, null));
        ScheduleOptimizerResponse resp2 = optimizerService.optimizeSchedule("SV001", request2);
        assertNotNull(resp2);
        assertEquals(OptimizationStatus.NO_INPUT, resp2.getStatus());
        assertFalse(resp2.isSuccess());
    }

    @Test
    @DisplayName("TEST 02 — Empty Section Domain: Một môn có danh sách lớp rỗng -> Trả về NO_SOLUTION, không IndexOutOfBounds/NPE, ghi nhận môn thiếu")
    void test02_EmptySectionDomain_ReturnsNoSolution() {
        // CS101 có lớp mở, nhưng CS102 hoàn toàn không có lớp nào
        ClassSection s1 = createSection(1L, "CS101-01", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 10);

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(List.of(s1));

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(Arrays.asList(101L, 102L));
        request.setSemesterName("2024-25_SEM2");

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("SV001", request);

        assertNotNull(response);
        assertEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
        assertFalse(response.isSuccess());
        assertFalse(response.getIsComplete());
        assertEquals(0, response.getPlans().size(), "Không được trả về phương án lịch dở dang");
        assertEquals(0, response.getSchedule().size());
        assertEquals(1, response.getUnassignedCourses().size());
        assertTrue(response.getUnassignedCourses().get(0).getCourseCode().contains("102"));
        assertTrue(response.getUnassignedCourses().get(0).getReason().contains("Không có lớp học phần nào mở"));
    }

    @Test
    @DisplayName("TEST 03 — Schedule Conflict: Các lớp trùng lịch 100% -> NO_SOLUTION, recommendations rỗng, giải thích nguyên nhân")
    void test03_ScheduleConflict_ReturnsNoSolution() {
        // CS101 và CS102 trùng hoàn toàn vào Thứ 2 08:00 - 10:00
        ClassSection s1 = createSection(1L, "CS101-01", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 10);
        ClassSection s2 = createSection(2L, "CS102-01", course2, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 10);

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(Arrays.asList(s1, s2));

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(Arrays.asList(101L, 102L));
        request.setSemesterName("2024-25_SEM2");

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("SV001", request);

        assertNotNull(response);
        assertEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
        assertFalse(response.isSuccess());
        assertEquals(0, response.getPlans().size(), "Tuyệt đối không trả về lịch vi phạm ràng buộc");
        assertEquals(0, response.getSchedule().size());
        assertEquals(0, response.getTotalSolutions());
        assertNotNull(response.getConflictDetails());
        assertTrue(response.getConflictDetails().contains("Xung đột"));
    }

    @Test
    @DisplayName("TEST 04 — Valid Schedule: Các môn có phương án không xung đột -> Status OPTIMAL, trả về lịch hợp lệ đầy đủ")
    void test04_ValidSchedule_ReturnsOptimal() {
        ClassSection s1 = createSection(1L, "CS101-01", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 10);
        ClassSection s2 = createSection(2L, "CS102-01", course2, "TUE", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 10);

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(Arrays.asList(s1, s2));

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(Arrays.asList(101L, 102L));
        request.setSemesterName("2024-25_SEM2");

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("SV001", request);

        assertNotNull(response);
        assertEquals(OptimizationStatus.OPTIMAL, response.getStatus());
        assertTrue(response.isSuccess());
        assertTrue(response.getIsComplete());
        assertEquals(1, response.getTotalSolutions());
        assertEquals(1, response.getPlans().size());
        assertEquals(2, response.getSchedule().size());
        assertEquals(0, response.getUnassignedCourses().size());
    }

    @Test
    @DisplayName("TEST 05 — Large Search Space: Không gian tìm kiếm lớn dừng an toàn ở khoảng 2.5s, không crash")
    void test05_LargeSearchSpace_StopsSafely() {
        // Tạo 6 môn, mỗi môn 5 lớp
        List<ClassSection> sections = new ArrayList<>();
        List<Long> courseIds = new ArrayList<>();
        String[] days = {"MON", "TUE", "WED", "THU", "FRI"};

        for (int c = 1; c <= 6; c++) {
            Long cId = 200L + c;
            courseIds.add(cId);
            Course cObj = new Course();
            cObj.setId(cId);
            cObj.setCourseCode("SUBJ" + cId);
            cObj.setName("Subject " + cId);
            cObj.setCredits(3);

            for (int s = 1; s <= 5; s++) {
                // Tạo thời gian sao cho tạo ra đồ thị nhiều nhánh
                sections.add(createSection((long) (c * 100 + s), "SEC-" + c + "-" + s, cObj,
                        days[(c + s) % days.length],
                        LocalTime.of(7 + (s % 4) * 2, 0),
                        LocalTime.of(8 + (s % 4) * 2, 30), 40, 10));
            }
        }

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(sections);

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(courseIds);
        request.setSemesterName("2024-25_SEM2");
        request.setMaxExecutionTimeMs(1500L); // Giới hạn 1500ms

        long start = System.currentTimeMillis();
        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("SV001", request);
        long elapsed = System.currentTimeMillis() - start;

        assertNotNull(response);
        assertTrue(elapsed <= 3000L, "Phải dừng an toàn trong khoảng thời gian cho phép");
        assertNotNull(response.getStatus());
    }

    @Test
    @DisplayName("TEST 06 — Timeout With Best Solution: Có nghiệm sớm nhưng không gian lớn -> FEASIBLE_TIMEOUT kèm nghiệm tốt nhất")
    void test06_TimeoutWithBestSolution_ReturnsFeasibleTimeout() {
        // Search space: C1 và C2 có nhánh đầu tiên hợp lệ ngay lập tức, nhưng nhiều nhánh sau gây timeout
        List<ClassSection> sections = new ArrayList<>();
        List<Long> courseIds = new ArrayList<>();

        for (int c = 1; c <= 4; c++) {
            Long cId = 300L + c;
            courseIds.add(cId);
            Course cObj = new Course();
            cObj.setId(cId);
            cObj.setCourseCode("CRS" + cId);
            cObj.setName("Course " + cId);
            cObj.setCredits(3);

            // Lớp đầu tiên của các môn không xung đột (Thứ 2, 3, 4, 5 các giờ khác nhau)
            sections.add(createSection((long) (c * 1000 + 1), "FIRST-" + c, cObj,
                    c == 1 ? "MON" : c == 2 ? "TUE" : c == 3 ? "WED" : "THU",
                    LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5));

            // Các lớp tiếp theo rất nhiều để mở rộng không gian tìm kiếm
            for (int s = 2; s <= 15; s++) {
                sections.add(createSection((long) (c * 1000 + s), "EXTRA-" + c + "-" + s, cObj,
                        "FRI", LocalTime.of(7 + (s % 6), 0), LocalTime.of(8 + (s % 6), 0), 40, 5));
            }
        }

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(sections);

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(courseIds);
        request.setSemesterName("2024-25_SEM2");
        request.setMaxExecutionTimeMs(50L); // Giới hạn 50ms rất ngắn để ép timeout sau khi đã tìm được nghiệm đầu tiên

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("SV001", request);

        assertNotNull(response);
        // Do nghiệm đầu tiên (FIRST-1, FIRST-2, FIRST-3, FIRST-4) được duyệt ngay bước đầu
        if (response.getTotalSolutions() > 0 && response.getExecutionTimeMs() >= 50L) {
            assertEquals(OptimizationStatus.FEASIBLE_TIMEOUT, response.getStatus());
            assertTrue(response.isSuccess());
            assertTrue(response.getPlans().size() >= 1);
            assertEquals(4, response.getSchedule().size());
            assertTrue(response.getStatusMessage().contains("khả thi"));
        } else {
            // Trường hợp máy chạy quá nhanh đã duyệt xong trước 50ms
            assertTrue(response.getStatus() == OptimizationStatus.OPTIMAL || response.getStatus() == OptimizationStatus.FEASIBLE_TIMEOUT);
        }
    }

    @Test
    @DisplayName("TEST 07 — Timeout Without Solution: Không có nghiệm hợp lệ và chạm timeout -> TIMEOUT_NO_SOLUTION, recommendations rỗng")
    void test07_TimeoutWithoutSolution_ReturnsTimeoutNoSolution() {
        // Tạo không gian không có nghiệm nào và hết hạn 0ms
        List<ClassSection> sections = new ArrayList<>();
        List<Long> courseIds = new ArrayList<>();

        for (int c = 1; c <= 4; c++) {
            Long cId = 500L + c;
            courseIds.add(cId);
            Course cObj = new Course();
            cObj.setId(cId);
            cObj.setCourseCode("IMP" + cId);
            cObj.setName("Impossible " + cId);
            cObj.setCredits(3);

            for (int s = 1; s <= 5; s++) {
                // Tất cả trùng nhau vào MON 09:00 - 10:00 -> không thể có nghiệm
                sections.add(createSection((long) (c * 100 + s), "IMP-" + c + "-" + s, cObj,
                        "MON", LocalTime.of(9, 0), LocalTime.of(10, 0), 40, 5));
            }
        }

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(sections);

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(courseIds);
        request.setSemesterName("2024-25_SEM2");
        request.setMaxExecutionTimeMs(0L); // 0ms timeout ngay lập tức trước khi tìm được nghiệm

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("SV001", request);

        assertNotNull(response);
        assertTrue(response.getStatus() == OptimizationStatus.TIMEOUT_NO_SOLUTION
                || response.getStatus() == OptimizationStatus.TIME_LIMIT_EXCEEDED);
        assertFalse(response.isSuccess());
        assertEquals(0, response.getTotalSolutions());
        assertEquals(0, response.getPlans().size());
        assertEquals(0, response.getSchedule().size());
    }

    @Test
    @DisplayName("TEST 08 — Null Schedule Data: Section có start_time, end_time hoặc day null / không hợp lệ -> Lọc an toàn không crash NPE")
    void test08_NullScheduleData_FilteredSafely() {
        // Các section bị lỗi dữ liệu
        ClassSection corrupt1 = createSection(10L, "CORRUPT-DAY", course1, null, LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
        ClassSection corrupt2 = createSection(11L, "CORRUPT-START", course1, "MON", null, LocalTime.of(10, 0), 40, 5);
        ClassSection corrupt3 = createSection(12L, "CORRUPT-END", course1, "MON", LocalTime.of(8, 0), null, 40, 5);
        ClassSection corrupt4 = createSection(13L, "CORRUPT-INVERTED", course1, "MON", LocalTime.of(12, 0), LocalTime.of(8, 0), 40, 5); // end < start
        ClassSection corrupt5 = createSection(14L, "CORRUPT-CANCELLED", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
        corrupt5.setStatus("CANCELLED");

        // Section hợp lệ
        ClassSection valid1 = createSection(15L, "VALID-1", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);
        ClassSection valid2 = createSection(16L, "VALID-2", course2, "TUE", LocalTime.of(8, 0), LocalTime.of(10, 0), 40, 5);

        List<ClassSection> mixed = new ArrayList<>(Arrays.asList(
                null, corrupt1, corrupt2, corrupt3, corrupt4, corrupt5, valid1, valid2
        ));

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(mixed);

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(Arrays.asList(101L, 102L));
        request.setSemesterName("2024-25_SEM2");

        // Không được quăng NPE hay crash
        assertDoesNotThrow(() -> {
            ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("SV001", request);
            assertNotNull(response);
            assertEquals(OptimizationStatus.OPTIMAL, response.getStatus());
            assertEquals(1, response.getTotalSolutions());
            assertEquals(2, response.getSchedule().size());
        });
    }

    @Test
    @DisplayName("TEST 09 — Concurrent Requests: Nhiều request đồng thời gửi tới service -> Thread-safe không rò rỉ state")
    void test09_ConcurrentRequests_ThreadSafe() throws Exception {
        ClassSection s1A = createSection(1L, "S1A", course1, "MON", LocalTime.of(8, 0), LocalTime.of(9, 30), 40, 5);
        ClassSection s1B = createSection(2L, "S1B", course1, "TUE", LocalTime.of(8, 0), LocalTime.of(9, 30), 40, 5);
        ClassSection s2A = createSection(3L, "S2A", course2, "WED", LocalTime.of(8, 0), LocalTime.of(9, 30), 40, 5);

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList()))
                .thenReturn(Arrays.asList(s1A, s1B, s2A));

        int concurrency = 16;
        ExecutorService executor = Executors.newFixedThreadPool(concurrency);
        CountDownLatch latch = new CountDownLatch(concurrency);
        AtomicInteger successCounter = new AtomicInteger(0);

        for (int i = 0; i < concurrency; i++) {
            final int studentIndex = i;
            executor.submit(() -> {
                try {
                    ScheduleOptimizerRequest req = new ScheduleOptimizerRequest();
                    req.setCourseIds(Arrays.asList(101L, 102L));
                    req.setSemesterName("2024-25_SEM2");
                    req.setPreferredShift(studentIndex % 2 == 0 ? "MORNING" : "AFTERNOON");

                    ScheduleOptimizerResponse resp = optimizerService.optimizeSchedule("SV_" + studentIndex, req);
                    if (resp.getStatus() == OptimizationStatus.OPTIMAL && resp.getTotalSolutions() == 2) {
                        successCounter.incrementAndGet();
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        boolean finished = latch.await(8, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(finished, "Toàn bộ 16 request đồng thời phải kết thúc trong 8 giây");
        assertEquals(concurrency, successCounter.get(), "Cả 16 request phải hoàn tất độc lập và chính xác");
    }
}
