package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.dto.EnrollmentResponse;
import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.exception.BusinessException;
import com.rikkei.eduportal.enrollment.exception.GlobalExceptionHandler;
import com.rikkei.eduportal.enrollment.repository.*;
import jakarta.persistence.Version;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Kiểm thử Concurrency: Khóa Lạc Quan (@Version) & Chống Overbooking Đăng Ký Học Phần")
class RegistrationOptimisticLockingAndAntiOverbookingTest {

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private ClassSectionRepository classSectionRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private GradeRepository gradeRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private StudentDashboardService dashboardService;

    @Mock
    private RealtimeSeatService realtimeSeatService;

    @Mock
    private SlotReservationRepository reservationRepository;

    @InjectMocks
    private CourseRegistrationService registrationService;

    private GlobalExceptionHandler globalExceptionHandler;

    private Course course;
    private ClassSection section;

    @BeforeEach
    void setUp() {
        globalExceptionHandler = new GlobalExceptionHandler();

        course = new Course();
        course.setId(10L);
        course.setCourseCode("CS201");
        course.setName("Cấu trúc Dữ liệu & Giải thuật");
        course.setCredits(3);
        course.setWeeklyHours(4);

        section = new ClassSection();
        section.setId(100L);
        section.setSectionCode("CS201-2025-01");
        section.setCourse(course);
        section.setSemesterName("2024-25_SEM2");
        section.setDayOfWeek("MON");
        section.setStartTime(LocalTime.of(8, 0));
        section.setEndTime(LocalTime.of(10, 0));
        section.setMaxCapacity(40);
        section.setCurrentEnrolled(35);
        section.setVersion(0);
        section.setStatus("OPEN");
    }

    @Test
    @DisplayName("TC-OPT-01: Entity ClassSection phải khai báo @Version cho khóa lạc quan")
    void testOptimisticLocking_AnnotationPresentOnEntity() throws NoSuchFieldException {
        Field versionField = ClassSection.class.getDeclaredField("version");
        assertNotNull(versionField, "ClassSection phải có trường version");
        assertTrue(versionField.isAnnotationPresent(Version.class),
                "Trường version trên ClassSection phải được đánh dấu annotation @jakarta.persistence.Version");

        assertEquals(0, section.getVersion(), "Phiên bản khởi tạo mặc định phải là 0");
        section.setVersion(1);
        assertEquals(1, section.getVersion(), "Phiên bản version có thể cập nhật sau mỗi commit");
    }

