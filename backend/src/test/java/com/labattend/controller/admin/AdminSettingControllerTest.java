package com.labattend.controller.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.config.SecurityConfig;
import com.labattend.dto.request.ThresholdSettingRequest;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.exception.GlobalExceptionHandler;
import com.labattend.repository.LecturerRepository;
import com.labattend.repository.UserRepository;
import com.labattend.security.*;
import com.labattend.service.AuthService;
import com.labattend.service.SystemSettingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminSettingController.class)
@Import({
        SecurityConfig.class,
        JwtService.class,
        CustomUserDetailsService.class,
        JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class,
        CustomAccessDeniedHandler.class,
        GlobalExceptionHandler.class,
        RateLimitingFilter.class,
        RateLimiterService.class
})
class AdminSettingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private SystemSettingService systemSettingService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private LecturerRepository lecturerRepository;

    @MockBean
    private AuthService authService;

    private String adminToken;
    private String lecturerToken;
    private String studentToken;

    @BeforeEach
    void setUp() {
        User admin = User.builder().email("admin@test.com").passwordHash("hash").role(Role.ADMIN).isActive(true).build();
        admin.setId(UUID.randomUUID());
        User lecturer = User.builder().email("lecturer@test.com").passwordHash("hash").role(Role.LECTURER).isActive(true).build();
        lecturer.setId(UUID.randomUUID());
        User student = User.builder().email("student@test.com").passwordHash("hash").role(Role.STUDENT).isActive(true).build();
        student.setId(UUID.randomUUID());

        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));
        when(userRepository.findByEmail("lecturer@test.com")).thenReturn(Optional.of(lecturer));
        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(student));

        adminToken = "Bearer " + jwtService.generateToken(admin);
        lecturerToken = "Bearer " + jwtService.generateToken(lecturer);
        studentToken = "Bearer " + jwtService.generateToken(student);
    }

    @Test
    @DisplayName("GET /api/admin/settings/low-attendance-threshold -> Admin 200, Lecturer 403, Student 403")
    void testGetThresholdRbac() throws Exception {
        when(systemSettingService.getLowAttendanceThreshold()).thenReturn(80.0);

        // 403 for student
        mockMvc.perform(get("/api/admin/settings/low-attendance-threshold")
                        .header("Authorization", studentToken))
                .andExpect(status().isForbidden());

        // 403 for lecturer
        mockMvc.perform(get("/api/admin/settings/low-attendance-threshold")
                        .header("Authorization", lecturerToken))
                .andExpect(status().isForbidden());

        // 200 for admin
        mockMvc.perform(get("/api/admin/settings/low-attendance-threshold")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.threshold").value(80.0));
    }

    @Test
    @DisplayName("PUT /api/admin/settings/low-attendance-threshold -> Admin updates, Lecturer 403, Student 403")
    void testUpdateThresholdRbac() throws Exception {
        ThresholdSettingRequest req = ThresholdSettingRequest.builder().threshold(75.0).build();
        when(systemSettingService.setLowAttendanceThreshold(eq(75.0), any())).thenReturn(75.0);

        // 403 for student
        mockMvc.perform(put("/api/admin/settings/low-attendance-threshold")
                        .header("Authorization", studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());

        // 403 for lecturer
        mockMvc.perform(put("/api/admin/settings/low-attendance-threshold")
                        .header("Authorization", lecturerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());

        // 200 for admin
        mockMvc.perform(put("/api/admin/settings/low-attendance-threshold")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.threshold").value(75.0));
    }

    @Test
    @DisplayName("PUT /api/admin/settings/low-attendance-threshold -> Invalid percentage rejected with 400")
    void testUpdateThresholdValidation() throws Exception {
        ThresholdSettingRequest req = ThresholdSettingRequest.builder().threshold(105.0).build();

        mockMvc.perform(put("/api/admin/settings/low-attendance-threshold")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }
}
