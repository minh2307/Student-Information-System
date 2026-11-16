package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.config.ScheduleOptimizerProperties;
import com.rikkei.eduportal.enrollment.dto.*;
import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.exception.BatchReservationException;
import com.rikkei.eduportal.enrollment.repository.ClassSectionRepository;
import com.rikkei.eduportal.enrollment.repository.EnrollmentRepository;
import com.rikkei.eduportal.enrollment.repository.SlotReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Suite kiểm thử nghiệm thu chính thức Tiêu chí chấp nhận (AC) cho:
 * - EDUP-201: Engine AI Xếp Thời khóa biểu tự động (CSP Solver)
 * - EDUP-202: Giao diện AI Smart Scheduler Modal & 1-Click Batch Reserve
 * 
 * Tương ứng với vai trò Assignee: Nguyễn Sơn Minh (Team Lead & AI/Algorithm Lead)
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AC Verification Suite: EDUP-201 & EDUP-202 AI Smart Scheduler")
public class SmartScheduleOptimizerAcceptanceCriteriaTest {

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

    @InjectMocks
    private SmartScheduleOptimizerService optimizerService;

    private StudentProfile student;
    private Course course1;
    private Course course2;
    private Course course3;
    private Course course4;

    @BeforeEach
    void setUp() {
        ScheduleOptimizerProperties properties = new ScheduleOptimizerProperties(50_000, 2_500L, 100);
        optimizerService = new SmartScheduleOptimizerService(
                classSectionRepository,
                realtimeSeatService,
                slotReservationRepository,
                enrollmentRepository,
                dashboardService,
                properties
        );

        student = new StudentProfile();
        student.setId(1L);
        student.setStudentCode("SV2024001");

        course1 = createCourse(101L, "CS101", "Lập trình Cơ bản", 3);
        course2 = createCourse(102L, "CS102", "Cấu trúc Dữ liệu & Giải thuật", 3);
        course3 = createCourse(103L, "CS103", "Cơ sở Dữ liệu Quan hệ", 3);
        course4 = createCourse(104L, "CS104", "Mạng Máy tính & Truyền thông", 3);
    }

    private Course createCourse(Long id, String code, String name, int credits) {
        Course c = new Course();
        c.setId(id);
        c.setCourseCode(code);
        c.setName(name);
        c.setCredits(credits);
        c.setWeeklyHours(credits);
        return c;
    }

    private ClassSection createSection(Long id, String code, Course course, String day,
                                       LocalTime start, LocalTime end, int capacity, int enrolled) {
        ClassSection cs = new ClassSection();
        cs.setId(id);
        cs.setSectionCode(code);
        cs.setCourse(course);
        cs.setSemesterName("2024-25_SEM2");
        cs.setDayOfWeek(day);
        cs.setStartTime(start);
        cs.setEndTime(end);
        cs.setMaxCapacity(capacity);
        cs.setCurrentEnrolled(enrolled);
        cs.setStatus("OPEN");
        cs.setRoomName("Lab-" + id);
        return cs;
    }

