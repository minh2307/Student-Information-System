package com.rikkei.eduportal.auth.service;

import com.rikkei.eduportal.auth.dto.AuditLogResponse;
import com.rikkei.eduportal.auth.dto.CreateAuditLogRequest;
import com.rikkei.eduportal.auth.entity.AuditLog;
import com.rikkei.eduportal.auth.exception.ResourceNotFoundException;
import com.rikkei.eduportal.auth.repository.AuditLogRepository;
import com.rikkei.eduportal.common.AuditDeltaPayload;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Test Suite: Immutable Academic Audit Trail (AuditLogService)")
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AuditLogService auditLogService;

    private AuditLog sampleLog;

    @BeforeEach
    void setUp() {
        sampleLog = new AuditLog(
                "USER_CREATED",
                "admin",
                "ROLE_ADMIN",
                "User",
                "10",
                "Tạo mới tài khoản sinh viên sv2024001",
                null,
                "username=sv2024001, role=STUDENT",
                "127.0.0.1"
        );
        sampleLog.setId(1L);
        sampleLog.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("TC-AUDIT-01: Ghi nhận sự kiện tạo người dùng mới thành công và lưu vào DB")
    void testRecordLog_userCreated_success() {
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(invocation -> {
            AuditLog log = invocation.getArgument(0);
            log.setId(100L);
            return log;
        });

        AuditLog saved = auditLogService.recordLog(
                "USER_CREATED",
                "admin",
                "ROLE_ADMIN",
                "User",
                "15",
                "Tạo mới tài khoản",
                null,
                "role=STUDENT",
                "192.168.1.10"
        );

        assertThat(saved).isNotNull();
        assertThat(saved.getId()).isEqualTo(100L);
        assertThat(saved.getAction()).isEqualTo("USER_CREATED");
        assertThat(saved.getActorUsername()).isEqualTo("admin");
        assertThat(saved.getTargetEntity()).isEqualTo("User");
        assertThat(saved.getTargetId()).isEqualTo("15");

        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("TC-AUDIT-02: Ghi nhận sự kiện khóa tài khoản người dùng với oldValue và newValue")
    void testRecordLog_userLocked_success() {
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuditLog saved = auditLogService.recordLog(
                "USER_LOCKED",
                "admin",
                "ROLE_ADMIN",
                "User",
                "10",
                "Khóa tài khoản sinh viên sv2024001 vi phạm quy chế",
                "ACTIVE",
                "LOCKED",
                "10.0.0.1"
        );

        assertThat(saved.getAction()).isEqualTo("USER_LOCKED");
        assertThat(saved.getOldValue()).isEqualTo("ACTIVE");
        assertThat(saved.getNewValue()).isEqualTo("LOCKED");
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("TC-AUDIT-03: Ghi nhận sự kiện đặt lại mật khẩu tài khoản người dùng")
    void testRecordLog_passwordReset_success() {
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuditLog saved = auditLogService.recordLog(
                "PASSWORD_RESET",
                "admin",
                "ROLE_ADMIN",
                "User",
                "10",
                "Đặt lại mật khẩu cho tài khoản sv2024001",
                "***",
                "***",
                null
        );

        assertThat(saved.getAction()).isEqualTo("PASSWORD_RESET");
        assertThat(saved.getSummary()).contains("Đặt lại mật khẩu");
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("TC-AUDIT-04: Lọc danh sách audit log theo action (e.g. USER_LOCKED)")
    void testGetAuditLogs_filterByAction() {
        when(auditLogRepository.filterLogs("USER_LOCKED", null, null))
                .thenReturn(List.of(sampleLog));

        List<AuditLogResponse> logs = auditLogService.getAuditLogs("USER_LOCKED", null, null);

        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).id()).isEqualTo(1L);
        verify(auditLogRepository, times(1)).filterLogs("USER_LOCKED", null, null);
    }

    @Test
    @DisplayName("TC-AUDIT-05: Lọc danh sách audit log theo actor username (admin)")
    void testGetAuditLogs_filterByActor() {
        when(auditLogRepository.filterLogs(null, "admin", null))
                .thenReturn(List.of(sampleLog));

        List<AuditLogResponse> logs = auditLogService.getAuditLogs(null, "admin", null);

        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).actorUsername()).isEqualTo("admin");
        verify(auditLogRepository, times(1)).filterLogs(null, "admin", null);
    }

    @Test
    @DisplayName("TC-AUDIT-06: Lấy chi tiết bản ghi kiểm toán theo ID thành công")
    void testGetAuditLogById_success() {
        when(auditLogRepository.findById(1L)).thenReturn(Optional.of(sampleLog));

        AuditLogResponse res = auditLogService.getAuditLogById(1L);

        assertThat(res).isNotNull();
        assertThat(res.id()).isEqualTo(1L);
        assertThat(res.action()).isEqualTo("USER_CREATED");
        assertThat(res.summary()).contains("sv2024001");
    }

    @Test
    @DisplayName("TC-AUDIT-07: Truy vấn bản ghi kiểm toán với ID không tồn tại ném ngoại lệ ResourceNotFoundException")
    void testGetAuditLogById_notFound_throwsException() {
        when(auditLogRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> auditLogService.getAuditLogById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy bản ghi nhật ký kiểm toán với ID: 999");
    }

    @Test
    @DisplayName("TC-AUDIT-08: Lấy toàn bộ lịch sử biến động của một đối tượng cụ thể")
    void testGetEntityHistory_success() {
        when(auditLogRepository.findByTargetEntityAndTargetIdOrderByCreatedAtDesc("User", "10"))
                .thenReturn(List.of(sampleLog));

        List<AuditLogResponse> history = auditLogService.getEntityHistory("User", "10");

        assertThat(history).hasSize(1);
        assertThat(history.get(0).targetEntity()).isEqualTo("User");
        assertThat(history.get(0).targetId()).isEqualTo("10");
        verify(auditLogRepository, times(1)).findByTargetEntityAndTargetIdOrderByCreatedAtDesc("User", "10");
    }

    @Test
    @DisplayName("TC-AUDIT-09: Ghi nhận kiểm toán dạng JSON Delta cấu trúc chuẩn thành công")
    void testRecordDeltaLog_success() {
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.rikkei.eduportal.common.AuditDeltaPayload delta = new com.rikkei.eduportal.common.AuditDeltaPayload("StudentGrade", "1029");
        delta.addDiff("midtermScore", 5.0, 8.5);
        delta.addDiff("letterGrade", "C", "A");
        delta.addMetadata("reason", "Phúc khảo bài thi");

        AuditLog saved = auditLogService.recordDeltaLog(
                "GRADE_UPDATED",
                "gv001",
                "ROLE_LECTURER",
                "StudentGrade",
                "1029",
                "Cập nhật điểm phúc khảo môn CS201",
                delta,
                "127.0.0.1"
        );

        assertThat(saved).isNotNull();
        assertThat(saved.getAction()).isEqualTo("GRADE_UPDATED");
        assertThat(saved.getNewValue()).contains("\"entity\":\"StudentGrade\"");
        assertThat(saved.getNewValue()).contains("\"midtermScore\"");
        assertThat(saved.getNewValue()).contains("\"from\":5.0");
        assertThat(saved.getNewValue()).contains("\"to\":8.5");
        assertThat(saved.getNewValue()).contains("\"reason\":\"Phúc khảo bài thi\"");

        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("TC-AUDIT-10: Tự động so sánh hai trạng thái đối tượng và sinh JSON Delta")
    void testRecordDiffLog_autoCalculatesDifferences() {
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        java.util.Map<String, Object> oldState = java.util.Map.of(
                "credits", 3,
                "maxCapacity", 40,
                "status", "OPEN"
        );
        java.util.Map<String, Object> newState = java.util.Map.of(
                "credits", 3,
                "maxCapacity", 50,
                "status", "OPEN"
        );

        AuditLog saved = auditLogService.recordDiffLog(
                "SECTION_CAPACITY_EXPANDED",
                "admin",
                "ROLE_ADMIN",
                "ClassSection",
                "205",
                "Mở rộng sĩ số lớp CS201",
                oldState,
                newState,
                java.util.Map.of("approvedBy", "Dean"),
                "192.168.1.100"
        );

        assertThat(saved).isNotNull();
        assertThat(saved.getNewValue()).contains("maxCapacity");
        assertThat(saved.getNewValue()).doesNotContain("credits"); // Không thay đổi thì không có trong diff
        assertThat(saved.getNewValue()).contains("\"from\":40");
        assertThat(saved.getNewValue()).contains("\"to\":50");
    }

    @Test
    @DisplayName("TC-AUDIT-11: Bóc tách chuỗi JSON Delta thành công")
    void testParseDelta_validAndInvalidJson() {
        String json = "{\"entity\":\"StudentGrade\",\"entityId\":\"10\",\"changedFields\":[\"score\"],\"diff\":{\"score\":{\"from\":5,\"to\":9}}}";
        Optional<com.rikkei.eduportal.common.AuditDeltaPayload> parsed = auditLogService.parseDelta(json);

        assertThat(parsed).isPresent();
        assertThat(parsed.get().getEntity()).isEqualTo("StudentGrade");
        assertThat(parsed.get().getChangedFields()).contains("score");
        assertThat(parsed.get().getDiff().get("score").getFrom()).isEqualTo(5);
        assertThat(parsed.get().getDiff().get("score").getTo()).isEqualTo(9);

        // Invalid JSON returns empty Optional
        assertThat(auditLogService.parseDelta("invalid-json")).isEmpty();
        assertThat(auditLogService.parseDelta("")).isEmpty();
        assertThat(auditLogService.parseDelta(null)).isEmpty();
    }

    @Test
    @DisplayName("TC-AUDIT-12: Ghi nhận kiểm toán từ CreateAuditLogRequest có kèm Delta payload")
    void testRecordFromRequest_withDelta_success() {
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateAuditLogRequest request = new CreateAuditLogRequest();
        request.setAction("COURSE_UPDATED");
        request.setActorUsername("admin");
        request.setActorRole("ROLE_ADMIN");
        request.setTargetEntity("Course");
        request.setTargetId("CS101");
        request.setSummary("Cập nhật số tín chỉ môn học");

        AuditDeltaPayload delta = new AuditDeltaPayload("Course", "CS101");
        delta.addDiff("credits", 3, 4);
        request.setDelta(delta);

        AuditLog saved = auditLogService.recordFromRequest(request, "127.0.0.1");

        assertThat(saved).isNotNull();
        assertThat(saved.getAction()).isEqualTo("COURSE_UPDATED");
        assertThat(saved.getNewValue()).contains("\"credits\"");
        assertThat(saved.getNewValue()).contains("\"from\":3");
        assertThat(saved.getNewValue()).contains("\"to\":4");
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("TC-AUDIT-13: Ghi nhận kiểm toán từ CreateAuditLogRequest không kèm Delta (oldValue & newValue)")
    void testRecordFromRequest_withoutDelta_success() {
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateAuditLogRequest request = new CreateAuditLogRequest();
        request.setAction("USER_STATUS_CHANGE");
        request.setActorUsername("supervisor");
        request.setActorRole("ROLE_ADMIN");
        request.setTargetEntity("User");
        request.setTargetId("99");
        request.setSummary("Đổi trạng thái tài khoản sang ACTIVE");
        request.setOldValue("INACTIVE");
        request.setNewValue("ACTIVE");

        AuditLog saved = auditLogService.recordFromRequest(request, "192.168.1.50");

        assertThat(saved).isNotNull();
        assertThat(saved.getAction()).isEqualTo("USER_STATUS_CHANGE");
        assertThat(saved.getOldValue()).isEqualTo("INACTIVE");
        assertThat(saved.getNewValue()).isEqualTo("ACTIVE");
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("TC-AUDIT-14: Ghi nhận recordDeltaLog khi payload là null")
    void testRecordDeltaLog_nullPayload_success() {
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuditLog saved = auditLogService.recordDeltaLog(
                "USER_DELETED",
                "admin",
                "ROLE_ADMIN",
                "User",
                "123",
                "Xóa người dùng",
                null,
                "127.0.0.1"
        );

        assertThat(saved).isNotNull();
        assertThat(saved.getNewValue()).isNull();
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("TC-AUDIT-15: Đảm bảo tất cả các method ghi log đều được khai báo @Transactional(propagation = REQUIRES_NEW)")
    void testTransactionPropagationRequiresNew_onAllRecordMethods() throws NoSuchMethodException {
        Method recordLogMethod = AuditLogService.class.getMethod(
                "recordLog", String.class, String.class, String.class, String.class, String.class, String.class, String.class, String.class, String.class);
        Transactional txRecordLog = recordLogMethod.getAnnotation(Transactional.class);
        assertThat(txRecordLog).isNotNull();
        assertThat(txRecordLog.propagation()).isEqualTo(Propagation.REQUIRES_NEW);

        Method recordDeltaLogMethod = AuditLogService.class.getMethod(
                "recordDeltaLog", String.class, String.class, String.class, String.class, String.class, String.class, AuditDeltaPayload.class, String.class);
        Transactional txRecordDeltaLog = recordDeltaLogMethod.getAnnotation(Transactional.class);
        assertThat(txRecordDeltaLog).isNotNull();
        assertThat(txRecordDeltaLog.propagation()).isEqualTo(Propagation.REQUIRES_NEW);

        Method recordDiffLogMethod = AuditLogService.class.getMethod(
                "recordDiffLog", String.class, String.class, String.class, String.class, String.class, String.class, java.util.Map.class, java.util.Map.class, java.util.Map.class, String.class);
        Transactional txRecordDiffLog = recordDiffLogMethod.getAnnotation(Transactional.class);
        assertThat(txRecordDiffLog).isNotNull();
        assertThat(txRecordDiffLog.propagation()).isEqualTo(Propagation.REQUIRES_NEW);

        Method recordFromRequestMethod = AuditLogService.class.getMethod(
                "recordFromRequest", CreateAuditLogRequest.class, String.class);
        Transactional txRecordFromRequest = recordFromRequestMethod.getAnnotation(Transactional.class);
        assertThat(txRecordFromRequest).isNotNull();
        assertThat(txRecordFromRequest.propagation()).isEqualTo(Propagation.REQUIRES_NEW);
    }
}
