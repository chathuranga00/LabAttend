package com.labattend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.config.SecurityConfig;
import com.labattend.controller.admin.*;
import com.labattend.controller.lecturer.LecturerSessionController;
import com.labattend.dto.request.AttendanceScanRequest;
import com.labattend.dto.request.LoginRequest;
import com.labattend.entity.Lecturer;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.GlobalExceptionHandler;
import com.labattend.repository.LecturerRepository;
import com.labattend.repository.UserRepository;
import com.labattend.service.*;
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

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
        AdminSessionController.class,
        AdminStudentController.class,
        AdminLecturerController.class,
        AdminAuditController.class,
        LecturerSessionController.class
})
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
public class SecurityHardeningTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private RateLimiterService rateLimiterService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private LecturerRepository lecturerRepository;

    @MockBean
    private LabSessionService labSessionService;

    @MockBean
    private AttendanceService attendanceService;

    @MockBean
    private StudentService studentService;

    @MockBean
    private LecturerService lecturerService;

    @MockBean
    private AuditLogService auditLogService;

    @MockBean
    private PasswordEncoder passwordEncoder;

    private User adminUser;
    private User lecturerUserA;
    private User lecturerUserB;
    private Lecturer lecturerProfileA;
    private Lecturer lecturerProfileB;
    private String adminToken;
    private String lecturerTokenA;
    private String lecturerTokenB;

    @BeforeEach
    void setUp() {
        rateLimiterService.reset();

        UUID adminId = UUID.randomUUID();
        adminUser = User.builder()
                .email("admin@sliit.lk")
                .fullName("System Administrator")
                .role(Role.ADMIN)
                .isActive(true)
                .build();
        adminUser.setId(adminId);

        UUID lecturerAId = UUID.randomUUID();
        lecturerUserA = User.builder()
                .email("lecturerA@sliit.lk")
                .fullName("Dr. Lecturer A")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUserA.setId(lecturerAId);

        lecturerProfileA = Lecturer.builder()
                .user(lecturerUserA)
                .staffId("LEC-A")
                .fullName("Dr. Lecturer A")
                .build();
        lecturerProfileA.setId(UUID.randomUUID());

        UUID lecturerBId = UUID.randomUUID();
        lecturerUserB = User.builder()
                .email("lecturerB@sliit.lk")
                .fullName("Dr. Lecturer B")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUserB.setId(lecturerBId);

        lecturerProfileB = Lecturer.builder()
                .user(lecturerUserB)
                .staffId("LEC-B")
                .fullName("Dr. Lecturer B")
                .build();
        lecturerProfileB.setId(UUID.randomUUID());

        adminToken = jwtService.generateToken(adminUser);
        lecturerTokenA = jwtService.generateToken(lecturerUserA);
        lecturerTokenB = jwtService.generateToken(lecturerUserB);

        when(userRepository.findByEmail("admin@sliit.lk")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByEmail("lecturerA@sliit.lk")).thenReturn(Optional.of(lecturerUserA));
        when(userRepository.findByEmail("lecturerB@sliit.lk")).thenReturn(Optional.of(lecturerUserB));

        when(lecturerRepository.findByUserId(lecturerAId)).thenReturn(Optional.of(lecturerProfileA));
        when(lecturerRepository.findByUserId(lecturerBId)).thenReturn(Optional.of(lecturerProfileB));
    }

    // ==========================================
    // 1. ROLE ESCALATION PREVENTED
    // ==========================================
    @Test
    @DisplayName("Security: Lecturer cannot access Admin Sessions -> 403 Forbidden")
    void testLecturerAccessAdminSessionsForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/sessions")
                        .header("Authorization", "Bearer " + lecturerTokenA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("Security: Lecturer cannot access Admin Students -> 403 Forbidden")
    void testLecturerAccessAdminStudentsForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/students")
                        .header("Authorization", "Bearer " + lecturerTokenA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Security: Lecturer cannot access Admin Audits -> 403 Forbidden")
    void testLecturerAccessAdminAuditsForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/audits")
                        .header("Authorization", "Bearer " + lecturerTokenA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==========================================
    // 2. UNAUTHENTICATED ACCESS PREVENTED
    // ==========================================
    @Test
    @DisplayName("Security: Unauthenticated request to Admin endpoint -> 401 Unauthorized")
    void testUnauthenticatedAdminAccessReturns401() throws Exception {
        mockMvc.perform(get("/api/admin/sessions"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Security: Unauthenticated request to Lecturer endpoint -> 401 Unauthorized")
    void testUnauthenticatedLecturerAccessReturns401() throws Exception {
        mockMvc.perform(get("/api/lecturer/sessions/" + UUID.randomUUID()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401));
    }

    // ==========================================
    // 3. CROSS-LECTURER ACCESS PREVENTED
    // ==========================================
    @Test
    @DisplayName("Security: Lecturer A scanning into Lecturer B's session is rejected with Bad Request / Unauthorized")
    void testCrossLecturerScanRejected() throws Exception {
        UUID sessionBId = UUID.randomUUID();
        when(attendanceService.scanQrAttendance(eq(lecturerUserA.getId()), eq(sessionBId), any(AttendanceScanRequest.class)))
                .thenThrow(new BadRequestException("You are not authorized to conduct or scan attendance for this lab session."));

        AttendanceScanRequest req = new AttendanceScanRequest("IT21001234");

        mockMvc.perform(post("/api/lecturer/sessions/" + sessionBId + "/scan")
                        .header("Authorization", "Bearer " + lecturerTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You are not authorized to conduct or scan attendance for this lab session."));
    }

    @Test
    @DisplayName("Security: Lecturer A finalizing Lecturer B's session is rejected")
    void testCrossLecturerFinalizeRejected() throws Exception {
        UUID sessionBId = UUID.randomUUID();
        when(labSessionService.finalizeSession(eq(lecturerUserA.getId()), eq(sessionBId), any()))
                .thenThrow(new BadRequestException("Access denied. You can only finalize your own lab sessions."));

        mockMvc.perform(post("/api/lecturer/sessions/" + sessionBId + "/finalize")
                        .header("Authorization", "Bearer " + lecturerTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"malicious\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Access denied. You can only finalize your own lab sessions."));
    }

    // ==========================================
    // 4. RATE LIMITING ON SCAN ENDPOINT
    // ==========================================
    @Test
    @DisplayName("Security: Scan endpoint rate limit triggered after excessive attempts -> 429 Too Many Requests")
    void testScanRateLimiting() throws Exception {
        UUID sessionId = UUID.randomUUID();
        AttendanceScanRequest req = new AttendanceScanRequest("IT21001234");

        // Simulate 120 scans to exhaust bucket
        for (int i = 0; i < 120; i++) {
            rateLimiterService.isScanAllowed("/api/lecturer/sessions/" + sessionId + "/scan:127.0.0.1");
        }

        mockMvc.perform(post("/api/lecturer/sessions/" + sessionId + "/scan")
                        .header("Authorization", "Bearer " + lecturerTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.message").value("Scan rate limit exceeded. Please wait a moment before scanning again."));
    }
}
