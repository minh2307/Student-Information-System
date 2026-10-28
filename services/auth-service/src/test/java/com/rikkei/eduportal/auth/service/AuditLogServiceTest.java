package com.rikkei.eduportal.auth.service;

import com.rikkei.eduportal.auth.dto.AuditLogResponse;
import com.rikkei.eduportal.auth.entity.AuditLog;
import com.rikkei.eduportal.auth.exception.ResourceNotFoundException;
import com.rikkei.eduportal.auth.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
}
