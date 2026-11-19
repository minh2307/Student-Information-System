package com.rikkei.eduportal.gateway.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

import java.io.InputStream;

@Configuration
public class WebMvcConfig {

    @Bean
    public FilterRegistrationBean<ShallowEtagHeaderFilter> shallowEtagHeaderFilter() {
        FilterRegistrationBean<ShallowEtagHeaderFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new ShallowEtagHeaderFilter() {
            @Override
            protected boolean isEligibleForEtag(HttpServletRequest request, HttpServletResponse response, int responseStatusCode, InputStream inputStream) {
                String uri = request.getRequestURI();
                if (uri != null && (uri.contains("/live-seats") || uri.contains("/stream"))) {
                    return false;
                }
                String contentType = response.getContentType();
                if (contentType != null && contentType.contains("text/event-stream")) {
                    return false;
                }
                return super.isEligibleForEtag(request, response, responseStatusCode, inputStream);
            }
        });
        registration.addUrlPatterns("/api/v1/*", "/attendance/*");
        registration.setOrder(Ordered.LOWEST_PRECEDENCE);
        return registration;
    }
}
