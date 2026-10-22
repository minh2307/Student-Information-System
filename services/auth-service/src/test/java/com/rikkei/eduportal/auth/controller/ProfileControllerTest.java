package com.rikkei.eduportal.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.auth.dto.UpdateProfileRequest;
import com.rikkei.eduportal.auth.dto.UserDto;
import com.rikkei.eduportal.auth.dto.UserProfileResponse;
import com.rikkei.eduportal.auth.security.JwtAuthenticationEntryPoint;
import com.rikkei.eduportal.auth.security.JwtAuthenticationFilter;
import com.rikkei.eduportal.auth.security.JwtTokenProvider;
import com.rikkei.eduportal.auth.service.ProfileService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProfileController.class)
@AutoConfigureMockMvc(addFilters = false)
class ProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProfileService profileService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(username = "sv2024001")
    void testGetMyProfile() throws Exception {
        UserDto userDto = new UserDto();
        userDto.setId(4L);
        userDto.setUsername("sv2024001");
        userDto.setRole(Role.STUDENT);
        userDto.setStatus(UserStatus.ACTIVE);

        UserProfileResponse response = new UserProfileResponse(userDto, null, null);

        when(profileService.getProfile("sv2024001")).thenReturn(response);

        mockMvc.perform(get("/api/v1/profile/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.user.username").value("sv2024001"));
    }

    @Test
    @WithMockUser(username = "sv2024001")
    void testUpdateMyProfile() throws Exception {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName("Nguyen Van C Updated");

        UserDto userDto = new UserDto();
        userDto.setId(4L);
        userDto.setUsername("sv2024001");
        userDto.setFullName("Nguyen Van C Updated");
        userDto.setRole(Role.STUDENT);

        UserProfileResponse response = new UserProfileResponse(userDto, null, null);

        when(profileService.updateProfile(eq("sv2024001"), any(UpdateProfileRequest.class)))
                .thenReturn(response);

        mockMvc.perform(put("/api/v1/profile/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.user.fullName").value("Nguyen Van C Updated"));
    }
}
