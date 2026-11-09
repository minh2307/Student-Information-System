package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.SlotReservationResponse;
import com.rikkei.eduportal.enrollment.entity.ClassSection;
import com.rikkei.eduportal.enrollment.entity.Course;
import com.rikkei.eduportal.enrollment.entity.SlotReservation;
import com.rikkei.eduportal.enrollment.entity.StudentProfile;
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
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Đo Tải & Kiểm Thử Độ Ổn Định 200 Kết Nối SSE Realtime (EDUP-204, SRS v2.1)")
class RealtimeSeatConcurrencyLoadTest {

    private static final int CONCURRENT_CONNECTIONS = 200;

    @Mock
    private SlotReservationRepository reservationRepo;

    @Mock
    private ClassSectionRepository classSectionRepo;

    @Mock
    private EnrollmentRepository enrollmentRepo;

    @Mock
    private StudentDashboardService dashboardService;

    @InjectMocks
    private RealtimeSeatService realtimeSeatService;

    private ClassSection sampleSection;
    private StudentProfile sampleStudent;

    @BeforeEach
    void setUp() {
        Course course = new Course();
        course.setId(10L);
        course.setCourseCode("CS101");
        course.setName("Lập trình Java Căn bản");

        sampleSection = new ClassSection();
        sampleSection.setId(100L);
        sampleSection.setSectionCode("CS101-01");
        sampleSection.setCourse(course);
        sampleSection.setMaxCapacity(50);
        sampleSection.setCurrentEnrolled(20);
        sampleSection.setStatus("OPEN");

        sampleStudent = new StudentProfile();
        sampleStudent.setId(1L);
        sampleStudent.setStudentCode("SV2024001");
    }

