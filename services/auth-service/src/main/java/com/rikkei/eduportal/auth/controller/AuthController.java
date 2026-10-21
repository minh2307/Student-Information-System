package com.rikkei.eduportal.auth.controller;

import com.rikkei.eduportal.auth.dto.LoginRequest;
import com.rikkei.eduportal.auth.dto.LoginResponse;
import com.rikkei.eduportal.auth.entity.User;
import com.rikkei.eduportal.auth.repository.UserRepository;
import com.rikkei.eduportal.auth.security.JwtTokenProvider;
import com.rikkei.eduportal.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());

        if (userOpt.isEmpty() || !passwordEncoder.matches(request.getPassword(), userOpt.get().getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(HttpStatus.UNAUTHORIZED.value(), "Tên đăng nhập hoặc mật khẩu không chính xác"));
        }

        User user = userOpt.get();
        String token = jwtTokenProvider.generateToken(user.getUsername(), user.getRole().name());

        LoginResponse.UserDto userDto = new LoginResponse.UserDto(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole().name(),
                user.getAvatarUrl()
        );

        LoginResponse response = new LoginResponse(userDto, token);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", response));
    }
}
