package com.rikkei.eduportal.lecturer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class LecturerServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(LecturerServiceApplication.class, args);
    }
}
