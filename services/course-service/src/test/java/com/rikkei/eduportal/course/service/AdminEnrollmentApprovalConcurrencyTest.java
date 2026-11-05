package com.rikkei.eduportal.course.service;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.common.SectionStatus;
import com.rikkei.eduportal.course.dto.response.PendingEnrollmentResponse;
import com.rikkei.eduportal.course.entity.*;
import com.rikkei.eduportal.course.exception.SectionCapacityFullException;
import com.rikkei.eduportal.course.repository.ClassSectionRepository;
import com.rikkei.eduportal.course.repository.EnrollmentRepository;
import jakarta.persistence.Version;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.OptimisticLockingFailureException;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Kiểm thử Concurrency: Phê Duyệt Đăng Ký, Khóa Lạc Quan & Chống Overbooking (Course Service)")
class AdminEnrollmentApprovalConcurrencyTest {

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private ClassSectionRepository classSectionRepository;

    @InjectMocks
    private AdminEnrollmentServiceImpl adminEnrollmentService;

    private ClassSection section;
    private Course course;

    @BeforeEach
    void setUp() {
        course = new Course("CS401", "Web Development", 3, 4, "Web Syllabus", null);
        course.setId(4L);

        User lecturerUser = new User();
        lecturerUser.setId(2L);
        lecturerUser.setFullName("Dr. Nguyen Van A");

        LecturerProfile lecturer = new LecturerProfile();
        lecturer.setId(1L);
        lecturer.setUser(lecturerUser);

        section = new ClassSection();
        section.setId(10L);
        section.setSectionCode("CS401-01");
        section.setCourse(course);
        section.setLecturer(lecturer);
        section.setSemesterName("2024-25_SEM1");
        section.setDayOfWeek("MON");
        section.setStartTime(LocalTime.of(8, 0));
        section.setEndTime(LocalTime.of(10, 0));
        section.setRoomName("A101");
        section.setMaxCapacity(35);
        section.setCurrentEnrolled(33); // Chỉ còn 2 suất trống
        section.setVersion(0);
        section.setStatus(SectionStatus.OPEN);
    }

    @Test
    @DisplayName("TC-CRS-OPT-01: Entity ClassSection trong course-service khai báo @Version")
    void testClassSection_HasOptimisticLockVersionAnnotation() throws NoSuchFieldException {
        Field versionField = ClassSection.class.getDeclaredField("version");
        assertNotNull(versionField);
        assertTrue(versionField.isAnnotationPresent(Version.class),
                "ClassSection trong course-service phải có @jakarta.persistence.Version");
        assertEquals(0, section.getVersion());
    }

