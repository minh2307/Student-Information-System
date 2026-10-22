package com.rikkei.eduportal.ai.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.common.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.Arrays;

@Component
public class RoleAuthorizationInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(RoleAuthorizationInterceptor.class);

    private final JwtTokenValidator tokenValidator;
    private final ObjectMapper objectMapper;

    public RoleAuthorizationInterceptor(JwtTokenValidator tokenValidator, ObjectMapper objectMapper) {
        this.tokenValidator = tokenValidator;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        RequireRoles annotation = handlerMethod.getMethodAnnotation(RequireRoles.class);
        if (annotation == null) {
            annotation = handlerMethod.getBeanType().getAnnotation(RequireRoles.class);
        }

        if (annotation == null || annotation.value().length == 0) {
            return true;
        }

        String authHeader = request.getHeader("Authorization");
        String roleHeader = request.getHeader("X-User-Role");

        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
        }

        Role userRole = tokenValidator.extractRole(token, roleHeader);

        if (userRole == null) {
            log.warn("Unauthorized access attempt to {}: missing or invalid authentication token", request.getRequestURI());
            writeErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Yêu cầu đăng nhập: Vui lòng cung cấp mã xác thực JWT hoặc quyền hạn hợp lệ.");
            return false;
        }

        boolean hasRole = Arrays.asList(annotation.value()).contains(userRole);
        if (!hasRole) {
            log.warn("Forbidden access attempt to {} by role {}. Required roles: {}",
                    request.getRequestURI(), userRole, Arrays.toString(annotation.value()));
            writeErrorResponse(response, HttpServletResponse.SC_FORBIDDEN,
                    "Truy cập bị từ chối: Chức năng sinh đề cương môn học chỉ dành cho vai trò ADMIN hoặc LECTURER.");
            return false;
        }

        log.debug("Authorized request to {} with role {}", request.getRequestURI(), userRole);
        return true;
    }

    private void writeErrorResponse(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        ApiResponse<Void> apiResponse = ApiResponse.error(status, message);
        response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
    }
}
