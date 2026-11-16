package com.rikkei.eduportal.ai;

import com.rikkei.eduportal.ai.config.AiConfig;
import com.rikkei.eduportal.ai.service.AcademicAdvisorService;
import com.rikkei.eduportal.ai.service.SyllabusService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class AiServiceApplicationTests {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private AiConfig aiConfig;

    @Autowired
    private AcademicAdvisorService academicAdvisorService;

    @Autowired
    private SyllabusService syllabusService;

    @Test
    @DisplayName("Verify Spring application context loads and critical AI beans are injected")
    void contextLoads() {
        assertNotNull(applicationContext, "Application context should load successfully");
        assertNotNull(aiConfig, "AiConfig bean should be configured and injected");
        assertNotNull(academicAdvisorService, "AcademicAdvisorService bean should be loaded");
        assertNotNull(syllabusService, "SyllabusService bean should be loaded");
    }
}
