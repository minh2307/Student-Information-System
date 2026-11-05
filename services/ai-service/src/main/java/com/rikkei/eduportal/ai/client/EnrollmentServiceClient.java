package com.rikkei.eduportal.ai.client;

import com.rikkei.eduportal.ai.config.AiConfig;
import com.rikkei.eduportal.ai.dto.StudentAcademicContextDto;
import com.rikkei.eduportal.common.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Optional;

@Component
public class EnrollmentServiceClient {

    private static final Logger log = LoggerFactory.getLogger(EnrollmentServiceClient.class);

    private final RestClient restClient;
    private final AiConfig aiConfig;

    public EnrollmentServiceClient(AiConfig aiConfig, RestClient.Builder restClientBuilder) {
        this.aiConfig = aiConfig;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        int timeoutMs = aiConfig.getEnrollmentTimeoutSeconds() * 1000;
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);

        this.restClient = restClientBuilder
                .baseUrl(aiConfig.getEnrollmentServiceUrl())
                .requestFactory(requestFactory)
                .build();
    }

    public Optional<StudentAcademicContextDto> fetchAcademicContext(String authToken, String studentIdentifier) {
        String targetUrl = "/api/v1/student/academic-context";
        log.info("Fetching academic context from enrollment-service ({}{}) for student: {}",
                aiConfig.getEnrollmentServiceUrl(), targetUrl, studentIdentifier);

        try {
            ApiResponse<StudentAcademicContextDto> response = restClient.get()
                    .uri(targetUrl)
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .headers(headers -> {
                        if (authToken != null && !authToken.isBlank()) {
                            headers.set(HttpHeaders.AUTHORIZATION, authToken.startsWith("Bearer ") ? authToken : "Bearer " + authToken);
                        }
                        if (studentIdentifier != null && !studentIdentifier.isBlank()) {
                            headers.set("X-User-Username", studentIdentifier);
                            headers.set("X-Student-Code", studentIdentifier);
                        }
                    })
                    .retrieve()
                    .body(new ParameterizedTypeReference<ApiResponse<StudentAcademicContextDto>>() {});

            if (response != null && response.getData() != null) {
                log.info("ENROLLMENT_SERVICE_SUCCESS: Retrieved records for student={}: {} completed credits, {} current enrollments",
                        studentIdentifier,
                        response.getData().getCompletedCredits(),
                        response.getData().getCurrentEnrollments() != null ? response.getData().getCurrentEnrollments().size() : 0);
                return Optional.of(response.getData());
            }

            log.warn("ENROLLMENT_SERVICE_EMPTY: Enrollment service returned empty data body for student: {}", studentIdentifier);
            return Optional.empty();

        } catch (RestClientResponseException ex) {
            log.error("ENROLLMENT_SERVICE_UNAVAILABLE: Downstream HTTP error {} from enrollment-service for student {}: {}",
                    ex.getStatusCode(), studentIdentifier, ex.getMessage());
            return Optional.empty();
        } catch (Exception ex) {
            log.error("ENROLLMENT_SERVICE_UNAVAILABLE: Connection failed to enrollment-service at {}: {}",
                    aiConfig.getEnrollmentServiceUrl(), ex.getMessage());
            return Optional.empty();
        }
    }
}