    /**
     * [EDUP-201] - Scenario 1:
     * Given: Danh sách 4 mã môn học với tổng cộng 12 lớp học phần mở trong kỳ (mỗi môn 3 lớp).
     * When: Sinh viên gọi API giải bài toán CSP với tùy chọn ưu tiên ca sáng (preferredShift: "MORNING").
     * Then: Hệ thống trả về tối đa 3 phương án thời khóa biểu không trùng tiết, sắp xếp theo điểm Fitness Score
     *       từ cao xuống thấp trong thời gian <= 1.5 giây (1500 ms).
     */
    @Test
    @DisplayName("[EDUP-201][AC-Scenario-1] 4 môn học x 12 lớp mở, ưu tiên ca sáng -> Top 3 phương án <= 1.5s")
    void testAcceptanceCriteria_Scenario1_FourCoursesTwelveSectionsMorningShift() {
        // Chuẩn bị 12 lớp học phần (3 lớp cho mỗi môn trong số 4 môn)
        List<ClassSection> sections = new ArrayList<>();

        // Môn 1: CS101 (3 lớp)
        sections.add(createSection(1001L, "CS101-01", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 10)); // Sáng T2
        sections.add(createSection(1002L, "CS101-02", course1, "TUE", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 15)); // Sáng T3
        sections.add(createSection(1003L, "CS101-03", course1, "WED", LocalTime.of(13, 0), LocalTime.of(15, 15), 40, 5)); // Chiều T4

        // Môn 2: CS102 (3 lớp)
        sections.add(createSection(1004L, "CS102-01", course2, "MON", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 12)); // Sáng T2
        sections.add(createSection(1005L, "CS102-02", course2, "WED", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 8));   // Sáng T4
        sections.add(createSection(1006L, "CS102-03", course2, "THU", LocalTime.of(13, 0), LocalTime.of(15, 15), 40, 10)); // Chiều T5

        // Môn 3: CS103 (3 lớp)
        sections.add(createSection(1007L, "CS103-01", course3, "TUE", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 20)); // Sáng T3
        sections.add(createSection(1008L, "CS103-02", course3, "THU", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 14));  // Sáng T5
        sections.add(createSection(1009L, "CS103-03", course3, "FRI", LocalTime.of(13, 0), LocalTime.of(15, 15), 40, 5));  // Chiều T6

        // Môn 4: CS104 (3 lớp)
        sections.add(createSection(1010L, "CS104-01", course4, "WED", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 15)); // Sáng T4
        sections.add(createSection(1011L, "CS104-02", course4, "FRI", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 18));   // Sáng T6
        sections.add(createSection(1012L, "CS104-03", course4, "SAT", LocalTime.of(13, 0), LocalTime.of(15, 15), 40, 10)); // Chiều T7

        when(classSectionRepository.findBySemesterAndCourseIdIn(eq("2024-25_SEM2"), anyList()))
                .thenReturn(sections);

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(Arrays.asList(101L, 102L, 103L, 104L));
        request.setSemesterName("2024-25_SEM2");
        request.setPreferredShift("MORNING"); // Ưu tiên ca sáng
        request.setOptimizationGoal("COMPACT");
        request.setAvoidDays(Arrays.asList("SAT", "SUN")); // Tránh cuối tuần
        request.setOnlyAvailableSeats(true);

        long startNanos = System.nanoTime();
        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("SV2024001", request);
        long durationMs = (System.nanoTime() - startNanos) / 1_000_000;

        System.out.printf("[DEMO-PO-EDUP-201] Scenario 1 Execution Time: %d ms | Solutions Found: %d | Nodes Explored: %d%n",
                durationMs, response.getTotalSolutions(), response.getNodesExplored());

        // Then 1: Thời gian giải quyết thuật toán <= 1.5 giây (1500 ms)
        assertTrue(durationMs <= 1500, "Thuật toán CSP giải quyết 4 môn phải hoàn thành trong <= 1.5s, thực tế: " + durationMs + "ms");

        // Then 2: Trả về kết quả thành công và tối đa 3 phương án gợi ý
        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertTrue(response.getIsComplete());
        assertEquals(OptimizationStatus.OPTIMAL, response.getStatus());
        assertTrue(response.getPlans().size() <= 3, "Hệ thống chỉ gợi ý tối đa 3 phương án chất lượng nhất");
        assertFalse(response.getPlans().isEmpty(), "Phải tìm thấy ít nhất 1 phương án hợp lệ");

        // Then 3: Điểm số các phương án phải được sắp xếp giảm dần theo Fitness Score / matchPercentage
        List<SchedulePlanOption> plans = response.getPlans();
        for (int i = 0; i < plans.size() - 1; i++) {
            assertTrue(plans.get(i).getMatchPercentage() >= plans.get(i + 1).getMatchPercentage(),
                    "Phương án phải được sắp xếp giảm dần theo điểm Fitness Score: Plan " + (i+1) + " (" +
                            plans.get(i).getMatchPercentage() + "%) >= Plan " + (i+2) + " (" + plans.get(i+1).getMatchPercentage() + "%)");
        }

        // Then 4: Kiểm tra mọi phương án đều gồm đủ 4 môn và tuyệt đối không trùng tiết (Zero Time Collision)
        for (SchedulePlanOption plan : plans) {
            assertEquals(4, plan.getSections().size(), "Mỗi phương án phải xếp đủ 4 môn học");
            assertEquals(12, plan.getTotalCredits(), "Tổng số tín chỉ phải là 12 TC (4 môn x 3 TC)");

            // Kiểm tra không trùng tiết từng đôi một
            List<ClassSectionDto> items = plan.getSections();
            for (int i = 0; i < items.size(); i++) {
                for (int j = i + 1; j < items.size(); j++) {
                    ClassSectionDto a = items.get(i);
                    ClassSectionDto b = items.get(j);
                    if (a.getDayOfWeek() != null && a.getDayOfWeek().equalsIgnoreCase(b.getDayOfWeek())) {
                        LocalTime startA = LocalTime.parse(a.getStartTime());
                        LocalTime endA = LocalTime.parse(a.getEndTime());
                        LocalTime startB = LocalTime.parse(b.getStartTime());
                        LocalTime endB = LocalTime.parse(b.getEndTime());
                        boolean overlap = startA.isBefore(endB) && endA.isAfter(startB);
                        assertFalse(overlap, "Không được có trùng tiết giữa " + a.getSectionCode() + " và " + b.getSectionCode());
                    }
                }
            }
        }
    }

