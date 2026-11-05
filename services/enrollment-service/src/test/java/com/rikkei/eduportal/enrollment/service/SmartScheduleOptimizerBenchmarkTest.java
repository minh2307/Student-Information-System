package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.config.ScheduleOptimizerProperties;
import com.rikkei.eduportal.enrollment.dto.OptimizationStatus;
import com.rikkei.eduportal.enrollment.dto.ScheduleOptimizerRequest;
import com.rikkei.eduportal.enrollment.dto.ScheduleOptimizerResponse;
import com.rikkei.eduportal.enrollment.entity.ClassSection;
import com.rikkei.eduportal.enrollment.entity.Course;
import com.rikkei.eduportal.enrollment.repository.ClassSectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class SmartScheduleOptimizerBenchmarkTest {

    @Mock
    private ClassSectionRepository classSectionRepository;

    @Mock
    private RealtimeSeatService realtimeSeatService;

    private SmartScheduleOptimizerService optimizerService;

    @BeforeEach
    void setUp() {
        ScheduleOptimizerProperties properties = new ScheduleOptimizerProperties(50_000, 3_000L, 100);
        optimizerService = new SmartScheduleOptimizerService(classSectionRepository, realtimeSeatService, properties);
    }

    private ClassSection createSection(Long id, String code, Course course, String day,
                                       LocalTime start, LocalTime end) {
        ClassSection cs = new ClassSection();
        cs.setId(id);
        cs.setSectionCode(code);
        cs.setCourse(course);
        cs.setSemesterName("2024-25_SEM2");
        cs.setDayOfWeek(day);
        cs.setStartTime(start);
        cs.setEndTime(end);
        cs.setMaxCapacity(50);
        cs.setCurrentEnrolled(20);
        cs.setStatus("OPEN");
        return cs;
    }

    private Course createCourse(Long id, String code, int credits) {
        Course c = new Course();
        c.setId(id);
        c.setCourseCode(code);
        c.setName("Course " + code);
        c.setCredits(credits);
        c.setWeeklyHours(credits);
        return c;
    }

    @Test
    @DisplayName("BENCHMARK 1: Small Dataset (3 courses, 2 sections/course, search space = 8)")
    void benchmarkSmallDataset() {
        List<ClassSection> sections = new ArrayList<>();
        List<Long> courseIds = new ArrayList<>();
        String[] days = {"MON", "TUE", "WED"};

        for (int i = 0; i < 3; i++) {
            Long cId = 100L + i;
            courseIds.add(cId);
            Course c = createCourse(cId, "CS" + cId, 3);
            sections.add(createSection((long) (i * 10 + 1), "S" + i + "-1", c, days[i], LocalTime.of(7, 0), LocalTime.of(9, 15)));
            sections.add(createSection((long) (i * 10 + 2), "S" + i + "-2", c, days[i], LocalTime.of(9, 30), LocalTime.of(11, 45)));
        }

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList())).thenReturn(sections);

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(courseIds);
        request.setPreferredShift("MORNING");

        long start = System.nanoTime();
        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv_bench", request);
        long durationMs = (System.nanoTime() - start) / 1_000_000;

        System.out.printf("[BENCHMARK-SMALL] Status: %s | Solutions: %d | Nodes: %d | Time: %d ms%n",
                response.getStatus(), response.getTotalSolutions(), response.getNodesExplored(), durationMs);

        assertEquals(OptimizationStatus.SUCCESS, response.getStatus());
        assertEquals(8, response.getTotalSolutions());
        assertTrue(response.getNodesExplored() <= 15);
        assertTrue(durationMs < 2000, "Small dataset must solve in < 2000ms");
    }

    @Test
    @DisplayName("BENCHMARK 2: Medium Dataset (5 courses, 4 sections/course, search space = 1,024)")
    void benchmarkMediumDataset() {
        List<ClassSection> sections = new ArrayList<>();
        List<Long> courseIds = new ArrayList<>();
        String[] days = {"MON", "TUE", "WED", "THU", "FRI"};
        LocalTime[][] slots = {
                {LocalTime.of(7, 0), LocalTime.of(9, 15)},
                {LocalTime.of(9, 30), LocalTime.of(11, 45)},
                {LocalTime.of(13, 0), LocalTime.of(15, 15)},
                {LocalTime.of(15, 30), LocalTime.of(17, 45)}
        };

        for (int i = 0; i < 5; i++) {
            Long cId = 200L + i;
            courseIds.add(cId);
            Course c = createCourse(cId, "CS" + cId, 3);
            for (int s = 0; s < 4; s++) {
                sections.add(createSection((long) (i * 100 + s), "S" + i + "-" + s, c, days[i], slots[s][0], slots[s][1]));
            }
        }

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList())).thenReturn(sections);

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(courseIds);
        request.setMaxSolutions(100);

        long start = System.nanoTime();
        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv_bench", request);
        long durationMs = (System.nanoTime() - start) / 1_000_000;

        System.out.printf("[BENCHMARK-MEDIUM] Status: %s | Solutions: %d | Nodes: %d | Time: %d ms%n",
                response.getStatus(), response.getTotalSolutions(), response.getNodesExplored(), durationMs);

        assertEquals(OptimizationStatus.SUCCESS, response.getStatus());
        assertEquals(100, response.getTotalSolutions()); // Capped by maxSolutions
        assertTrue(durationMs < 3000, "Medium dataset must solve in < 3000ms");
    }

    @Test
    @DisplayName("BENCHMARK 3: Large Dataset (7 courses, 6 sections/course, search space = 279,936)")
    void benchmarkLargeDataset() {
        List<ClassSection> sections = new ArrayList<>();
        List<Long> courseIds = new ArrayList<>();
        String[] days = {"MON", "TUE", "WED", "THU", "FRI", "MON", "TUE"};
        LocalTime[][] slots = {
                {LocalTime.of(7, 0), LocalTime.of(8, 30)},
                {LocalTime.of(8, 45), LocalTime.of(10, 15)},
                {LocalTime.of(10, 30), LocalTime.of(12, 0)},
                {LocalTime.of(13, 0), LocalTime.of(14, 30)},
                {LocalTime.of(14, 45), LocalTime.of(16, 15)},
                {LocalTime.of(16, 30), LocalTime.of(18, 0)}
        };

        for (int i = 0; i < 7; i++) {
            Long cId = 300L + i;
            courseIds.add(cId);
            Course c = createCourse(cId, "CS" + cId, 3);
            for (int s = 0; s < 6; s++) {
                sections.add(createSection((long) (i * 1000 + s), "S" + i + "-" + s, c, days[i], slots[s][0], slots[s][1]));
            }
        }

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList())).thenReturn(sections);

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(courseIds); // 7 courses = 21 credits (<= 24 limit)
        request.setMaxSolutions(50);

        long start = System.nanoTime();
        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv_bench", request);
        long durationMs = (System.nanoTime() - start) / 1_000_000;

        System.out.printf("[BENCHMARK-LARGE] Status: %s | Solutions: %d | Nodes: %d | Time: %d ms%n",
                response.getStatus(), response.getTotalSolutions(), response.getNodesExplored(), durationMs);

        assertEquals(OptimizationStatus.SUCCESS, response.getStatus());
        assertTrue(response.getTotalSolutions() > 0);
        assertTrue(durationMs < 5000, "MRV + Forward checking must solve large dataset in < 5000ms");
    }

    @Test
    @DisplayName("BENCHMARK 4: Impossible Dataset (5 courses, all classes collide on MON 09:00 - 10:30)")
    void benchmarkImpossibleDataset() {
        List<ClassSection> sections = new ArrayList<>();
        List<Long> courseIds = new ArrayList<>();

        for (int i = 0; i < 5; i++) {
            Long cId = 400L + i;
            courseIds.add(cId);
            Course c = createCourse(cId, "CS" + cId, 3);
            for (int s = 0; s < 3; s++) {
                // All sections conflict on MON 09:00 - 10:30
                sections.add(createSection((long) (i * 100 + s), "S" + i + "-" + s, c, "MON",
                        LocalTime.of(9, 0), LocalTime.of(10, 30)));
            }
        }

        when(classSectionRepository.findBySemesterAndCourseIdIn(anyString(), anyList())).thenReturn(sections);

        ScheduleOptimizerRequest request = new ScheduleOptimizerRequest();
        request.setCourseIds(courseIds);

        long start = System.nanoTime();
        ScheduleOptimizerResponse response = optimizerService.optimizeSchedule("sv_bench", request);
        long durationMs = (System.nanoTime() - start) / 1_000_000;

        System.out.printf("[BENCHMARK-IMPOSSIBLE] Status: %s | Solutions: %d | Nodes: %d | Time: %d ms%n",
                response.getStatus(), response.getTotalSolutions(), response.getNodesExplored(), durationMs);

        assertEquals(OptimizationStatus.NO_SOLUTION, response.getStatus());
        assertEquals(0, response.getTotalSolutions());
        // Thanks to Forward Checking / Domain Wipeout, it cuts off search immediately!
        assertTrue(response.getNodesExplored() <= 5, "Forward checking must prune impossible search at depth 1!");
        assertTrue(durationMs < 2000, "Impossible schedule detected instantly!");
        assertNotNull(response.getConflictDetails());
    }
}
