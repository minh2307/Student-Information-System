package com.rikkei.eduportal.ai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.ai.client.EnrollmentServiceClient;
import com.rikkei.eduportal.ai.dto.*;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AcademicAdvisorE2ETest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private EnrollmentServiceClient enrollmentClient;

    private static final String SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private SecretKey key;
    private StudentAcademicContextDto sampleContext;

    @BeforeEach
    void setUp() {
        byte[] keyBytes = Decoders.BASE64.decode(SECRET);
        this.key = Keys.hmacShaKeyFor(keyBytes);

        sampleContext = new StudentAcademicContextDto();
        sampleContext.setStudentCode("SV2024001");
        sampleContext.setFullName("Nguyễn Văn C");
        sampleContext.setMajor("B.Tech Computer Science");
        sampleContext.setCurrentSemester(6);
        sampleContext.setCompletedCredits(84);
        sampleContext.setTotalRequiredCredits(160);
        sampleContext.setRegisteredCredits(6);
        sampleContext.setCurrentCgpa(BigDecimal.valueOf(8.74));
        sampleContext.setPreviousCgpa(BigDecimal.valueOf(8.62));
        sampleContext.setAcademicStanding("Xuất sắc");
        sampleContext.setAttendanceRate(96.0);

        CompletedCourseDto c1 = new CompletedCourseDto("CS101", "Programming Intro", 3, "2023-24_SEM1", "A", BigDecimal.valueOf(8.8));
        CompletedCourseDto c2 = new CompletedCourseDto("CS201", "DSA", 3, "2023-24_SEM2", "A", BigDecimal.valueOf(9.0));
        sampleContext.setCompletedCourses(List.of(c1, c2));

        AvailableCourseDto av = new AvailableCourseDto();
        av.setCourseCode("CS401");
        av.setCourseName("Web Development");
        av.setCredits(3);
        av.setPrerequisiteCourseCode("CS201");
        av.setPrerequisiteSatisfied(true);
        av.setAlreadyCompleted(false);
        av.setCurrentlyEnrolled(false);
        av.setHasScheduleConflict(false);
        av.setOpenSectionsCount(2);
        sampleContext.setAvailableCourses(List.of(av));
    }

    private String createStudentToken(String username) {
        return Jwts.builder()
                .subject(username)
                .claim("userId", 4L)
                .claim("role", "STUDENT")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3600000))
                .signWith(key)
                .compact();
    }

    @Test
    @DisplayName("E2E: Authenticated student receives personalized academic advice with real records")
    void e2e_consultAdvisor_withRealEnrollmentData() throws Exception {
        String token = createStudentToken("SV2024001");
        when(enrollmentClient.fetchAcademicContext(any(), eq("SV2024001"))).thenReturn(Optional.of(sampleContext));

        AcademicAdvisorRequest request = new AcademicAdvisorRequest("Tôi nên đăng ký những môn nào trong học kỳ tiếp theo?");

        mockMvc.perform(post("/api/v1/ai/academic-advisor")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reply").isNotEmpty())
                .andExpect(jsonPath("$.data.mode").value(oneOf("GEMINI", "FALLBACK")))
                .andExpect(jsonPath("$.data.academicSummary.studentCode").value("SV2024001"))
                .andExpect(jsonPath("$.data.academicSummary.completedCredits").value(84))
                .andExpect(jsonPath("$.data.academicSummary.currentCgpa").value(8.74))
                .andExpect(jsonPath("$.data.recommendations", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data.recommendations[0].courseCode").value("CS401"))
                .andExpect(jsonPath("$.data.recommendations[0].prerequisiteSatisfied").value(true));
    }

    @Test
    @DisplayName("E2E: Student Data Isolation - Attempted spoofing in request body is overridden by JWT identity")
    void e2e_studentDataIsolation_spoofedStudentCodeIsIgnored() throws Exception {
        String token = createStudentToken("SV2024001");
        when(enrollmentClient.fetchAcademicContext(any(), eq("SV2024001"))).thenReturn(Optional.of(sampleContext));

        // Attacker is logged in as SV2024001 but tries to pass studentCode = SV2024002 in payload
        AcademicAdvisorRequest request = new AcademicAdvisorRequest("Gợi ý môn học cho tôi");
        request.setStudentCode("SV2024002");

        mockMvc.perform(post("/api/v1/ai/academic-advisor")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.academicSummary.studentCode").value("SV2024001"));

        // Verify downstream call queried SV2024001 and NEVER SV2024002
        verify(enrollmentClient).fetchAcademicContext(any(), eq("SV2024001"));
    }

    @Test
    @DisplayName("E2E: Enrollment service failure returns controlled LIMITED mode without crashing")
    void e2e_enrollmentServiceFailure_returnsControlledLimitedMode() throws Exception {
        String token = createStudentToken("SV2024001");
        when(enrollmentClient.fetchAcademicContext(any(), eq("SV2024001"))).thenReturn(Optional.empty());

        AcademicAdvisorRequest request = new AcademicAdvisorRequest("Tôi muốn hỏi quy chế tín chỉ tối đa");

        mockMvc.perform(post("/api/v1/ai/academic-advisor")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.mode").value(oneOf("LIMITED", "FALLBACK")))
                .andExpect(jsonPath("$.data.reply").value(containsString("24 tín chỉ")))
                .andExpect(jsonPath("$.data.limitations").isArray());
    }

    @Test
    @DisplayName("E2E: Student inquires about real timetable - Receives formatted schedule table")
    void e2e_timetableInquiry_returnsRealScheduleWithConflictDetection() throws Exception {
        String token = createStudentToken("SV2024001");

        CurrentEnrollmentDto e1 = new CurrentEnrollmentDto("CS301", "DBMS", "CS301-01", 3, "MON", "09:00", "10:30", "Lab 1", "TS. A", "REGISTERED", false);
        CurrentEnrollmentDto e2 = new CurrentEnrollmentDto("CS402", "Software Engineering", "CS402-01", 3, "MON", "10:00", "11:30", "Lab 2", "ThS. B", "REGISTERED", true);
        sampleContext.setCurrentEnrollments(List.of(e1, e2));
        sampleContext.setScheduleConflictCount(1);
        sampleContext.setConflictingSections(List.of("CS402-01"));

        when(enrollmentClient.fetchAcademicContext(any(), eq("SV2024001"))).thenReturn(Optional.of(sampleContext));

        AcademicAdvisorRequest request = new AcademicAdvisorRequest("Thời khóa biểu tuần này của tôi");

        mockMvc.perform(post("/api/v1/ai/academic-advisor")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.category").value("TIMETABLE"))
                .andExpect(jsonPath("$.data.reply").value(containsString("Thời Khóa Biểu & Lịch Học Thực Tế")))
                .andExpect(jsonPath("$.data.reply").value(containsString("CS301")))
                .andExpect(jsonPath("$.data.reply").value(containsString("CS402")))
                .andExpect(jsonPath("$.data.reply").value(containsString("Trùng lịch")))
                .andExpect(jsonPath("$.data.academicSummary.scheduleConflictCount").value(1));
    }
}