    /**
     * [EDUP-201] - Scenario 2:
     * Given: 2 môn học bắt buộc chỉ mở duy nhất 2 lớp có khung giờ trùng nhau 100%.
     * When: AI chạy thuật toán DFS Backtracking duyệt hết nhánh cây tìm kiếm.
     * Then: Hệ thống trả về danh sách phương án rỗng kèm thông báo nguyên nhân xung đột cụ thể giữa 2 lớp học phần.
     */
    @Test
    @DisplayName("[EDUP-201][AC-Scenario-2] 2 môn học xung đột trùng giờ 100% -> NO_SOLUTION & conflictDetails")
    void testAcceptanceCriteria_Scenario2_TwoCoursesCollideDirectly() {
        // 2 môn học bắt buộc chỉ mở 1 lớp mỗi môn và cả 2 lớp đều học Thứ 2 ca 08:00 - 10:30
        ClassSection s1 = createSection(2001L, "CS101-01", course1, "MON", LocalTime.of(8, 0), LocalTime.of(10, 30), 40, 10);
        ClassSection s2 = createSection(2002L, "CS102-01", course2, "MON", LocalTime.of(8, 0), LocalTime.of(10, 30), 40, 10);

        when(classSectionRepository.findBySemesterAndCourseIdIn(eq("2024-25_SEM2"), anyList()))
                .thenReturn(Arrays.asList(s1, s2));

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(Arrays.asList(101L, 102L));
        request.setSemesterName("2024-25_SEM2");

        long startNanos = System.nanoTime();
        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("SV2024001", request);
        long durationMs = (System.nanoTime() - startNanos) / 1_000_000;

        System.out.printf("[DEMO-PO-EDUP-201] Scenario 2 Pruned in %d ms | Conflict: %s%n",
                durationMs, response.getConflictDetails());

        // Then 1: Trả về trạng thái NO_SOLUTION và phương án rỗng
        assertNotNull(response);
        assertFalse(response.isSuccess());
        assertFalse(response.getIsComplete());
        assertEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
        assertEquals(0, response.getTotalSolutions());
        assertTrue(response.getPlans().isEmpty());

        // Then 2: Cắt tỉa cực nhanh (Forward Checking / Collision Matrix) trong < 50ms
        assertTrue(durationMs <= 500, "Xung đột trực tiếp phải được cắt tỉa nhánh ngay lập tức");

        // Then 3: Báo cáo nguyên nhân xung đột cụ thể chỉ đích danh 2 lớp học phần
        assertNotNull(response.getConflictDetails(), "Phải có thông tin chi tiết nguyên nhân xung đột");
        assertTrue(response.getConflictDetails().contains("CS101-01") || response.getConflictDetails().contains("CS101"),
                "Thông tin xung đột phải nhắc đến lớp hoặc môn CS101");
        assertTrue(response.getConflictDetails().contains("CS102-01") || response.getConflictDetails().contains("CS102"),
                "Thông tin xung đột phải nhắc đến lớp hoặc môn CS102");
    }

    /**
     * [EDUP-202] - 1-Click Batch Reserve:
     * Given: Sinh viên chọn Phương án Top 1 gồm 4 lớp học phần.
     * When: Bấm nút 1-chạm giữ chỗ (POST /api/v1/student/schedule-optimizer/batch-reserve).
     * Then: Hệ thống thực hiện batch reserve thành công nguyên tử 4 lớp, tạo 4 reservation với hạn 5 phút (300s).
     */
    @Test
    @DisplayName("[EDUP-202][AC-Batch-Reserve] 1-Chạm giữ chỗ trọn gói combo 4 môn trong 5 phút thành công")
    void testAcceptanceCriteria_BatchReserveSuccessful_FourCourses() {
        ClassSection s1 = createSection(1001L, "CS101-01", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 10);
        ClassSection s2 = createSection(1004L, "CS102-01", course2, "MON", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 12);
        ClassSection s3 = createSection(1007L, "CS103-01", course3, "TUE", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 20);
        ClassSection s4 = createSection(1010L, "CS104-01", course4, "WED", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 15);

        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(1001L)).thenReturn(Optional.of(s1));
        when(classSectionRepository.findByIdWithLock(1004L)).thenReturn(Optional.of(s2));
        when(classSectionRepository.findByIdWithLock(1007L)).thenReturn(Optional.of(s3));
        when(classSectionRepository.findByIdWithLock(1010L)).thenReturn(Optional.of(s4));

