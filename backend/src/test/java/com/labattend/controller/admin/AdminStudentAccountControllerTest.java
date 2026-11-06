package com.labattend.controller.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.config.SecurityConfig;
import com.labattend.dto.request.StudentBulkAccountRequest;
import com.labattend.dto.response.StudentResponse;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.exception.GlobalExceptionHandler;
import com.labattend.repository.UserRepository;
import com.labattend.security.*;
import com.labattend.service.StudentAccountService;
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
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminStudentAccountController.class)
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
public class AdminStudentAccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private StudentAccountService studentAccountService;

    @MockBean
    private UserRepository userRepository;

    private User adminUser;
    private User lecturerUser;
    private User studentUser;
    private UUID studentId;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();

        adminUser = User.builder()
                .email("admin@test.com")
                .passwordHash(passwordEncoder.encode("Pass123!"))
                .fullName("System Admin")
                .role(Role.ADMIN)
                .isActive(true)
                .build();
        adminUser.setId(UUID.randomUUID());
        adminUser.setCreatedAt(OffsetDateTime.now());
        adminUser.setUpdatedAt(OffsetDateTime.now());

        lecturerUser = User.builder()
                .email("lecturer@test.com")
                .passwordHash(passwordEncoder.encode("Pass123!"))
                .fullName("Dr. Turing")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUser.setId(UUID.randomUUID());
        lecturerUser.setCreatedAt(OffsetDateTime.now());
        lecturerUser.setUpdatedAt(OffsetDateTime.now());

        studentUser = User.builder()
                .email("student@test.com")
                .passwordHash(passwordEncoder.encode("Pass123!"))
                .fullName("Student User")
                .role(Role.STUDENT)
                .isActive(true)
                .build();
        studentUser.setId(UUID.randomUUID());
        studentUser.setCreatedAt(OffsetDateTime.now());
        studentUser.setUpdatedAt(OffsetDateTime.now());
    }

    @Test
    @DisplayName("Admin creates student account -> 201 Created")
    void testAdminCreateAccountSuccess() throws Exception {
        String adminToken = jwtService.generateToken(adminUser);
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));

        StudentResponse resp = StudentResponse.builder()
                .id(studentId)
                .hasAccount(true)
                .accountStatus("PENDING_ACTIVATION")
                .build();
        when(studentAccountService.createAccount(studentId)).thenReturn(resp);

        mockMvc.perform(post("/api/admin/students/{id}/account", studentId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hasAccount").value(true));
    }

    @Test
    @DisplayName("Lecturer creates student account -> 403 Forbidden")
    void testLecturerCreateAccountForbidden() throws Exception {
        String lecturerToken = jwtService.generateToken(lecturerUser);
        when(userRepository.findByEmail("lecturer@test.com")).thenReturn(Optional.of(lecturerUser));

        mockMvc.perform(post("/api/admin/students/{id}/account", studentId)
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("Student calls admin student account endpoint -> 403 Forbidden")
    void testStudentCallingAdminAccountForbidden() throws Exception {
        String studentToken = jwtService.generateToken(studentUser);
        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(studentUser));

        mockMvc.perform(post("/api/admin/students/{id}/account", studentId)
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("Admin send activation link -> 200 OK")
    void testAdminSendActivationLink() throws Exception {
        String adminToken = jwtService.generateToken(adminUser);
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));

        StudentResponse resp = StudentResponse.builder()
                .id(studentId)
                .hasAccount(true)
                .accountStatus("PENDING_ACTIVATION")
                .build();
        when(studentAccountService.sendActivationLink(studentId)).thenReturn(resp);

        mockMvc.perform(post("/api/admin/students/{id}/account/send-activation", studentId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("Admin toggle account status -> 200 OK")
    void testAdminToggleAccountStatus() throws Exception {
        String adminToken = jwtService.generateToken(adminUser);
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));

        StudentResponse resp = StudentResponse.builder()
                .id(studentId)
                .isAccountActive(false)
                .accountStatus("DEACTIVATED")
                .build();
        when(studentAccountService.toggleAccountStatus(studentId)).thenReturn(resp);

        mockMvc.perform(patch("/api/admin/students/{id}/account/toggle-status", studentId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("Admin bulk create accounts -> 200 OK")
    void testAdminBulkCreateAccounts() throws Exception {
        String adminToken = jwtService.generateToken(adminUser);
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));

        when(studentAccountService.bulkCreateAccounts(any(), any(), any()))
                .thenReturn(Map.of("createdCount", 5, "skippedCount", 1));

        StudentBulkAccountRequest req = StudentBulkAccountRequest.builder()
                .batchId(UUID.randomUUID())
                .build();

        mockMvc.perform(post("/api/admin/students/accounts/bulk-create")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.createdCount").value(5));
    }
}

