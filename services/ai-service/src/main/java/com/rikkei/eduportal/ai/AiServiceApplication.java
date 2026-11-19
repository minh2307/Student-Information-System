package com.rikkei.eduportal.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@SpringBootApplication
public class AiServiceApplication {

    public static void main(String[] args) {
        String existing = System.getenv("AI_API_KEY");
        if (existing == null || existing.isBlank() || "test-demo-key".equalsIgnoreCase(existing) || "demo-key".equalsIgnoreCase(existing)) {
            // Dynamic resolution from local .env without hardcoding secret in source
            try {
                Path envPath = Paths.get(".env");
                if (Files.exists(envPath)) {
                    List<String> lines = Files.readAllLines(envPath);
                    for (String line : lines) {
                        if (line.startsWith("AI_API_KEY=") && !line.contains("your_")) {
                            String key = line.substring("AI_API_KEY=".length()).trim();
                            if (!key.isBlank()) {
                                System.setProperty("spring.ai.openai.api-key", key);
                                System.setProperty("ai.api-key", key);
                                System.setProperty("gemini.api-key", key);
                                break;
                            }
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        String maxTokens = System.getenv("AI_MAX_TOKENS");
        if (maxTokens == null || maxTokens.isBlank()) {
            System.setProperty("spring.ai.openai.chat.options.max-tokens", "800");
        }

        SpringApplication.run(AiServiceApplication.class, args);
    }
}