    @Test
    @DisplayName("TC-SSE-LOAD-01: Thiết lập đồng thời 200 kết nối SSE (100 Anonymous + 100 Authenticated)")
    void testConcurrent200SseSubscriptions() throws InterruptedException {
        int half = CONCURRENT_CONNECTIONS / 2;
        ExecutorService executor = Executors.newFixedThreadPool(25);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(CONCURRENT_CONNECTIONS);
        List<SseEmitter> emitters = new CopyOnWriteArrayList<>();
        AtomicInteger errorCount = new AtomicInteger(0);

        // Chuẩn bị mock cho 100 sinh viên authenticated
        for (int i = 0; i < half; i++) {
            long studentId = 1000L + i;
            String studentCode = "SV" + studentId;
            StudentProfile profile = new StudentProfile();
            profile.setId(studentId);
            profile.setStudentCode(studentCode);
            when(dashboardService.resolveStudent(studentCode)).thenReturn(profile);
        }

        // 100 Anonymous tasks
        for (int i = 0; i < half; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    SseEmitter emitter = realtimeSeatService.subscribeLiveSeats();
                    emitters.add(emitter);
                } catch (Exception e) {
                    errorCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // 100 Authenticated tasks
        for (int i = 0; i < half; i++) {
            final String studentCode = "SV" + (1000L + i);
            executor.submit(() -> {
                try {
                    startLatch.await();
                    SseEmitter emitter = realtimeSeatService.subscribeLiveSeatsAuthenticated(studentCode);
                    emitters.add(emitter);
                } catch (Exception e) {
                    errorCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Bắt đầu mở đồng loạt
        startLatch.countDown();
        boolean completed = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(errorCount.get()).isZero();
        assertThat(emitters).hasSize(CONCURRENT_CONNECTIONS);
        assertThat(realtimeSeatService.getTotalActiveConnectionCount()).isEqualTo(CONCURRENT_CONNECTIONS);
        assertThat(realtimeSeatService.getActiveAnonymousCount()).isEqualTo(half);
        assertThat(realtimeSeatService.getActiveAuthenticatedCount()).isEqualTo(half);
    }

    @Test
    @DisplayName("TC-SSE-LOAD-02: Đo độ trễ Broadcast SEAT_UPDATE đến toàn bộ 200 client phải <= 100ms")
    void testBroadcastLatencyUnder200Connections() throws InterruptedException {
        // Đăng ký 200 client
        for (int i = 0; i < 200; i++) {
            realtimeSeatService.subscribeLiveSeats();
        }
        assertThat(realtimeSeatService.getTotalActiveConnectionCount()).isEqualTo(200);

        when(classSectionRepo.findById(100L)).thenReturn(Optional.of(sampleSection));
        when(reservationRepo.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(2L);

        // Đo thời gian thực thi phát sóng
        long startTime = System.nanoTime();
        realtimeSeatService.broadcastSeatUpdate(100L);
        long elapsedNanos = System.nanoTime() - startTime;
        long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(elapsedNanos);

        // SRS v2.1 Yêu cầu: Độ trễ đẩy SSE <= 100ms
        assertThat(elapsedMillis)
                .as("Thời gian broadcast tới 200 kết nối SSE phải dưới 100ms (thực tế: %d ms)", elapsedMillis)
                .isLessThanOrEqualTo(100);

        // Xác nhận tất cả 200 kết nối vẫn nguyên vẹn
        assertThat(realtimeSeatService.getTotalActiveConnectionCount()).isEqualTo(200);
    }

    @Test
    @DisplayName("TC-SSE-LOAD-03: Chu kỳ Heartbeat quét 200 kết nối & tự động dọn Dead Emitters không leak memory")
    void testHeartbeatSweepAndDeadEmitterEvictionUnder200Connections() {
        // Mock SseEmitter đặc biệt để mô phỏng 30 socket bị ngắt kết nối đột ngột
        List<SseEmitter> healthyEmitters = new ArrayList<>();
        for (int i = 0; i < 170; i++) {
            healthyEmitters.add(realtimeSeatService.subscribeLiveSeats());
        }

        // Tạo 30 emitter và hoàn tất sớm để mô phỏng dead socket
        for (int i = 0; i < 30; i++) {
            SseEmitter deadEmitter = realtimeSeatService.subscribeLiveSeats();
            deadEmitter.complete(); // Đóng socket trước
        }

        assertThat(realtimeSeatService.getTotalActiveConnectionCount()).isGreaterThanOrEqualTo(170);

        // Thực hiện heartbeat 25s
        realtimeSeatService.sendHeartbeat();

        // Sau chu kỳ heartbeat, toàn bộ dead emitter phải bị thu hồi sạch sẽ
        assertThat(realtimeSeatService.getTotalActiveConnectionCount()).isEqualTo(170);
    }

    @Test
    @DisplayName("TC-SSE-LOAD-04: Giữ chỗ đồng thời (reserveSlot) khi đang duy trì 200 kết nối SSE")
    void testConcurrentReservationWith200ActiveListeners() throws InterruptedException {
        // Mở 200 kết nối lắng nghe
        for (int i = 0; i < 200; i++) {
            realtimeSeatService.subscribeLiveSeats();
        }

        when(classSectionRepo.findById(100L)).thenReturn(Optional.of(sampleSection));
        when(reservationRepo.findFirstByStudentIdAndClassSectionIdAndStatus(anyLong(), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.empty());
        when(enrollmentRepo.findByStudentIdAndClassSectionId(anyLong(), eq(100L))).thenReturn(Optional.empty());
        when(reservationRepo.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(0L);

        SlotReservation mockReservation = new SlotReservation(sampleStudent, sampleSection, 5);
        when(reservationRepo.save(any(SlotReservation.class))).thenReturn(mockReservation);

        when(dashboardService.resolveStudent(anyString())).thenAnswer(inv -> {
            String code = inv.getArgument(0);
            StudentProfile profile = new StudentProfile();
            try {
                profile.setId(Long.parseLong(code.replace("SV", "")));
            } catch (Exception e) {
                profile.setId(1L);
            }
            profile.setStudentCode(code);
            return profile;
        });

        int concurrentReserves = 30;
        ExecutorService reserveExecutor = Executors.newFixedThreadPool(10);
        CountDownLatch latch = new CountDownLatch(concurrentReserves);
        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < concurrentReserves; i++) {
            final String studentCode = "SV" + (2000L + i);
            reserveExecutor.submit(() -> {
                try {
                    SlotReservationResponse res = realtimeSeatService.reserveSlot(studentCode, 100L);
                    if (res != null && "ACTIVE".equals(res.status())) {
                        successCount.incrementAndGet();
                    }
                } catch (Exception ignored) {
                } finally {
                    latch.countDown();
                }
            });
        }

        boolean done = latch.await(10, TimeUnit.SECONDS);
        reserveExecutor.shutdown();

        assertThat(done).isTrue();
        assertThat(successCount.get()).isEqualTo(concurrentReserves);
        assertThat(realtimeSeatService.getTotalActiveConnectionCount()).isEqualTo(200);
    }
}
