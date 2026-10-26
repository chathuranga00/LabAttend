package com.labattend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.config.SecurityConfig;
import com.labattend.controller.AdminTestController;
import com.labattend.controller.AuthController;
import com.labattend.controller.LecturerTestController;
import com.labattend.dto.request.LoginRequest;
import com.labattend.entity.Lecturer;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.exception.GlobalExceptionHandler;
import com.labattend.repository.LecturerRepository;
import com.labattend.repository.UserRepository;
import com.labattend.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {AuthController.class, AdminTestController.class, LecturerTestController.class})
@Import({
        SecurityConfig.class,
        JwtService.class,
        CustomUserDetailsService.class,
        JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class,
        CustomAccessDeniedHandler.class,
        GlobalExceptionHandler.class,
        AuthService.class
})
public class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private LecturerRepository lecturerRepository;

    private User adminUser;
    private User lecturerUser;
    private User deactivatedLecturerUser;
    private Lecturer lecturerProfile;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .email("admin@test.com")
                .passwordHash(passwordEncoder.encode("AdminPass123!"))
                .fullName("System Administrator")
                .role(Role.ADMIN)
                .isActive(true)
                .build();
        adminUser.setId(UUID.randomUUID());
        adminUser.setCreatedAt(OffsetDateTime.now());
        adminUser.setUpdatedAt(OffsetDateTime.now());

        lecturerUser = User.builder()
                .email("lecturer@test.com")
                .passwordHash(passwordEncoder.encode("LecturerPass123!"))
                .fullName("Dr. Alan Turing")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUser.setId(UUID.randomUUID());
        lecturerUser.setCreatedAt(OffsetDateTime.now());
        lecturerUser.setUpdatedAt(OffsetDateTime.now());

        deactivatedLecturerUser = User.builder()
                .email("inactive@test.com")
                .passwordHash(passwordEncoder.encode("InactivePass123!"))
                .fullName("Inactive Lecturer")
                .role(Role.LECTURER)
                .isActive(false)
                .build();
        deactivatedLecturerUser.setId(UUID.randomUUID());
        deactivatedLecturerUser.setCreatedAt(OffsetDateTime.now());
        deactivatedLecturerUser.setUpdatedAt(OffsetDateTime.now());

        lecturerProfile = Lecturer.builder()
                .user(lecturerUser)
                .staffId("LEC-9988")
                .fullName("Dr. Alan Turing")
                .department("Computer Science")
                .isActive(true)
                .build();
        lecturerProfile.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Admin Login Success -> Returns 200, JWT token, and ADMIN role")
    void testAdminLoginSuccess() throws Exception {
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("admin@test.com")
                .password("AdminPass123!")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.user.email").value("admin@test.com"))
                .andExpect(jsonPath("$.data.user.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.user.isActive").value(true));
    }

    @Test
    @DisplayName("Lecturer Login Success -> Returns 200, JWT token, LECTURER role, and staff info")
    void testLecturerLoginSuccess() throws Exception {
        when(userRepository.findByEmail("lecturer@test.com")).thenReturn(Optional.of(lecturerUser));
        when(lecturerRepository.findByUserId(lecturerUser.getId())).thenReturn(Optional.of(lecturerProfile));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("lecturer@test.com")
                .password("LecturerPass123!")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.user.role").value("LECTURER"))
                .andExpect(jsonPath("$.data.user.staffId").value("LEC-9988"))
                .andExpect(jsonPath("$.data.user.department").value("Computer Science"));
    }

    @Test
    @DisplayName("Invalid Credentials -> Returns 401 with generic message 'Email or password is incorrect.'")
    void testInvalidCredentials() throws Exception {
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("admin@test.com")
                .password("WrongPassword123!")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Email or password is incorrect."))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Deactivated Lecturer Login -> Returns 401 with generic message 'Email or password is incorrect.'")
    void testDeactivatedLecturerCannotLogin() throws Exception {
        when(userRepository.findByEmail("inactive@test.com")).thenReturn(Optional.of(deactivatedLecturerUser));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("inactive@test.com")
                .password("InactivePass123!")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Email or password is incorrect."));
    }

    @Test
    @DisplayName("Unauthorized Access -> Unauthenticated request to /api/auth/me returns 401 JSON")
    void testUnauthorizedAccess() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Full authentication is required to access this resource"));
    }

    @Test
    @DisplayName("RBAC Violation -> Lecturer calling /api/admin/ping gets 403 Forbidden")
    void testLecturerCallingAdminEndpointGets403() throws Exception {
        String lecturerToken = jwtService.generateToken(lecturerUser);
        when(userRepository.findByEmail("lecturer@test.com")).thenReturn(Optional.of(lecturerUser));

        mockMvc.perform(get("/api/admin/ping")
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message", containsString("Access denied")));
    }

    @Test
    @DisplayName("RBAC Success -> Admin calling /api/admin/ping gets 200 OK")
    void testAdminCallingAdminEndpointGets200() throws Exception {
        String adminToken = jwtService.generateToken(adminUser);
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));

        mockMvc.perform(get("/api/admin/ping")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("PONG_ADMIN"));
    }

    @Test
    @DisplayName("RBAC Success -> Lecturer calling /api/lecturer/ping gets 200 OK")
    void testLecturerCallingLecturerEndpointGets200() throws Exception {
        String lecturerToken = jwtService.generateToken(lecturerUser);
        when(userRepository.findByEmail("lecturer@test.com")).thenReturn(Optional.of(lecturerUser));

        mockMvc.perform(get("/api/lecturer/ping")
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("PONG_LECTURER"));
    }

    @Test
    @DisplayName("Get Current User (/api/auth/me) -> Returns authenticated profile")
    void testGetCurrentUserProfile() throws Exception {
        String adminToken = jwtService.generateToken(adminUser);
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(userRepository.findById(adminUser.getId())).thenReturn(Optional.of(adminUser));

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("admin@test.com"))
                .andExpect(jsonPath("$.data.role").value("ADMIN"));
    }
}