    @Test
    @DisplayName("TC-OPT-02: Mô phỏng xung đột khóa lạc quan (Stale Version) ném OptimisticLockingFailureException")
    void testOptimisticLocking_ConflictThrowsOptimisticLockingFailureException() {
        StudentProfile studentA = createStudent(1L, "SV001");
        when(dashboardService.resolveStudent("SV001")).thenReturn(studentA);
        when(reservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(1L), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.empty());
        when(reservationRepository.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(0L);

        // Giả lập: Thread đọc section ở version 0
        section.setVersion(0);
        when(classSectionRepository.findByIdWithLock(100L)).thenReturn(Optional.of(section));

        // Khi lưu, giả lập một giao dịch khác đã commit trước làm version không khớp
        when(classSectionRepository.save(any(ClassSection.class)))
                .thenThrow(new OptimisticLockingFailureException(
                        "Row was updated or deleted by another transaction (or unsaved-value mapping was incorrect): [ClassSection#100]"));

        OptimisticLockingFailureException ex = assertThrows(OptimisticLockingFailureException.class, () ->
                registrationService.enroll("SV001", 100L)
        );

        assertTrue(ex.getMessage().contains("Row was updated or deleted by another transaction"),
                "Thông điệp ngoại lệ phải phản ánh đúng xung đột cập nhật đồng thời");
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("TC-OPT-03: GlobalExceptionHandler xử lý OptimisticLockingFailureException trả về HTTP 409 Conflict")
    void testOptimisticLocking_GlobalExceptionHandlerReturns409Conflict() {
        OptimisticLockingFailureException exception = new OptimisticLockingFailureException("Optimistic lock conflict on ClassSection#100");

        ResponseEntity<ApiResponse<Void>> response = globalExceptionHandler.handleOptimisticLocking(exception);

        assertNotNull(response);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode(), "Mã HTTP trả về phải là 409 CONFLICT");
        assertNotNull(response.getBody());
        assertEquals(409, response.getBody().getStatus());
        assertTrue(response.getBody().getMessage().contains("Hệ thống đang có nhiều sinh viên cùng đăng ký môn học này"),
                "Phải trả về thông báo thân thiện hướng dẫn sinh viên thử lại");
    }

    @Test
    @DisplayName("TC-OPT-04: Xung đột Khóa Lạc Quan trực diện - 10 luồng cùng commit trên version 0, chỉ 1 luồng thành công, 9 luồng bị chặn")
    void testOptimisticLocking_DirectConcurrentClash_OnlyOneSucceedsWithoutRetry() throws Exception {
        int threadCount = 10;
        AtomicInteger currentVersion = new AtomicInteger(0);

        when(classSectionRepository.findByIdWithLock(100L)).thenAnswer(inv -> {
            ClassSection copy = new ClassSection();
            copy.setId(section.getId());
            copy.setSectionCode(section.getSectionCode());
            copy.setCourse(section.getCourse());
            copy.setSemesterName(section.getSemesterName());
            copy.setMaxCapacity(40);
            copy.setCurrentEnrolled(35);
            copy.setVersion(0); // Tất cả 10 luồng đều đọc được version 0 ban đầu
            copy.setStatus("OPEN");
            return Optional.of(copy);
        });

        when(classSectionRepository.save(any(ClassSection.class))).thenAnswer(inv -> {
            ClassSection toSave = inv.getArgument(0);
            synchronized (currentVersion) {
                // Kiểm tra CAS (Compare-And-Swap) chuẩn của JPA Optimistic Locking
                if (!Objects.equals(toSave.getVersion(), currentVersion.get())) {
                    throw new OptimisticLockingFailureException(String.format(
                            "Optimistic lock conflict! Expected version %d but got %d",
                            currentVersion.get(), toSave.getVersion()));
                }
                currentVersion.incrementAndGet();
                toSave.setVersion(currentVersion.get());
                return toSave;
            }
        });

        when(dashboardService.resolveStudent(anyString())).thenAnswer(inv ->
                createStudent(1000L + inv.getArgument(0).hashCode(), inv.getArgument(0)));
        when(reservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(anyLong(), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.empty());
        when(reservationRepository.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(0L);

        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> {
            Enrollment e = inv.getArgument(0);
            e.setId(System.nanoTime());
            return e;
        });

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startSignal = new CountDownLatch(1);
        CountDownLatch doneSignal = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final String code = "SV_CLASH_" + i;
            executor.submit(() -> {
                try {
                    startSignal.await();
                    registrationService.enroll(code, 100L);
                    successCount.incrementAndGet();
                } catch (OptimisticLockingFailureException ex) {
                    conflictCount.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    doneSignal.countDown();
                }
            });
        }

        startSignal.countDown();
        boolean finished = doneSignal.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(finished);
        assertEquals(1, successCount.get(), "Chính xác chỉ có 1 luồng commit đầu tiên thành công");
        assertEquals(9, conflictCount.get(), "9 luồng còn lại bị từ chối với OptimisticLockingFailureException vì stale version");
        assertEquals(1, currentVersion.get(), "Phiên bản version trong DB tăng lên 1 duy nhất");
    }

    @Test
    @DisplayName("TC-OPT-05: Chống Overbooking - 20 luồng đồng thời tranh 5 suất cuối cùng, đúng 5 luồng thành công, sĩ số dừng đúng 40")
    void testAntiOverbooking_HighConcurrencyWithOptimisticRetry_ExactCapacityRespected() throws Exception {
        // Section: maxCapacity = 40, currentEnrolled = 35 -> Còn đúng 5 chỗ trống
        int maxCapacity = 40;
        int initialEnrolled = 35;
        AtomicInteger currentEnrolled = new AtomicInteger(initialEnrolled);
        AtomicInteger dbVersion = new AtomicInteger(0);

        int totalThreads = 20;
        int expectedSuccess = 5;
        int expectedFailure = 15;

        // Mô phỏng JPA Database với Optimistic Locking: Đọc version hiện tại
        when(classSectionRepository.findByIdWithLock(100L)).thenAnswer(inv -> {
            ClassSection copy = new ClassSection();
            copy.setId(section.getId());
            copy.setSectionCode(section.getSectionCode());
            copy.setCourse(section.getCourse());
            copy.setSemesterName(section.getSemesterName());
            copy.setMaxCapacity(maxCapacity);
            copy.setCurrentEnrolled(currentEnrolled.get());
            copy.setVersion(dbVersion.get());
            copy.setStatus("OPEN");
            return Optional.of(copy);
        });

        // Mô phỏng JPA Compare-And-Swap (@Version check khi commit)
        when(classSectionRepository.save(any(ClassSection.class))).thenAnswer(inv -> {
            ClassSection toSave = inv.getArgument(0);
            synchronized (dbVersion) {
                if (!Objects.equals(toSave.getVersion(), dbVersion.get())) {
                    throw new OptimisticLockingFailureException(
                            "Optimistic lock conflict on ClassSection#100. Current version is " + dbVersion.get());
                }
                dbVersion.incrementAndGet();
                currentEnrolled.set(toSave.getCurrentEnrolled());
                toSave.setVersion(dbVersion.get());
                return toSave;
            }
        });

        when(dashboardService.resolveStudent(anyString())).thenAnswer(inv -> {
            String code = inv.getArgument(0);
            long id = Math.abs(code.hashCode()) + 1L;
            return createStudent(id, code);
        });

        when(reservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(anyLong(), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.empty());
        when(reservationRepository.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(0L);

        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> {
            Enrollment e = inv.getArgument(0);
            e.setId(System.nanoTime());
            return e;
        });

        ExecutorService executor = Executors.newFixedThreadPool(totalThreads);
        CountDownLatch startSignal = new CountDownLatch(1);
        CountDownLatch doneSignal = new CountDownLatch(totalThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger capacityRejectedCount = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < totalThreads; i++) {
            final String studentCode = "SV2024_" + i;
            executor.submit(() -> {
                try {
                    startSignal.await(); // Toàn bộ 20 thread kích hoạt cùng 1 tích tắc
                    EnrollmentResponse resp = enrollWithRetry(studentCode, 100L, 15);
                    if (resp != null && "REGISTERED".equals(resp.getStatus())) {
                        successCount.incrementAndGet();
                    }
                } catch (BusinessException be) {
                    if (be.getMessage().contains("hết chỗ khả dụng") || be.getMessage().contains("đầy sĩ số")) {
                        capacityRejectedCount.incrementAndGet();
                    } else {
                        unexpectedErrors.add(be);
                    }
                } catch (Throwable t) {
                    unexpectedErrors.add(t);
                } finally {
                    doneSignal.countDown();
                }
            });
        }

        // Bắn tín hiệu xuất phát đồng thời cho tất cả các luồng
        startSignal.countDown();
        boolean finished = doneSignal.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(finished, "Toàn bộ 20 luồng đồng thời phải hoàn tất trong vòng 5 giây");
        assertTrue(unexpectedErrors.isEmpty(), "Không được phát sinh lỗi bất thường: " + unexpectedErrors);

        // KHẲNG ĐỊNH CỐT LÕI VỀ CHỐNG OVERBOOKING & KHÓA LẠC QUAN
        assertEquals(expectedSuccess, successCount.get(),
                "Chính xác chỉ có đúng 5 sinh viên đăng ký thành công cho 5 chỗ trống còn lại");
        assertEquals(expectedFailure, capacityRejectedCount.get(),
                "Chính xác 15 sinh viên còn lại phải bị từ chối với thông báo hết chỗ khả dụng");
        assertEquals(40, currentEnrolled.get(),
                "Sĩ số lớp sau cùng phải dừng ở đúng 40/40, TUYỆT ĐỐI KHÔNG BỊ OVERBOOKING!");
        assertEquals(5, dbVersion.get(),
                "Version của ClassSection tăng đúng 5 lần tương ứng 5 giao dịch cập nhật thành công");
    }

    @Test
    @DisplayName("TC-OPT-06: Chống Overbooking - Lớp đã đầy (40/40), toàn bộ 10 request đồng thời đều bị từ chối")
    void testAntiOverbooking_ZeroSeatsAvailable_AllConcurrentRequestsRejected() throws Exception {
        section.setMaxCapacity(40);
        section.setCurrentEnrolled(40); // Đã đầy sĩ số

        when(classSectionRepository.findByIdWithLock(100L)).thenReturn(Optional.of(section));
        when(dashboardService.resolveStudent(anyString())).thenAnswer(inv -> {
            String code = inv.getArgument(0);
            return createStudent(1L, code);
        });
        when(reservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(anyLong(), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.empty());
        when(reservationRepository.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(0L);

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch endGate = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final String studentCode = "SV_FULL_" + i;
            executor.submit(() -> {
                try {
                    startGate.await();
                    registrationService.enroll(studentCode, 100L);
                    successCount.incrementAndGet();
                } catch (BusinessException be) {
                    if (be.getMessage().contains("hết chỗ") || be.getMessage().contains("đầy sĩ số")) {
                        rejectedCount.incrementAndGet();
                    }
                } catch (Exception ignored) {
                } finally {
                    endGate.countDown();
                }
            });
        }

        startGate.countDown();
        boolean done = endGate.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(done);
        assertEquals(0, successCount.get(), "Không có bất kỳ request nào được đăng ký thành công");
        assertEquals(10, rejectedCount.get(), "Toàn bộ 10 request đồng thời phải bị từ chối");
        assertEquals(40, section.getCurrentEnrolled(), "Sĩ số lớp vẫn giữ nguyên 40");
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("TC-OPT-07: Chống Overbooking & Cướp Slot - Chặn sinh viên vãng lai đồng thời để bảo vệ 2 slot đang được giữ chỗ")
    void testAntiOverbooking_SlotReservationProtection_RejectsUnreservedConcurrentUsers() throws Exception {
        // Lớp: maxCapacity = 40, currentEnrolled = 38, activeReservations = 2
        // Sĩ số khả dụng = 40 - 38 - 2 = 0 chỗ trống cho người ngoài
        section.setMaxCapacity(40);
        section.setCurrentEnrolled(38);

        when(classSectionRepository.findByIdWithLock(100L)).thenReturn(Optional.of(section));
        when(reservationRepository.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(2L);

        // Sinh viên ngoài SV_OUTSIDER không có phiên giữ chỗ
        when(reservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(999L), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.empty());

        StudentProfile outsider = createStudent(999L, "SV_OUTSIDER");
        when(dashboardService.resolveStudent("SV_OUTSIDER")).thenReturn(outsider);

        // Thử đăng ký bởi sinh viên không có giữ chỗ -> Phải bị chặn
        BusinessException ex = assertThrows(BusinessException.class, () ->
                registrationService.enroll("SV_OUTSIDER", 100L)
        );

        assertTrue(ex.getMessage().contains("chỗ đang được sinh viên khác tạm giữ trong 5 phút"),
                "Phải thông báo rõ về số lượng chỗ đang bị tạm giữ để chống overbooking và cướp slot");

        // Giờ giả lập SV_HOLDER là người đang giữ 1 trong 2 slot đó
        StudentProfile holder = createStudent(888L, "SV_HOLDER");
        SlotReservation myHold = new SlotReservation();
        myHold.setId(1L);
        myHold.setStudent(holder);
        myHold.setClassSection(section);
        myHold.setStatus("ACTIVE");
        myHold.setExpiresAt(LocalDateTime.now().plusMinutes(4));

        when(dashboardService.resolveStudent("SV_HOLDER")).thenReturn(holder);
        when(reservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(888L), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.of(myHold));

        Enrollment savedEnrollment = new Enrollment();
        savedEnrollment.setId(777L);
        savedEnrollment.setStudent(holder);
        savedEnrollment.setClassSection(section);
        savedEnrollment.setStatus("REGISTERED");
        savedEnrollment.setHasConflict(false);
        when(enrollmentRepository.save(any(Enrollment.class))).thenReturn(savedEnrollment);

        EnrollmentResponse holdResponse = registrationService.enroll("SV_HOLDER", 100L);

        assertNotNull(holdResponse);
        assertEquals("REGISTERED", holdResponse.getStatus());
        assertEquals(39, section.getCurrentEnrolled(), "Sĩ số tăng lên 39 hợp lệ khi người giữ chỗ xác nhận");
        verify(realtimeSeatService).markCommitted(888L, 100L);
    }

    @Test
    @DisplayName("TC-OPT-08: Mô phỏng cơ chế Retry an toàn khi gặp xung đột Khóa Lạc Quan (@Version)")
    void testOptimisticLocking_RetryPattern_SucceedsWhenSeatsAvailable() {
        StudentProfile student = createStudent(1L, "SV_RETRY");
        when(dashboardService.resolveStudent("SV_RETRY")).thenReturn(student);
        when(reservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(1L), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.empty());
        when(reservationRepository.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(0L);

        section.setMaxCapacity(40);
        section.setCurrentEnrolled(35);
        section.setVersion(0);

        ClassSection freshSection = new ClassSection();
        freshSection.setId(100L);
        freshSection.setSectionCode(section.getSectionCode());
        freshSection.setCourse(course);
        freshSection.setSemesterName(section.getSemesterName());
        freshSection.setMaxCapacity(40);
        freshSection.setCurrentEnrolled(36); // Luồng khác đã tăng lên 36
        freshSection.setVersion(1);          // Version tăng lên 1
        freshSection.setStatus("OPEN");

        // Mock lần 1 trả về section cũ (v0), lần 2 trả về freshSection (v1)
        when(classSectionRepository.findByIdWithLock(100L))
                .thenReturn(Optional.of(section))
                .thenReturn(Optional.of(freshSection));

        // Mock lần 1 save ném OptimisticLockingFailureException, lần 2 save thành công
        when(classSectionRepository.save(any(ClassSection.class)))
                .thenThrow(new OptimisticLockingFailureException("Version conflict on ClassSection#100"))
                .thenAnswer(inv -> {
                    ClassSection s = inv.getArgument(0);
                    s.setVersion(2);
                    return s;
                });

        Enrollment savedEnrollment = new Enrollment();
        savedEnrollment.setId(999L);
        savedEnrollment.setStatus("REGISTERED");
        when(enrollmentRepository.save(any(Enrollment.class))).thenReturn(savedEnrollment);

        EnrollmentResponse response = enrollWithRetry("SV_RETRY", 100L, 3);

        assertNotNull(response);
        assertEquals("REGISTERED", response.getStatus());
        assertEquals(37, freshSection.getCurrentEnrolled(), "Sĩ số cập nhật chính xác lên 37");
        assertEquals(2, freshSection.getVersion(), "Phiên bản version tăng lên 2");
    }

    @Test
    @DisplayName("TC-OPT-09: Cơ chế Retry khi gặp Khóa Lạc Quan dừng lại an toàn nếu lớp đã đầy, không gây Overbooking")
    void testOptimisticLocking_RetryPattern_AbortsWhenCapacityExhausted() {
        StudentProfile student = createStudent(1L, "SV_RETRY_FULL");
        when(dashboardService.resolveStudent("SV_RETRY_FULL")).thenReturn(student);
        when(reservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(1L), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.empty());
        when(reservationRepository.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(0L);

        section.setMaxCapacity(40);
        section.setCurrentEnrolled(39);
        section.setVersion(0);

        ClassSection exhaustedSection = new ClassSection();
        exhaustedSection.setId(100L);
        exhaustedSection.setSectionCode(section.getSectionCode());
        exhaustedSection.setCourse(course);
        exhaustedSection.setSemesterName(section.getSemesterName());
        exhaustedSection.setMaxCapacity(40);
        exhaustedSection.setCurrentEnrolled(40); // Đã bị luồng khác lấy mất slot cuối cùng!
        exhaustedSection.setVersion(1);
        exhaustedSection.setStatus("OPEN");

        // Lần 1 trả về section cũ (39/40), lần 2 trả về exhaustedSection (40/40)
        when(classSectionRepository.findByIdWithLock(100L))
                .thenReturn(Optional.of(section))
                .thenReturn(Optional.of(exhaustedSection));

        when(classSectionRepository.save(any(ClassSection.class)))
                .thenThrow(new OptimisticLockingFailureException("Stale version conflict"));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                enrollWithRetry("SV_RETRY_FULL", 100L, 3)
        );

        assertNotNull(ex);
        assertTrue(ex.getMessage().contains("hết chỗ khả dụng"),
                "Ngoại lệ thông báo rõ ràng về việc hết chỗ");
        assertEquals(40, exhaustedSection.getCurrentEnrolled(), "Không bao giờ ghi đè vượt quá maxCapacity 40");
    }

    private EnrollmentResponse enrollWithRetry(String studentCode, Long classSectionId, int maxRetries) {
        int attempts = 0;
        while (true) {
            attempts++;
            try {
                return registrationService.enroll(studentCode, classSectionId);
            } catch (OptimisticLockingFailureException ex) {
                if (attempts >= maxRetries) {
                    throw ex;
                }
                // Nhường CPU cho các thread khác commit rồi thử lại
                Thread.yield();
            }
        }
    }

    private StudentProfile createStudent(Long id, String studentCode) {
        StudentProfile s = new StudentProfile();
        s.setId(id);
        s.setStudentCode(studentCode);
        return s;
    }
}
