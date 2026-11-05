package com.rikkei.eduportal.enrollment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.enrollment.dto.BatchReserveRequest;
import com.rikkei.eduportal.enrollment.dto.BatchReserveResponse;
import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.exception.BatchReservationException;
import com.rikkei.eduportal.enrollment.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("PostgreSQL Integration Test Suite: Atomic Batch Reservation (TASK-D03-MINH)")
class BatchReservationAtomicPostgresIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(BatchReservationAtomicPostgresIntegrationTest.class);

    @Autowired
    private SmartScheduleOptimizerService optimizerService;

    @Autowired
    private ClassSectionRepository classSectionRepository;

    @Autowired
    private SlotReservationRepository slotReservationRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private StudentProfile student1;
    private StudentProfile student2;
    private Course testCourse1;
    private Course testCourse2;
    private Course testCourse3;
    private Course testCourse4;
    private ClassSection sec1;
    private ClassSection sec2;
    private ClassSection sec3;
    private ClassSection sec4;

    private final List<Long> createdSectionIds = new ArrayList<>();
    private final List<Long> createdCourseIds = new ArrayList<>();
    private final List<Long> createdEnrollmentIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        // Clean any leftovers
        slotReservationRepository.deleteAll();

        student1 = studentProfileRepository.findByUsernameOrStudentCode("SV2024001")
                .orElseGet(() -> studentProfileRepository.findAll().get(0));
        student2 = studentProfileRepository.findByUsernameOrStudentCode("SV2024002")
                .orElseGet(() -> studentProfileRepository.findAll().get(1));

        LecturerProfile lecturer = entityManager.getReference(LecturerProfile.class, 1L);

        String runId = UUID.randomUUID().toString().substring(0, 8);
        testCourse1 = createAndSaveCourse("TC1-" + runId, "Test Course 1");
        testCourse2 = createAndSaveCourse("TC2-" + runId, "Test Course 2");
        testCourse3 = createAndSaveCourse("TC3-" + runId, "Test Course 3");
        testCourse4 = createAndSaveCourse("TC4-" + runId, "Digital Signal Processing");

        sec1 = createAndSaveSection("SEC1-" + runId, testCourse1, lecturer, 10, 0, "OPEN");
        sec2 = createAndSaveSection("SEC2-" + runId, testCourse2, lecturer, 10, 0, "OPEN");
        sec3 = createAndSaveSection("SEC3-" + runId, testCourse3, lecturer, 10, 0, "OPEN");
        sec4 = createAndSaveSection("SEC4-" + runId, testCourse4, lecturer, 10, 0, "OPEN");
    }

    @AfterEach
    void tearDown() {
        // Xóa các reservation phát sinh trong test
        slotReservationRepository.deleteAll();

        // Xóa các enrollment phát sinh
        if (!createdEnrollmentIds.isEmpty()) {
            enrollmentRepository.deleteAllById(createdEnrollmentIds);
            createdEnrollmentIds.clear();
        }

        // Xóa class sections đã tạo
        if (!createdSectionIds.isEmpty()) {
            classSectionRepository.deleteAllById(createdSectionIds);
            createdSectionIds.clear();
        }

        // Xóa courses đã tạo
        if (!createdCourseIds.isEmpty()) {
            courseRepository.deleteAllById(createdCourseIds);
            createdCourseIds.clear();
        }
    }

    private Course createAndSaveCourse(String code, String name) {
        Course c = new Course();
        c.setCourseCode(code);
        c.setName(name);
        c.setCredits(3);
        c.setWeeklyHours(3);
        Course saved = courseRepository.save(c);
        createdCourseIds.add(saved.getId());
        return saved;
    }

    private ClassSection createAndSaveSection(String sectionCode, Course course, LecturerProfile lecturer,
                                             int maxCapacity, int currentEnrolled, String status) {
        ClassSection cs = new ClassSection();
        cs.setSectionCode(sectionCode);
        cs.setCourse(course);
        cs.setLecturer(lecturer);
        cs.setSemesterName("2024-25_SEM2");
        cs.setDayOfWeek("MON");
        cs.setStartTime(LocalTime.of(8, 0));
        cs.setEndTime(LocalTime.of(10, 30));
        cs.setRoomName("LAB-101");
        cs.setMaxCapacity(maxCapacity);
        cs.setCurrentEnrolled(currentEnrolled);
        cs.setStatus(status);
        ClassSection saved = classSectionRepository.save(cs);
        createdSectionIds.add(saved.getId());
        return saved;
    }

    @Test
    @DisplayName("Test 1 — Successful Batch Reservation: Combo 4 môn đều còn chỗ -> Commit toàn bộ, DB có đúng 4 reservation")
    void test1_SuccessfulBatchReservation_AllCommitted() {
        LocalDateTime now = LocalDateTime.now();

        // Trước khi đăng ký: DB có 0 reservation cho cả 4 lớp
        assertThat(slotReservationRepository.countActiveReservations(sec1.getId(), now)).isEqualTo(0L);
        assertThat(slotReservationRepository.countActiveReservations(sec2.getId(), now)).isEqualTo(0L);
        assertThat(slotReservationRepository.countActiveReservations(sec3.getId(), now)).isEqualTo(0L);
        assertThat(slotReservationRepository.countActiveReservations(sec4.getId(), now)).isEqualTo(0L);

        BatchReserveRequest request = new BatchReserveRequest(List.of(
                sec1.getId(), sec2.getId(), sec3.getId(), sec4.getId()
        ));

        BatchReserveResponse response = optimizerService.batchReserveSlots(student1.getStudentCode(), request);

        assertThat(response).isNotNull();
        assertThat(response.getSuccessCount()).isEqualTo(4);
        assertThat(response.getFailedCount()).isEqualTo(0);
        assertThat(response.getReservations()).hasSize(4);

        // BẰNG CHỨNG TRỰC TIẾP TỪ DATABASE: Cả 4 lớp đều có đúng 1 reservation ACTIVE
        assertThat(slotReservationRepository.countActiveReservations(sec1.getId(), now)).isEqualTo(1L);
        assertThat(slotReservationRepository.countActiveReservations(sec2.getId(), now)).isEqualTo(1L);
        assertThat(slotReservationRepository.countActiveReservations(sec3.getId(), now)).isEqualTo(1L);
        assertThat(slotReservationRepository.countActiveReservations(sec4.getId(), now)).isEqualTo(1L);

        List<SlotReservation> activeReservations = slotReservationRepository.findActiveByStudentId(student1.getId(), now);
        assertThat(activeReservations).hasSize(4);
    }

    @Test
    @DisplayName("Test 2 — Last Course Full: Môn thứ 4 hết chỗ -> ROLLBACK TOÀN BỘ, không có reservation dở dang, báo đúng môn 4")
    void test2_LastCourseFull_RollsBackAll() {
        LocalDateTime now = LocalDateTime.now();

        // Cấu hình môn thứ 4 đã hết sạch chỗ (enrolled = maxCapacity = 10)
        sec4.setCurrentEnrolled(10);
        classSectionRepository.save(sec4);

        long reservationsBefore = slotReservationRepository.count();

        BatchReserveRequest request = new BatchReserveRequest(List.of(
                sec1.getId(), sec2.getId(), sec3.getId(), sec4.getId()
        ));

        // Thực hiện batch reserve -> Phải ném BatchReservationException
        assertThatThrownBy(() -> optimizerService.batchReserveSlots(student1.getStudentCode(), request))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertThat(bre.getStatus()).isEqualTo(409);
                    assertThat(bre.getCode()).isEqualTo("BATCH_RESERVATION_FAILED");
                    assertThat(bre.getDetails()).isNotNull();
                    assertThat(bre.getDetails().getFailedCourseId()).isEqualTo(testCourse4.getCourseCode());
                    assertThat(bre.getDetails().getFailedCourseName()).isEqualTo(testCourse4.getName());
                    assertThat(bre.getDetails().getReason()).isEqualTo("NO_AVAILABLE_SLOTS");
                    assertThat(bre.getDetails().getMessage()).isEqualTo("Học phần đã hết chỗ.");
                });

        // BẰNG CHỨNG DATABASE SAU ROLLBACK:
        // 1. Tổng số bản ghi reservation trong DB trước và sau phải BẰNG NHAU HOÀN TOÀN
        long reservationsAfter = slotReservationRepository.count();
        assertThat(reservationsAfter).isEqualTo(reservationsBefore);

        // 2. Không có bất kỳ môn nào bị giữ chỗ dở dang (cả 4 môn đều = 0)
        assertThat(slotReservationRepository.countActiveReservations(sec1.getId(), now)).isEqualTo(0L);
        assertThat(slotReservationRepository.countActiveReservations(sec2.getId(), now)).isEqualTo(0L);
        assertThat(slotReservationRepository.countActiveReservations(sec3.getId(), now)).isEqualTo(0L);
        assertThat(slotReservationRepository.countActiveReservations(sec4.getId(), now)).isEqualTo(0L);

        // 3. Số lượng slot khả dụng không bị biến đổi
        ClassSection sec1Reloaded = classSectionRepository.findById(sec1.getId()).orElseThrow();
        assertThat(sec1Reloaded.getCurrentEnrolled()).isEqualTo(0);
    }

    @Test
    @DisplayName("Test 3 — Middle Course Full: Môn 1 còn chỗ, môn 2 hết chỗ -> ROLLBACK TOÀN BỘ, môn 1 không còn reservation")
    void test3_MiddleCourseFull_RollsBackAll() {
        LocalDateTime now = LocalDateTime.now();

        // Môn 2 hết chỗ (10/10)
        sec2.setCurrentEnrolled(10);
        classSectionRepository.save(sec2);

        BatchReserveRequest request = new BatchReserveRequest(List.of(
                sec1.getId(), sec2.getId(), sec3.getId(), sec4.getId()
        ));

        assertThatThrownBy(() -> optimizerService.batchReserveSlots(student1.getStudentCode(), request))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertThat(bre.getDetails().getFailedCourseId()).isEqualTo(testCourse2.getCourseCode());
                    assertThat(bre.getDetails().getReason()).isEqualTo("NO_AVAILABLE_SLOTS");
                });

        // BẰNG CHỨNG DATABASE: Môn 1 không bị giữ chỗ dở dang
        assertThat(slotReservationRepository.countActiveReservations(sec1.getId(), now)).isEqualTo(0L);
        assertThat(slotReservationRepository.countActiveReservations(sec2.getId(), now)).isEqualTo(0L);
        assertThat(slotReservationRepository.countActiveReservations(sec3.getId(), now)).isEqualTo(0L);
        assertThat(slotReservationRepository.countActiveReservations(sec4.getId(), now)).isEqualTo(0L);
    }

    @Test
    @DisplayName("Test 4 — Concurrent Reservation: Hai sinh viên tranh chấp 1 slot duy nhất -> Đúng 1 người thành công, 1 người nhận lỗi 409")
    void test4_ConcurrentReservation_SlotContention() throws InterruptedException {
        LocalDateTime now = LocalDateTime.now();

        // Tạo 1 lớp chỉ còn duy nhất 1 chỗ (capacity = 1, currentEnrolled = 0)
        LecturerProfile lecturer = entityManager.getReference(LecturerProfile.class, 1L);
        String runId = UUID.randomUUID().toString().substring(0, 8);
        Course hotCourse = createAndSaveCourse("HOT-" + runId, "Hot Course 1 Slot");
        ClassSection hotSection = createAndSaveSection("HOT-01-" + runId, hotCourse, lecturer, 1, 0, "OPEN");

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startSignal = new CountDownLatch(1);
        CountDownLatch doneSignal = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);
        List<Throwable> exceptions = new CopyOnWriteArrayList<>();

        BatchReserveRequest req = new BatchReserveRequest(List.of(hotSection.getId()));

        // Thread 1: Sinh viên 1
        executor.submit(() -> {
            try {
                startSignal.await();
                BatchReserveResponse resp = optimizerService.batchReserveSlots(student1.getStudentCode(), req);
                if (resp.getSuccessCount() == 1) {
                    successCount.incrementAndGet();
                }
            } catch (BatchReservationException bre) {
                if ("NO_AVAILABLE_SLOTS".equals(bre.getDetails().getReason()) && bre.getStatus() == 409) {
                    conflictCount.incrementAndGet();
                } else {
                    exceptions.add(bre);
                }
            } catch (Exception ex) {
                exceptions.add(ex);
            } finally {
                doneSignal.countDown();
            }
        });

        // Thread 2: Sinh viên 2
        executor.submit(() -> {
            try {
                startSignal.await();
                BatchReserveResponse resp = optimizerService.batchReserveSlots(student2.getStudentCode(), req);
                if (resp.getSuccessCount() == 1) {
                    successCount.incrementAndGet();
                }
            } catch (BatchReservationException bre) {
                if ("NO_AVAILABLE_SLOTS".equals(bre.getDetails().getReason()) && bre.getStatus() == 409) {
                    conflictCount.incrementAndGet();
                } else {
                    exceptions.add(bre);
                }
            } catch (Exception ex) {
                exceptions.add(ex);
            } finally {
                doneSignal.countDown();
            }
        });

        // Kích hoạt đồng thời cả 2 thread
        startSignal.countDown();
        boolean completed = doneSignal.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(exceptions).isEmpty();

        // KẾT QUẢ BẮT BUỘC:
        // Đúng 1 sinh viên thành công giữ chỗ
        assertThat(successCount.get()).isEqualTo(1);
        // Đúng 1 sinh viên nhận lỗi hết chỗ (409 CONFLICT)
        assertThat(conflictCount.get()).isEqualTo(1);

        // BẰNG CHỨNG DATABASE:
        // Capacity = 1 tuyệt đối không bị vượt qua (active reservations = 1)
        assertThat(slotReservationRepository.countActiveReservations(hotSection.getId(), now)).isEqualTo(1L);
    }

    @Test
    @DisplayName("Test 5 — Duplicate Course: Request chứa trùng một mã lớp hoặc 2 lớp cùng môn -> Từ chối và rollback")
    void test5_DuplicateCourse_Rejected() {
        LocalDateTime now = LocalDateTime.now();

        // 5.1 Trùng cùng một ID lớp học phần
        BatchReserveRequest requestWithSameSection = new BatchReserveRequest(List.of(
                sec1.getId(), sec2.getId(), sec1.getId()
        ));

        assertThatThrownBy(() -> optimizerService.batchReserveSlots(student1.getStudentCode(), requestWithSameSection))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertThat(bre.getDetails().getReason()).isEqualTo("DUPLICATE_COURSE");
                });

        assertThat(slotReservationRepository.countActiveReservations(sec1.getId(), now)).isEqualTo(0L);

        // 5.2 Hai lớp khác nhau nhưng cùng thuộc một Course
        LecturerProfile lecturer = entityManager.getReference(LecturerProfile.class, 1L);
        String runId = UUID.randomUUID().toString().substring(0, 8);
        ClassSection sec1Dup = createAndSaveSection("SEC1-DUP-" + runId, testCourse1, lecturer, 10, 0, "OPEN");

        BatchReserveRequest requestWithSameCourse = new BatchReserveRequest(List.of(
                sec1.getId(), sec1Dup.getId()
        ));

        assertThatThrownBy(() -> optimizerService.batchReserveSlots(student1.getStudentCode(), requestWithSameCourse))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertThat(bre.getDetails().getReason()).isEqualTo("DUPLICATE_COURSE");
                    assertThat(bre.getDetails().getFailedCourseId()).isEqualTo(testCourse1.getCourseCode());
                });

        assertThat(slotReservationRepository.countActiveReservations(sec1.getId(), now)).isEqualTo(0L);
        assertThat(slotReservationRepository.countActiveReservations(sec1Dup.getId(), now)).isEqualTo(0L);
    }

    @Test
    @DisplayName("Test 6 — Exception During Batch: Transaction rollback toàn bộ và database không có dữ liệu dở dang")
    void test6_ExceptionDuringBatch_RollbackClean() {
        LocalDateTime now = LocalDateTime.now();

        // Section 3 không tồn tại (ID giả = 999999L)
        BatchReserveRequest request = new BatchReserveRequest(List.of(
                sec1.getId(), sec2.getId(), 999999L, sec4.getId()
        ));

        long countBefore = slotReservationRepository.count();

        assertThatThrownBy(() -> optimizerService.batchReserveSlots(student1.getStudentCode(), request))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertThat(bre.getDetails().getReason()).isEqualTo("SECTION_NOT_FOUND");
                });

        // BẰNG CHỨNG DATABASE: Không có bản ghi nào bị lưu dở dang
        assertThat(slotReservationRepository.count()).isEqualTo(countBefore);
        assertThat(slotReservationRepository.countActiveReservations(sec1.getId(), now)).isEqualTo(0L);
        assertThat(slotReservationRepository.countActiveReservations(sec2.getId(), now)).isEqualTo(0L);
    }

    @Test
    @DisplayName("Test 7 — Existing Enrollment Conflict: Sinh viên đã đăng ký một môn trong combo -> Từ chối toàn bộ combo")
    void test7_ExistingEnrollmentConflict_RollsBackAll() {
        LocalDateTime now = LocalDateTime.now();

        // Sinh viên 1 đã có đăng ký chính thức ở môn 1 (sec1)
        Enrollment existingEnrollment = new Enrollment();
        existingEnrollment.setStudent(student1);
        existingEnrollment.setClassSection(sec1);
        existingEnrollment.setStatus("REGISTERED");
        Enrollment savedEnrollment = enrollmentRepository.save(existingEnrollment);
        createdEnrollmentIds.add(savedEnrollment.getId());

        BatchReserveRequest request = new BatchReserveRequest(List.of(
                sec1.getId(), sec2.getId()
        ));

        assertThatThrownBy(() -> optimizerService.batchReserveSlots(student1.getStudentCode(), request))
                .isInstanceOf(BatchReservationException.class)
                .satisfies(ex -> {
                    BatchReservationException bre = (BatchReservationException) ex;
                    assertThat(bre.getDetails().getReason()).isEqualTo("ALREADY_ENROLLED");
                    assertThat(bre.getDetails().getFailedCourseId()).isEqualTo(testCourse1.getCourseCode());
                });

        // BẰNG CHỨNG DATABASE: Không giữ chỗ dở dang cho sec2
        assertThat(slotReservationRepository.countActiveReservations(sec2.getId(), now)).isEqualTo(0L);
    }

    @Test
    @DisplayName("Test 8 — MockMvc API HTTP 409 & Error JSON Contract: Trả về đúng mã 409 và cấu trúc JSON chuẩn đặc tả")
    void test8_MockMvcApiBatchReserve_Returns409AndExactJson() throws Exception {
        // Cấu hình sec4 hết chỗ
        sec4.setCurrentEnrolled(10);
        classSectionRepository.save(sec4);

        BatchReserveRequest request = new BatchReserveRequest(List.of(
                sec1.getId(), sec2.getId(), sec3.getId(), sec4.getId()
        ));

        MvcResult result = mockMvc.perform(post("/api/v1/student/schedule-optimizer/batch-reserve")
                        .header("X-User-Username", student1.getStudentCode())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("BATCH_RESERVATION_FAILED"))
                .andExpect(jsonPath("$.message").value("Không thể đăng ký toàn bộ combo học phần."))
                .andExpect(jsonPath("$.details.failedCourseId").value(testCourse4.getCourseCode()))
                .andExpect(jsonPath("$.details.failedCourseName").value(testCourse4.getName()))
                .andExpect(jsonPath("$.details.reason").value("NO_AVAILABLE_SLOTS"))
                .andExpect(jsonPath("$.details.message").value("Học phần đã hết chỗ."))
                .andReturn();

        String responseJson = result.getResponse().getContentAsString();
        log.info("API 409 Response JSON: {}", responseJson);

        JsonNode jsonNode = objectMapper.readTree(responseJson);
        assertThat(jsonNode.get("success").asBoolean()).isFalse();
        assertThat(jsonNode.get("code").asText()).isEqualTo("BATCH_RESERVATION_FAILED");
        assertThat(jsonNode.get("details").get("reason").asText()).isEqualTo("NO_AVAILABLE_SLOTS");
    }
}