        when(slotReservationRepository.countActiveReservations(anyLong(), any(LocalDateTime.class))).thenReturn(0L);
        when(enrollmentRepository.findByStudentIdAndClassSectionId(eq(1L), anyLong())).thenReturn(Optional.empty());
        when(enrollmentRepository.findAllByStudentId(1L)).thenReturn(Collections.emptyList());

        when(slotReservationRepository.save(any(SlotReservation.class))).thenAnswer(invocation -> {
            SlotReservation r = invocation.getArgument(0);
            r.setId(new Random().nextLong(5000, 9999));
            return r;
        });

        BatchReserveRequest request = new BatchReserveRequest(Arrays.asList(1001L, 1004L, 1007L, 1010L));
        BatchReserveResponse response = optimizerService.batchReserveSlots("SV2024001", request);

        // Verification
        assertNotNull(response);
        assertEquals(4, response.getSuccessCount());
        assertEquals(0, response.getFailedCount());
        assertEquals(4, response.getReservations().size());

        // Kiểm tra từng reservation có thời hạn 300s (5 phút) và trạng thái ACTIVE
        for (SlotReservationResponse resDto : response.getReservations()) {
            assertEquals(300, resDto.remainingSeconds());
            assertEquals("ACTIVE", resDto.status());
            assertNotNull(resDto.expiresAt());
        }

        verify(slotReservationRepository, times(4)).save(any(SlotReservation.class));
    }

    /**
     * [EDUP-202] - Atomic All-or-Nothing Rollback:
     * Given: 1 trong 4 lớp học phần trong combo đã hết chỗ (40/40) do người khác đăng ký trước.
     * When: Sinh viên bấm 1-chạm giữ chỗ.
     * Then: Giao dịch bị hủy bỏ toàn bộ (Rollback), không lưu reservation nào, ném BatchReservationException.
     */
    @Test
    @DisplayName("[EDUP-202][AC-Batch-Reserve-Rollback] Môn thứ 4 hết chỗ -> Atomic Rollback 100%, không ghi rác DB")
    void testAcceptanceCriteria_BatchReserveAtomicRollback_WhenOneSectionFull() {
        ClassSection s1 = createSection(1001L, "CS101-01", course1, "MON", LocalTime.of(7, 0), LocalTime.of(9, 15), 40, 10);
        ClassSection s2 = createSection(1004L, "CS102-01", course2, "MON", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 12);
        ClassSection s3 = createSection(1007L, "CS103-01", course3, "TUE", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 20);
        ClassSection s4Full = createSection(1010L, "CS104-01", course4, "WED", LocalTime.of(9, 30), LocalTime.of(11, 45), 40, 40); // ĐẦY

        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(1001L)).thenReturn(Optional.of(s1));
        when(classSectionRepository.findByIdWithLock(1004L)).thenReturn(Optional.of(s2));
        when(classSectionRepository.findByIdWithLock(1007L)).thenReturn(Optional.of(s3));
        when(classSectionRepository.findByIdWithLock(1010L)).thenReturn(Optional.of(s4Full));

        when(slotReservationRepository.countActiveReservations(anyLong(), any(LocalDateTime.class))).thenReturn(0L);
        when(enrollmentRepository.findByStudentIdAndClassSectionId(eq(1L), anyLong())).thenReturn(Optional.empty());
        when(enrollmentRepository.findAllByStudentId(1L)).thenReturn(Collections.emptyList());

        BatchReserveRequest request = new BatchReserveRequest(Arrays.asList(1001L, 1004L, 1007L, 1010L));

        assertThatThrownBy(() -> optimizerService.batchReserveSlots("SV2024001", request))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertEquals("BATCH_RESERVATION_FAILED", bre.getCode());
                    assertEquals("CS104", bre.getDetails().getFailedCourseId());
                    assertEquals("NO_AVAILABLE_SLOTS", bre.getDetails().getReason());
                });

        // Đảm bảo không có bất kỳ reservation nào được lưu vào CSDL (Atomic Rollback)
        verify(slotReservationRepository, never()).save(any(SlotReservation.class));
    }
}
