package com.rikkei.eduportal.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.ai.config.AiConfig;
import com.rikkei.eduportal.ai.dto.GenerateSyllabusRequest;
import com.rikkei.eduportal.ai.dto.GenerateSyllabusResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;

import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SyllabusServiceImplTest {

    @Mock
    private ChatClient chatClient;

    @Mock
    private ChatClient.ChatClientRequestSpec requestSpec;

    @Mock
    private ChatClient.CallResponseSpec callSpec;

    @Mock
    private AiConfig aiConfig;

    private SyllabusPromptBuilder promptBuilder;
    private SyllabusFallbackService fallbackService;
    private ObjectMapper objectMapper;
    private SyllabusServiceImpl syllabusService;

    @BeforeEach
    void setUp() {
        promptBuilder = new SyllabusPromptBuilder();
        fallbackService = new SyllabusFallbackService();
        objectMapper = new ObjectMapper();
        syllabusService = new SyllabusServiceImpl(
                chatClient,
                aiConfig,
                promptBuilder,
                fallbackService,
                objectMapper
        );
    }

    @Test
    @DisplayName("Case 1: Live AI Generation Success - Parses structured JSON and formats syllabus")
    void case1_liveAiSuccess_shouldParseStructuredJsonAndReturnCompleteSyllabus() {
        when(aiConfig.isConfiguredWithRealKey()).thenReturn(true);
        when(aiConfig.getEffectiveModel()).thenReturn("gemini-1.5-flash");
        when(aiConfig.getProvider()).thenReturn("gemini");
        when(aiConfig.getTimeoutSeconds()).thenReturn(15);

        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.system(anyString())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(callSpec);

        String sampleAiJson = """
                ```json
                {
                  "courseName": "Trí tuệ nhân tạo (AI)",
                  "courseCode": "CS403",
                  "credits": 3,
                  "weeklyHours": 4,
                  "overview": "Môn học cung cấp kiến thức nền tảng về AI, Search, Machine Learning và LLM.",
                  "learningOutcomes": [
                    {"code": "CLO1", "description": "Hiểu các thuật toán tìm kiếm A*, Minimax", "bloomLevel": "Hiểu (Understand)"}
                  ],
                  "assessmentScheme": {
                    "attendanceRate": 10,
                    "midtermRate": 30,
                    "finalRate": 60
                  },
                  "weeklyTopics": [
                    {"week": 1, "topic": "Giới thiệu AI", "contents": "Lịch sử và ứng dụng", "teachingMethod": "Thuyết giảng", "assessment": "Điểm danh"}
                  ],
                  "textbooks": ["Artificial Intelligence: A Modern Approach"]
                }
                ```
                """;
        when(callSpec.content()).thenReturn(sampleAiJson);

        GenerateSyllabusRequest request = new GenerateSyllabusRequest(
                "Trí tuệ nhân tạo (AI)",
                3,
                "Machine Learning và LLM"
        );

        GenerateSyllabusResponse response = syllabusService.generateSyllabus(request);

        assertNotNull(response);
        assertEquals("Trí tuệ nhân tạo (AI)", response.getCourseName());
        assertEquals(3, response.getCredits());
        assertEquals("CS403", response.getCourseCode());
        assertFalse(response.isFallbackUsed());
        assertEquals("gemini", response.getProvider());
        assertEquals("gemini-1.5-flash", response.getModel());
        assertNotNull(response.getLearningOutcomes());
        assertEquals(1, response.getLearningOutcomes().size());
        assertNotNull(response.getSyllabus());
        assertTrue(response.getSyllabus().contains("ĐỀ CƯƠNG CHI TIẾT HỌC PHẦN"));
    }

    @Test
    @DisplayName("Case 2: Missing API Key - Switches directly to deterministic fallback")
    void case2_missingApiKey_shouldUseFallbackDirectly() {
        when(aiConfig.isConfiguredWithRealKey()).thenReturn(false);

        GenerateSyllabusRequest request = new GenerateSyllabusRequest(
                "Lập trình Hướng đối tượng",
                3,
                "Java core, OOP principles"
        );

        GenerateSyllabusResponse response = syllabusService.generateSyllabus(request);

        assertNotNull(response);
        assertTrue(response.isFallbackUsed());
        assertEquals("Lập trình Hướng đối tượng", response.getCourseName());
        verify(chatClient, never()).prompt();
    }

    @Test
    @DisplayName("Case 3: Empty Response from AI - Triggers fallback safely")
    void case3_emptyResponse_shouldTriggerFallback() {
        when(aiConfig.isConfiguredWithRealKey()).thenReturn(true);
        when(aiConfig.getEffectiveModel()).thenReturn("gemini-1.5-flash");
        when(aiConfig.getTimeoutSeconds()).thenReturn(10);

        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.system(anyString())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(callSpec);
        when(callSpec.content()).thenReturn("   ");

        GenerateSyllabusRequest request = new GenerateSyllabusRequest("Hệ điều hành", 3, "Linux OS");

        GenerateSyllabusResponse response = syllabusService.generateSyllabus(request);

        assertNotNull(response);
        assertTrue(response.isFallbackUsed());
        assertEquals("Hệ điều hành", response.getCourseName());
    }

    @Test
    @DisplayName("Case 4: InterruptedException - Restores interrupt flag, cancels future, and triggers fallback safely")
    void case4_interruptedException_shouldRestoreInterruptFlagAndInvokeFallback() throws Exception {
        ExecutorService mockExecutor = mock(ExecutorService.class);
        @SuppressWarnings("unchecked")
        Future<String> mockFuture = mock(Future.class);

        SyllabusServiceImpl serviceWithMockExecutor = new SyllabusServiceImpl(
                chatClient,
                aiConfig,
                promptBuilder,
                fallbackService,
                objectMapper,
                mockExecutor
        );

        when(aiConfig.isConfiguredWithRealKey()).thenReturn(true);
        when(mockExecutor.submit(any(Callable.class))).thenReturn(mockFuture);
        when(mockFuture.get(anyLong(), any(TimeUnit.class))).thenThrow(new InterruptedException("Syllabus thread interrupted"));

        GenerateSyllabusRequest request = new GenerateSyllabusRequest("Cơ sở dữ liệu", 3, "SQL & NoSQL");

        try {
            GenerateSyllabusResponse response = serviceWithMockExecutor.generateSyllabus(request);

            assertNotNull(response);
            assertTrue(response.isFallbackUsed());
            assertTrue(Thread.currentThread().isInterrupted(), "Thread interrupt flag must be restored!");
            verify(mockFuture).cancel(true);
        } finally {
            Thread.interrupted(); // reset test thread interrupt state
        }
    }

    @Test
    @DisplayName("Case 5: TimeoutException - Triggers timeout fallback and cancels future")
    void case5_timeoutException_shouldInvokeFallbackAndCancelFuture() throws Exception {
        ExecutorService mockExecutor = mock(ExecutorService.class);
        @SuppressWarnings("unchecked")
        Future<String> mockFuture = mock(Future.class);

        SyllabusServiceImpl serviceWithMockExecutor = new SyllabusServiceImpl(
                chatClient,
                aiConfig,
                promptBuilder,
                fallbackService,
                objectMapper,
                mockExecutor
        );

        when(aiConfig.isConfiguredWithRealKey()).thenReturn(true);
        when(aiConfig.getTimeoutSeconds()).thenReturn(15);
        when(mockExecutor.submit(any(Callable.class))).thenReturn(mockFuture);
        when(mockFuture.get(anyLong(), any(TimeUnit.class))).thenThrow(new TimeoutException("Syllabus call timeout"));

        GenerateSyllabusRequest request = new GenerateSyllabusRequest("Mạng máy tính", 3, "TCP/IP");

        GenerateSyllabusResponse response = serviceWithMockExecutor.generateSyllabus(request);

        assertNotNull(response);
        assertTrue(response.isFallbackUsed());
        verify(mockFuture).cancel(true);
        assertFalse(Thread.currentThread().isInterrupted());
    }

    @Test
    @DisplayName("Case 6: ExecutionException - AI Call Failure handled gracefully by fallback")
    void case6_executionException_shouldInvokeFallbackSafely() throws Exception {
        ExecutorService mockExecutor = mock(ExecutorService.class);
        @SuppressWarnings("unchecked")
        Future<String> mockFuture = mock(Future.class);

        SyllabusServiceImpl serviceWithMockExecutor = new SyllabusServiceImpl(
                chatClient,
                aiConfig,
                promptBuilder,
                fallbackService,
                objectMapper,
                mockExecutor
        );

        when(aiConfig.isConfiguredWithRealKey()).thenReturn(true);
        when(mockExecutor.submit(any(Callable.class))).thenReturn(mockFuture);
        when(mockFuture.get(anyLong(), any(TimeUnit.class)))
                .thenThrow(new ExecutionException("Gemini quota exceeded", new RuntimeException("HTTP 429 Quota Exceeded")));

        GenerateSyllabusRequest request = new GenerateSyllabusRequest("Điện toán đám mây", 3, "AWS/GCP");

        GenerateSyllabusResponse response = serviceWithMockExecutor.generateSyllabus(request);

        assertNotNull(response);
        assertTrue(response.isFallbackUsed());
        assertFalse(Thread.currentThread().isInterrupted());
    }

    @Test
    @DisplayName("Case 7: Invalid JSON Payload - Catches parsing error and returns fallback")
    void case7_invalidJsonPayload_shouldInvokeFallbackSafely() {
        when(aiConfig.isConfiguredWithRealKey()).thenReturn(true);
        when(aiConfig.getEffectiveModel()).thenReturn("gemini-1.5-flash");
        when(aiConfig.getTimeoutSeconds()).thenReturn(10);

        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.system(anyString())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(callSpec);
        when(callSpec.content()).thenReturn("Không phải định dạng JSON: {bad-json}");

        GenerateSyllabusRequest request = new GenerateSyllabusRequest("Kỹ nghệ phần mềm", 3, "Agile/Scrum");

        GenerateSyllabusResponse response = syllabusService.generateSyllabus(request);

        assertNotNull(response);
        assertTrue(response.isFallbackUsed());
    }
}
