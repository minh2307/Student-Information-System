package com.rikkei.eduportal.ai.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiConfig {

    private static final Logger log = LoggerFactory.getLogger(AiConfig.class);

    @Value("${ai.provider:openai}")
    private String provider;

    @Value("${ai.api-key:${spring.ai.openai.api-key:demo-key}}")
    private String apiKey;

    @Value("${ai.base-url:${spring.ai.openai.base-url:https://api.openai.com}}")
    private String baseUrl;

    @Value("${ai.model:${spring.ai.openai.chat.options.model:gpt-4o-mini}}")
    private String model;

    @Value("${ai.timeout-seconds:15}")
    private int timeoutSeconds;

    @Bean
    public ChatClient chatClient(ChatClient.Builder chatClientBuilder) {
        log.info("Initializing Spring AI ChatClient with provider={}, model={}, baseUrl={}, timeout={}s",
                provider, getEffectiveModel(), getEffectiveBaseUrl(), timeoutSeconds);
        return chatClientBuilder.build();
    }

    public String getEffectiveBaseUrl() {
        if ("gemini".equalsIgnoreCase(provider) && (baseUrl == null || baseUrl.contains("api.openai.com"))) {
            return "https://generativelanguage.googleapis.com/v1beta/openai/";
        }
        return baseUrl;
    }

    public String getEffectiveModel() {
        if ("gemini".equalsIgnoreCase(provider) && (model == null || model.contains("gpt"))) {
            return "gemini-1.5-flash";
        }
        return model;
    }

    public String getProvider() {
        return provider;
    }

    public String getApiKey() {
        return apiKey;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public boolean isConfiguredWithRealKey() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.equalsIgnoreCase("demo-key") && !apiKey.startsWith("your_");
    }
}
