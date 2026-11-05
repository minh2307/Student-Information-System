package com.rikkei.eduportal.lecturer.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.lecturer.config.SecurityConfig;
import com.rikkei.eduportal.lecturer.dto.request.AttendanceCheckInRequest;
import com.rikkei.eduportal.lecturer.dto.request.StartAttendanceSessionRequest;
import com.rikkei.eduportal.lecturer.dto.response.AttendanceCheckInResponse;
import com.rikkei.eduportal.lecturer.dto.response.AttendanceSessionResponse;
import com.rikkei.eduportal.lecturer.dto.response.DynamicQrResponse;
import com.rikkei.eduportal.lecturer.exception.AccessDeniedException;
import com.rikkei.eduportal.lecturer.exception.AttendanceAlreadyCheckedInException;
import com.rikkei.eduportal.lecturer.exception.GlobalExceptionHandler;
import com.rikkei.eduportal.lecturer.exception.InvalidQrException;
import com.rikkei.eduportal.lecturer.security.*;
import com.rikkei.eduportal.lecturer.service.QrAttendanceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = QrAttendanceController.class)
@Import({
        SecurityConfig.class,
        JwtAuthenticationFilter.class,
        JwtAuthEntryPoint.class,
        JwtAccessDeniedHandler.class,
        JwtTokenProvider.class,
        GlobalExceptionHandler.class
})
@DisplayName("WebMvc Integration Test: QrAttendanceController REST Endpoints")
class QrAttendanceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private QrAttendanceService qrAttendanceService;

    @Test
    @WithMockUser(username = "sv2024001", roles = {"STUDENT"})
    @DisplayName("HTTP-01: Sinh viên điểm danh thành công → HTTP 200 OK kèm biên nhận chi tiết")
    void studentCheckIn_Success_ReturnsHttp200() throws Exception {
        AttendanceCheckInResponse response = new AttendanceCheckInResponse(
                10L,
                88L,
                "IT4409-2024-02",
                "Kiến trúc Vi dịch vụ",
                "sv2024001",
                "Nguyễn Văn C",
                LocalDateTime.now(),
                "Điểm danh thành công lúc 14:02:15"
        );

        when(qrAttendanceService.studentCheckIn(eq("sv2024001"), any(AttendanceCheckInRequest.class)))
                .thenReturn(response);

        AttendanceCheckInRequest req = new AttendanceCheckInRequest(
                "10.88.123456.signatureHash",
                "iPhone 15 - Safari Mobile",
                System.currentTimeMillis()
        );

        mockMvc.perform(post("/api/v1/attendance/check-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("Điểm danh thành công"))
                .andExpect(jsonPath("$.data.studentCode").value("sv2024001"))
                .andExpect(jsonPath("$.data.studentName").value("Nguyễn Văn C"))
                .andExpect(jsonPath("$.data.sectionCode").value("IT4409-2024-02"))
                .andExpect(jsonPath("$.data.courseName").value("Kiến trúc Vi dịch vụ"))
                .andExpect(jsonPath("$.data.message").value("Điểm danh thành công lúc 14:02:15"));
    }

    @Test
    @WithMockUser(username = "sv2024001", roles = {"STUDENT"})
    @DisplayName("HTTP-02: Điểm danh trùng lặp (Idempotent 409) → HTTP 409 Conflict 'ĐÃ ĐIỂM DANH TRƯỚC ĐÓ'")
    void studentCheckIn_Duplicate_ReturnsHttp409Conflict() throws Exception {
        when(qrAttendanceService.studentCheckIn(eq("sv2024001"), any(AttendanceCheckInRequest.class)))
                .thenThrow(new AttendanceAlreadyCheckedInException("ĐÃ ĐIỂM DANH TRƯỚC ĐÓ: Bạn đã điểm danh thành công phiên học này rồi."));

        AttendanceCheckInRequest req = new AttendanceCheckInRequest("10.88.123456.hash", "Mobile");

        mockMvc.perform(post("/api/v1/attendance/check-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("ĐÃ ĐIỂM DANH TRƯỚC ĐÓ: Bạn đã điểm danh thành công phiên học này rồi."));
    }

    @Test
    @WithMockUser(username = "sv2024001", roles = {"STUDENT"})
    @DisplayName("HTTP-03: Mã QR hết hạn hoặc phiên học đã đóng → HTTP 400 Bad Request")
    void studentCheckIn_ExpiredQr_ReturnsHttp400BadRequest() throws Exception {
        when(qrAttendanceService.studentCheckIn(eq("sv2024001"), any(AttendanceCheckInRequest.class)))
                .thenThrow(new InvalidQrException("Mã QR đã hết hạn. Vui lòng quét mã QR mới đang hiển thị trên màn hình."));

        AttendanceCheckInRequest req = new AttendanceCheckInRequest("10.88.9999.hash", "Mobile");

        mockMvc.perform(post("/api/v1/attendance/check-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Mã QR đã hết hạn. Vui lòng quét mã QR mới đang hiển thị trên màn hình."));
    }

    @Test
    @WithMockUser(username = "sv2024001", roles = {"STUDENT"})
    @DisplayName("HTTP-04: Sinh viên không thuộc danh sách lớp học phần → HTTP 403 Forbidden")
    void studentCheckIn_NotEnrolled_ReturnsHttp403Forbidden() throws Exception {
        when(qrAttendanceService.studentCheckIn(eq("sv2024001"), any(AttendanceCheckInRequest.class)))
                .thenThrow(new AccessDeniedException("Bạn không thuộc danh sách sinh viên lớp học phần này."));

        AttendanceCheckInRequest req = new AttendanceCheckInRequest("10.88.123456.hash", "Mobile");

        mockMvc.perform(post("/api/v1/attendance/check-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Bạn không thuộc danh sách sinh viên lớp học phần này."));
    }

    @Test
    @WithMockUser(username = "gv_hung", roles = {"LECTURER"})
    @DisplayName("HTTP-05: Giảng viên khởi tạo phiên điểm danh → HTTP 200 OK")
    void startSession_Lecturer_ReturnsHttp200() throws Exception {
        AttendanceSessionResponse res = new AttendanceSessionResponse(
                10L, 88L, "IT4409-01", "Kiến trúc Vi dịch vụ", "Điểm danh tuần 1",
                "ACTIVE", 15, 0, LocalDateTime.now(), null, List.of()
        );

        when(qrAttendanceService.startSession(eq("gv_hung"), eq(88L), any()))
                .thenReturn(res);

        StartAttendanceSessionRequest req = new StartAttendanceSessionRequest("Điểm danh tuần 1");

        mockMvc.perform(post("/api/v1/lecturer/classes/88/attendance/session")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.sessionId").value(10))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @WithMockUser(username = "gv_hung", roles = {"LECTURER"})
    @DisplayName("HTTP-06: Giảng viên lấy mã QR xoay vòng 15 giây → HTTP 200 OK kèm mã base64")
    void getRotatingQr_Lecturer_ReturnsHttp200() throws Exception {
        DynamicQrResponse qrRes = new DynamicQrResponse(
                10L, 88L, "10.88.1234.hash", "data:image/png;base64,iVBORw0KGgo...",
                15, 12, System.currentTimeMillis() + 12000
        );

        when(qrAttendanceService.getRotatingQrCode(eq("gv_hung"), eq(88L)))
                .thenReturn(qrRes);

        mockMvc.perform(get("/api/v1/lecturer/classes/88/attendance/qr-code"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.qrToken").value("10.88.1234.hash"))
                .andExpect(jsonPath("$.data.stepSeconds").value(15))
                .andExpect(jsonPath("$.data.remainingSeconds").value(12));
    }

    @Test
    @WithMockUser(username = "gv_hung", roles = {"LECTURER"})
    @DisplayName("HTTP-07: Giảng viên kết thúc phiên điểm danh → HTTP 200 OK")
    void closeSession_Lecturer_ReturnsHttp200() throws Exception {
        AttendanceSessionResponse res = new AttendanceSessionResponse(
                10L, 88L, "IT4409-01", "Kiến trúc Vi dịch vụ", "Điểm danh tuần 1",
                "CLOSED", 15, 30, LocalDateTime.now(), LocalDateTime.now(), List.of()
        );

        when(qrAttendanceService.closeSession(eq("gv_hung"), eq(88L)))
                .thenReturn(res);

        mockMvc.perform(post("/api/v1/lecturer/classes/88/attendance/close-session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.status").value("CLOSED"));
    }
}