    @Test
    @DisplayName("TC-CRS-OPT-02: Chống Overbooking - 10 yêu cầu phê duyệt đồng thời cho 2 suất trống, chỉ đúng 2 duyệt thành công, 8 bị từ chối")
    void testConcurrentApproval_OptimisticLockingAndAntiOverbooking() throws Exception {
        int maxCapacity = 35;
        int initialEnrolled = 33; // Còn đúng 2 chỗ
        AtomicInteger currentEnrolled = new AtomicInteger(initialEnrolled);
        AtomicInteger dbVersion = new AtomicInteger(0);

        int totalThreads = 10;
        int expectedSuccess = 2;
        int expectedRejected = 8;

        // Mô phỏng JPA Database Version check
        when(classSectionRepository.save(any(ClassSection.class))).thenAnswer(inv -> {
            ClassSection toSave = inv.getArgument(0);
            synchronized (dbVersion) {
                if (!Objects.equals(toSave.getVersion(), dbVersion.get())) {
                    throw new OptimisticLockingFailureException("Optimistic lock conflict on ClassSection#10");
                }
                dbVersion.incrementAndGet();
                currentEnrolled.set(toSave.getCurrentEnrolled());
                toSave.setVersion(dbVersion.get());
                return toSave;
            }
        });

        // Tạo 10 enrollment PENDING khác nhau
        Map<Long, Enrollment> pendingMap = new ConcurrentHashMap<>();
        for (long i = 1; i <= totalThreads; i++) {
            User studentUser = new User();
            studentUser.setId(100L + i);
            studentUser.setFullName("Sinh viên " + i);

            StudentProfile student = new StudentProfile();
            student.setId(i);
            student.setUser(studentUser);
            student.setStudentCode("SV_PENDING_" + i);

            Enrollment e = new Enrollment();
            e.setId(i);
            e.setStudent(student);
            e.setClassSection(section);
            e.setStatus(EnrollmentStatus.PENDING);
            e.setRegisteredAt(LocalDateTime.now());
            pendingMap.put(i, e);
        }

        when(enrollmentRepository.findById(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            Enrollment e = pendingMap.get(id);
            if (e != null) {
                // Trả về bản sao với trạng thái mới nhất của ClassSection
                Enrollment copy = new Enrollment();
                copy.setId(e.getId());
                copy.setStudent(e.getStudent());
                copy.setStatus(e.getStatus());
                copy.setRegisteredAt(e.getRegisteredAt());

                ClassSection secCopy = new ClassSection();
                secCopy.setId(section.getId());
                secCopy.setSectionCode(section.getSectionCode());
                secCopy.setCourse(section.getCourse());
                secCopy.setLecturer(section.getLecturer());
                secCopy.setMaxCapacity(maxCapacity);
                secCopy.setCurrentEnrolled(currentEnrolled.get());
                secCopy.setVersion(dbVersion.get());
                secCopy.setStatus(section.getStatus());
                copy.setClassSection(secCopy);

                return Optional.of(copy);
            }
            return Optional.empty();
        });

        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));

        ExecutorService executor = Executors.newFixedThreadPool(totalThreads);
        CountDownLatch startSignal = new CountDownLatch(1);
        CountDownLatch doneSignal = new CountDownLatch(totalThreads);

        AtomicInteger approvedCount = new AtomicInteger(0);
        AtomicInteger capacityExceededCount = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = Collections.synchronizedList(new ArrayList<>());

        for (long i = 1; i <= totalThreads; i++) {
            final long enrollmentId = i;
            executor.submit(() -> {
                try {
                    startSignal.await();
                    PendingEnrollmentResponse resp = approveWithRetry(enrollmentId, 10);
                    if (resp != null && EnrollmentStatus.REGISTERED == resp.getStatus()) {
                        approvedCount.incrementAndGet();
                    }
                } catch (SectionCapacityFullException sce) {
                    capacityExceededCount.incrementAndGet();
                } catch (Throwable t) {
                    unexpectedErrors.add(t);
                } finally {
                    doneSignal.countDown();
                }
            });
        }

        startSignal.countDown();
        boolean finished = doneSignal.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(finished, "Toàn bộ luồng phê duyệt phải kết thúc trong vòng 5 giây");
        assertTrue(unexpectedErrors.isEmpty(), "Không được có lỗi ngoài dự kiến: " + unexpectedErrors);

        // Khẳng định Chống Overbooking
        assertEquals(expectedSuccess, approvedCount.get(),
                "Chính xác chỉ có 2 đơn được phê duyệt thành công tương ứng 2 suất trống");
        assertEquals(expectedRejected, capacityExceededCount.get(),
                "8 đơn còn lại bị chặn do vượt quá sĩ số tối đa");
        assertEquals(35, currentEnrolled.get(),
                "Sĩ số cuối cùng của lớp đạt đúng 35/35, không thể vượt quá maxCapacity");
        assertEquals(2, dbVersion.get(),
                "Version của lớp tăng chính xác 2 lần");
    }

    private PendingEnrollmentResponse approveWithRetry(Long enrollmentId, int maxRetries) {
        int attempts = 0;
        while (true) {
            attempts++;
            try {
                return adminEnrollmentService.approveEnrollment(enrollmentId);
            } catch (OptimisticLockingFailureException ex) {
                if (attempts >= maxRetries) {
                    throw ex;
                }
                Thread.yield();
            }
        }
    }
}
