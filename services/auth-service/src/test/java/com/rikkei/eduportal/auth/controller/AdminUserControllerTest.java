package com.rikkei.eduportal.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.auth.dto.CreateUserRequest;
import com.rikkei.eduportal.auth.dto.UserDto;
import com.rikkei.eduportal.auth.dto.UserProfileResponse;
import com.rikkei.eduportal.auth.security.JwtAuthenticationEntryPoint;
import com.rikkei.eduportal.auth.security.JwtAuthenticationFilter;
import com.rikkei.eduportal.auth.security.JwtTokenProvider;
import com.rikkei.eduportal.auth.service.AdminUserService;
import com.rikkei.eduportal.common.Role;
import com.rikkei.eduportal.common.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminUserController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminUserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminUserService adminUserService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetUsersEndpoint() throws Exception {
        UserDto userDto = new UserDto();
        userDto.setId(1L);
        userDto.setUsername("admin");
        userDto.setRole(Role.ADMIN);

        UserProfileResponse response = new UserProfileResponse(userDto, null, null);

        when(adminUserService.getAllUsers(null, null)).thenReturn(Collections.singletonList(response));

        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data[0].user.username").value("admin"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testCreateUserEndpoint() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("sv2024009");
        request.setEmail("student9@rikkei.edu.vn");
        request.setPassword("123456");
        request.setFullName("Nguyen Van F");
        request.setRole(Role.STUDENT);

        UserDto userDto = new UserDto();
        userDto.setId(9L);
        userDto.setUsername("sv2024009");
        userDto.setRole(Role.STUDENT);
        userDto.setStatus(UserStatus.ACTIVE);

        UserProfileResponse response = new UserProfileResponse(userDto, null, null);

        when(adminUserService.createUser(any(CreateUserRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.data.user.username").value("sv2024009"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testDeleteUserEndpoint() throws Exception {
        doNothing().when(adminUserService).deleteUser(9L);

        mockMvc.perform(delete("/api/v1/admin/users/9"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200));
    }
}
