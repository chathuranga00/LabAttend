package com.labattend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.config.SecurityConfig;
import com.labattend.controller.AdminTestController;
import com.labattend.controller.AuthController;
import com.labattend.controller.LecturerTestController;
import com.labattend.controller.StudentController;
import com.labattend.dto.request.LoginRequest;
import com.labattend.dto.request.StudentActivateRequest;
import com.labattend.dto.request.StudentForgotPasswordRequest;
import com.labattend.dto.request.StudentResetPasswordRequest;
import com.labattend.entity.Lecturer;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.GlobalExceptionHandler;
import com.labattend.repository.LecturerRepository;
import com.labattend.repository.UserRepository;
import com.labattend.service.AuthService;
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
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {
        AuthController.class,
        AdminTestController.class,
        LecturerTestController.class,
        StudentController.class
})
@Import({
        SecurityConfig.class,
        JwtService.class,
        CustomUserDetailsService.class,
        JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class,
        CustomAccessDeniedHandler.class,
        GlobalExceptionHandler.class,
        AuthService.class,
        RateLimitingFilter.class,
        RateLimiterService.class
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

    @Autowired
    private RateLimiterService rateLimiterService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private LecturerRepository lecturerRepository;

    @MockBean
    private StudentAccountService studentAccountService;

    @MockBean
    private com.labattend.service.StudentPortalService studentPortalService;

    private User adminUser;
    private User lecturerUser;
    private User studentUser;
    private User deactivatedStudentUser;
    private Lecturer lecturerProfile;

    @BeforeEach
    void setUp() {
        rateLimiterService.reset();

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

        studentUser = User.builder()
                .email("student@test.com")
                .passwordHash(passwordEncoder.encode("StudentPass123!"))
                .fullName("Kasun Perera")
                .role(Role.STUDENT)
                .isActive(true)
                .build();
        studentUser.setId(UUID.randomUUID());
        studentUser.setCreatedAt(OffsetDateTime.now());
        studentUser.setUpdatedAt(OffsetDateTime.now());

        deactivatedStudentUser = User.builder()
                .email("deactivated@test.com")
                .passwordHash(passwordEncoder.encode("StudentPass123!"))
                .fullName("Deactivated Student")
                .role(Role.STUDENT)
                .isActive(false)
                .build();
        deactivatedStudentUser.setId(UUID.randomUUID());
        deactivatedStudentUser.setCreatedAt(OffsetDateTime.now());
        deactivatedStudentUser.setUpdatedAt(OffsetDateTime.now());

        lecturerProfile = Lecturer.builder()
                .user(lecturerUser)
                .staffId("LEC-9988")
                .fullName("Dr. Alan Turing")
                .department("Computer Science")
                .isActive(true)
                .build();
        lecturerProfile.setId(UUID.randomUUID());
    }

    // =========================================================================
    // 1. STAFF LOGIN ENDPOINT (/api/auth/staff/login)
    // =========================================================================

    @Test
    @DisplayName("Staff Login Success -> Admin returns 200, JWT token, and ADMIN role")
    void testStaffLoginAdminSuccess() throws Exception {
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("admin@test.com")
                .password("AdminPass123!")
                .build();

        mockMvc.perform(post("/api/auth/staff/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.user.email").value("admin@test.com"))
                .andExpect(jsonPath("$.data.user.role").value("ADMIN"));
    }

    @Test
    @DisplayName("Staff Login Success -> Lecturer returns 200, JWT token, and LECTURER role")
    void testStaffLoginLecturerSuccess() throws Exception {
        when(userRepository.findByEmail("lecturer@test.com")).thenReturn(Optional.of(lecturerUser));
        when(lecturerRepository.findByUserId(lecturerUser.getId())).thenReturn(Optional.of(lecturerProfile));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("lecturer@test.com")
                .password("LecturerPass123!")
                .build();

        mockMvc.perform(post("/api/auth/staff/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.user.role").value("LECTURER"));
    }

    @Test
    @DisplayName("Staff Login Rejection -> Student credentials rejected with generic 401 identical to wrong password")
    void testStaffLoginRejectsStudentCredentials() throws Exception {
        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(studentUser));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("student@test.com")
                .password("StudentPass123!")
                .build();

        mockMvc.perform(post("/api/auth/staff/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Email or password is incorrect."));
    }

    @Test
    @DisplayName("Staff Login Rejection -> Wrong password returns generic 401")
    void testStaffLoginWrongPassword() throws Exception {
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("admin@test.com")
                .password("WrongPassword123!")
                .build();

        mockMvc.perform(post("/api/auth/staff/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Email or password is incorrect."));
    }

    // =========================================================================
    // 2. STUDENT LOGIN ENDPOINT (/api/auth/student/login)
    // =========================================================================

    @Test
    @DisplayName("Student Login Success -> Student returns 200, JWT token, and STUDENT role")
    void testStudentLoginSuccess() throws Exception {
        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(studentUser));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("student@test.com")
                .password("StudentPass123!")
                .build();

        mockMvc.perform(post("/api/auth/student/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value("student@test.com"))
                .andExpect(jsonPath("$.data.user.role").value("STUDENT"));
    }

    @Test
    @DisplayName("Student Login Rejection -> Admin credentials rejected with generic 401")
    void testStudentLoginRejectsAdminCredentials() throws Exception {
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("admin@test.com")
                .password("AdminPass123!")
                .build();

        mockMvc.perform(post("/api/auth/student/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Email or password is incorrect."));
    }

    @Test
    @DisplayName("Student Login Rejection -> Lecturer credentials rejected with generic 401")
    void testStudentLoginRejectsLecturerCredentials() throws Exception {
        when(userRepository.findByEmail("lecturer@test.com")).thenReturn(Optional.of(lecturerUser));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("lecturer@test.com")
                .password("LecturerPass123!")
                .build();

        mockMvc.perform(post("/api/auth/student/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Email or password is incorrect."));
    }

    @Test
    @DisplayName("Student Login Rejection -> Deactivated student cannot log in (401)")
    void testDeactivatedStudentLoginFails() throws Exception {
        when(userRepository.findByEmail("deactivated@test.com")).thenReturn(Optional.of(deactivatedStudentUser));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("deactivated@test.com")
                .password("StudentPass123!")
                .build();

        mockMvc.perform(post("/api/auth/student/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Email or password is incorrect."));
    }

    // =========================================================================
    // 3. ROLE-BASED ACCESS CONTROL (RBAC) BOUNDARIES
    // =========================================================================

    @Test
    @DisplayName("RBAC Violation -> Student calling /api/admin/ping gets 403 Forbidden")
    void testStudentCallingAdminEndpointGets403() throws Exception {
        String studentToken = jwtService.generateToken(studentUser);
        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(studentUser));

        mockMvc.perform(get("/api/admin/ping")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("RBAC Violation -> Student calling /api/lecturer/ping gets 403 Forbidden")
    void testStudentCallingLecturerEndpointGets403() throws Exception {
        String studentToken = jwtService.generateToken(studentUser);
        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(studentUser));

        mockMvc.perform(get("/api/lecturer/ping")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("RBAC Violation -> Admin calling /api/student/ping gets 403 Forbidden")
    void testAdminCallingStudentEndpointGets403() throws Exception {
        String adminToken = jwtService.generateToken(adminUser);
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));

        mockMvc.perform(get("/api/student/ping")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("RBAC Violation -> Lecturer calling /api/student/ping gets 403 Forbidden")
    void testLecturerCallingStudentEndpointGets403() throws Exception {
        String lecturerToken = jwtService.generateToken(lecturerUser);
        when(userRepository.findByEmail("lecturer@test.com")).thenReturn(Optional.of(lecturerUser));

        mockMvc.perform(get("/api/student/ping")
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("RBAC Success -> Student calling /api/student/ping gets 200 OK")
    void testStudentCallingStudentEndpointGets200() throws Exception {
        String studentToken = jwtService.generateToken(studentUser);
        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(studentUser));

        mockMvc.perform(get("/api/student/ping")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("PONG_STUDENT"));
    }

    // =========================================================================
    // 4. PUBLIC STUDENT ACTIVATION & PASSWORD MANAGEMENT
    // =========================================================================

    @Test
    @DisplayName("Public Activation -> Valid token and password activates student account")
    void testPublicActivationSuccess() throws Exception {
        doNothing().when(studentAccountService).activateAccount(anyString(), anyString());

        StudentActivateRequest request = StudentActivateRequest.builder()
                .token("valid-token-123")
                .newPassword("ValidPass@1234")
                .build();

        mockMvc.perform(post("/api/auth/student/activate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message", containsString("successfully activated")));
    }

    @Test
    @DisplayName("Public Activation -> Expired/invalid token returns 400")
    void testPublicActivationInvalidToken() throws Exception {
        doThrow(new BadRequestException("Invalid, expired, or already used activation link."))
                .when(studentAccountService).activateAccount(anyString(), anyString());

        StudentActivateRequest request = StudentActivateRequest.builder()
                .token("expired-token")
                .newPassword("ValidPass@1234")
                .build();

        mockMvc.perform(post("/api/auth/student/activate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("Invalid, expired, or already used")));
    }

    @Test
    @DisplayName("Public Forgot Password -> Returns generic message for any email")
    void testPublicForgotPasswordGenericMessage() throws Exception {
        doNothing().when(studentAccountService).forgotPassword(anyString());

        StudentForgotPasswordRequest request = StudentForgotPasswordRequest.builder()
                .email("unknown@nsbm.ac.lk")
                .build();

        mockMvc.perform(post("/api/auth/student/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message", containsString("password reset instructions have been sent")));
    }

    @Test
    @DisplayName("Public Reset Password -> Valid token and password resets password")
    void testPublicResetPasswordSuccess() throws Exception {
        doNothing().when(studentAccountService).resetPassword(anyString(), anyString());

        StudentResetPasswordRequest request = StudentResetPasswordRequest.builder()
                .token("valid-reset-token")
                .newPassword("NewSecurePass@2026")
                .build();

        mockMvc.perform(post("/api/auth/student/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message", containsString("successfully reset")));
    }
}
