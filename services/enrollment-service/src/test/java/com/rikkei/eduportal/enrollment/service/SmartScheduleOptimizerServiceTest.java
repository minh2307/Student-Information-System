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
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SmartScheduleOptimizerServiceTest {

    @Mock
    private ClassSectionRepository classSectionRepository;

    @Mock
    private RealtimeSeatService realtimeSeatService;

    @InjectMocks
    private SmartScheduleOptimizerService optimizerService;

    private Course course1;
    private Course course2;
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
    @DisplayName("TC-OPT-01: Kiểm tra xung đột thời gian hai lớp học phần")
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
    @DisplayName("TC-OPT-02: optimizeSchedule với danh sách môn rỗng trả về thông báo hợp lệ")
    void testOptimizeSchedule_EmptyCourses_ReturnsEarly() {
        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(new ArrayList<>());

        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv2024001", request);
        assertNotNull(response);
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
        assertEquals(1, response.getValidOptionsCount());
        assertEquals(1, response.getPlans().size());

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
        // Phương án điểm cao nhất phải là lớp Thứ 2 tránh được Thứ 7
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
}
