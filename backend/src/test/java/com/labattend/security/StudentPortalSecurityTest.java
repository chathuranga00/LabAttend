package com.labattend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.config.SecurityConfig;
import com.labattend.controller.StudentController;
import com.labattend.controller.admin.*;
import com.labattend.controller.lecturer.LecturerReportController;
import com.labattend.controller.lecturer.LecturerSessionController;
import com.labattend.dto.student.StudentPasswordChangeRequest;
import com.labattend.dto.student.StudentProfileResponse;
import com.labattend.dto.student.StudentSummaryResponse;
import com.labattend.entity.Lecturer;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.exception.GlobalExceptionHandler;
import com.labattend.repository.LecturerRepository;
import com.labattend.repository.UserRepository;
import com.labattend.service.*;
import com.labattend.service.report.ReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {
        StudentController.class,
        AdminSessionController.class,
        AdminStudentController.class,
        AdminLecturerController.class,
        AdminAuditController.class,
        AdminSettingController.class,
        LecturerSessionController.class,
        LecturerReportController.class
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
public class StudentPortalSecurityTest {

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
    private StudentPortalService studentPortalService;

    @MockBean
    private LabSessionService labSessionService;

    @MockBean
    private AttendanceService attendanceService;

    @MockBean
    private StudentService studentService;

    @MockBean
    private QrCodeService qrCodeService;

    @MockBean
    private LecturerService lecturerService;

    @MockBean
    private AuditLogService auditLogService;

    @MockBean
    private SystemSettingService systemSettingService;

    @MockBean
    private ReportService reportService;

    @MockBean
    private PasswordEncoder passwordEncoder;

    private User studentUser;
    private User adminUser;
    private User lecturerUser;
    private String studentToken;
    private String adminToken;
    private String lecturerToken;

    @BeforeEach
    void setUp() {
        rateLimiterService.reset();

        UUID studentId = UUID.randomUUID();
        studentUser = User.builder()
                .email("student@sliit.lk")
                .fullName("Kamal Silva")
                .role(Role.STUDENT)
                .isActive(true)
                .build();
        studentUser.setId(studentId);

        UUID adminId = UUID.randomUUID();
        adminUser = User.builder()
                .email("admin@sliit.lk")
                .fullName("System Administrator")
                .role(Role.ADMIN)
                .isActive(true)
                .build();
        adminUser.setId(adminId);

        UUID lecturerId = UUID.randomUUID();
        lecturerUser = User.builder()
                .email("lecturer@sliit.lk")
                .fullName("Dr. Lecturer")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUser.setId(lecturerId);

        Lecturer lecturerProfile = Lecturer.builder()
                .user(lecturerUser)
                .staffId("LEC-101")
                .fullName("Dr. Lecturer")
                .build();
        lecturerProfile.setId(UUID.randomUUID());

        when(userRepository.findByEmail("student@sliit.lk")).thenReturn(Optional.of(studentUser));
        when(userRepository.findByEmail("admin@sliit.lk")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByEmail("lecturer@sliit.lk")).thenReturn(Optional.of(lecturerUser));
        when(lecturerRepository.findByUserId(lecturerId)).thenReturn(Optional.of(lecturerProfile));

        studentToken = "Bearer " + jwtService.generateToken(studentUser);
        adminToken = "Bearer " + jwtService.generateToken(adminUser);
        lecturerToken = "Bearer " + jwtService.generateToken(lecturerUser);
    }

    // =========================================================================
    // 1. STUDENT TOKEN CANNOT CALL ANY ADMIN ENDPOINTS -> 403 FORBIDDEN
    // =========================================================================

    @Test
    @DisplayName("Security: Student token calling GET /api/admin/sessions -> 403 Forbidden")
    void testStudentCallingAdminSessionsForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/sessions")
                        .header("Authorization", studentToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("Security: Student token calling GET /api/admin/students -> 403 Forbidden")
    void testStudentCallingAdminStudentsForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/students")
                        .header("Authorization", studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security: Student token calling GET /api/admin/students/{id}/qr -> 403 Forbidden")
    void testStudentCallingAdminStudentQrForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/students/" + UUID.randomUUID() + "/qr")
                        .header("Authorization", studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security: Student token calling GET /api/admin/audits -> 403 Forbidden")
    void testStudentCallingAdminAuditsForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/audits")
                        .header("Authorization", studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security: Student token calling GET /api/admin/settings/low-attendance-threshold -> 403 Forbidden")
    void testStudentCallingAdminSettingsForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/settings/low-attendance-threshold")
                        .header("Authorization", studentToken))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 2. STUDENT TOKEN CANNOT CALL ANY LECTURER ENDPOINTS -> 403 FORBIDDEN
    // =========================================================================

    @Test
    @DisplayName("Security: Student token calling GET /api/lecturer/sessions -> 403 Forbidden")
    void testStudentCallingLecturerSessionsForbidden() throws Exception {
        mockMvc.perform(get("/api/lecturer/sessions")
                        .header("Authorization", studentToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("Security: Student token calling POST /api/lecturer/sessions/{id}/scan -> 403 Forbidden")
    void testStudentCallingLecturerScanForbidden() throws Exception {
        mockMvc.perform(post("/api/lecturer/sessions/" + UUID.randomUUID() + "/scan")
                        .header("Authorization", studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"qrToken\":\"random-token-1234\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security: Student token calling POST /api/lecturer/sessions/{id}/end -> 403 Forbidden")
    void testStudentCallingLecturerEndSessionForbidden() throws Exception {
        mockMvc.perform(post("/api/lecturer/sessions/" + UUID.randomUUID() + "/end")
                        .header("Authorization", studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"unmarkedAction\":\"MARK_ABSENT\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security: Student token calling GET /api/lecturer/reports/summary -> 403 Forbidden")
    void testStudentCallingLecturerReportForbidden() throws Exception {
        mockMvc.perform(get("/api/lecturer/reports/summary")
                        .header("Authorization", studentToken))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 3. STAFF TOKENS CANNOT CALL ANY STUDENT ENDPOINTS -> 403 FORBIDDEN
    // =========================================================================

    @Test
    @DisplayName("Security: Admin token calling /api/student/** -> 403 Forbidden on all endpoints")
    void testAdminCallingStudentEndpointsForbidden() throws Exception {
        mockMvc.perform(get("/api/student/me").header("Authorization", adminToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/student/attendance/summary").header("Authorization", adminToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/student/attendance/modules").header("Authorization", adminToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/student/attendance/history").header("Authorization", adminToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/student/change-password")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"p\",\"newPassword\":\"p\",\"confirmPassword\":\"p\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security: Lecturer token calling /api/student/** -> 403 Forbidden on all endpoints")
    void testLecturerCallingStudentEndpointsForbidden() throws Exception {
        mockMvc.perform(get("/api/student/me").header("Authorization", lecturerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/student/attendance/summary").header("Authorization", lecturerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/student/attendance/modules").header("Authorization", lecturerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/student/attendance/history").header("Authorization", lecturerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/student/change-password")
                        .header("Authorization", lecturerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"p\",\"newPassword\":\"p\",\"confirmPassword\":\"p\"}"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 4. UNAUTHENTICATED REQUESTS TO STUDENT ENDPOINTS -> 401 UNAUTHORIZED
    // =========================================================================

    @Test
    @DisplayName("Security: Unauthenticated request to /api/student/** -> 401 Unauthorized")
    void testUnauthenticatedStudentEndpointsReturn401() throws Exception {
        mockMvc.perform(get("/api/student/me"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/student/attendance/summary"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/student/attendance/modules"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/student/attendance/history"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/student/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"p\",\"newPassword\":\"p\",\"confirmPassword\":\"p\"}"))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // 5. IDOR & TAMPER RESISTANCE (STUDENT CANNOT ACCESS OTHER STUDENT'S DATA)
    // =========================================================================

    @Test
    @DisplayName("Security/IDOR: Passing other student ID as parameter is strictly ignored; service only receives authenticated user")
    void testIdorAttemptIgnoredByStudentEndpoints() throws Exception {
        UUID targetVictimStudentId = UUID.randomUUID();

        StudentProfileResponse profile = StudentProfileResponse.builder()
                .studentId("SLIIT-2026-001")
                .fullName("Kamal Silva")
                .email("student@sliit.lk")
                .degreeProgramme("BSc IT")
                .batch("2026.1")
                .labGroup("Group A")
                .enrollmentStatus("ACTIVE")
                .build();

        ArgumentCaptor<CustomUserDetails> userCaptor = ArgumentCaptor.forClass(CustomUserDetails.class);
        when(studentPortalService.getProfile(userCaptor.capture())).thenReturn(profile);

        // Attacker attempts to pass ?studentId=VICTIM_ID and ?id=VICTIM_UUID and ?userId=VICTIM_USER_ID
        mockMvc.perform(get("/api/student/me")
                        .header("Authorization", studentToken)
                        .param("studentId", "VICTIM-999")
                        .param("id", targetVictimStudentId.toString())
                        .param("userId", UUID.randomUUID().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.studentId").value("SLIIT-2026-001"))
                .andExpect(jsonPath("$.data.fullName").value("Kamal Silva"));

        // Verify that studentPortalService was called ONLY with the authenticated student User
        assertEquals(studentUser.getId(), userCaptor.getValue().getUser().getId());
        assertEquals(studentUser.getEmail(), userCaptor.getValue().getUser().getEmail());
    }

    @Test
    @DisplayName("Security/IDOR: Parameter tampering on /attendance/summary has no effect on resolved identity")
    void testIdorAttemptOnAttendanceSummary() throws Exception {
        StudentSummaryResponse summary = StudentSummaryResponse.builder()
                .eligibleFinalizedSessions(5)
                .attendedSessions(5)
                .missedSessions(0)
                .attendancePercentage("100.0%")
                .percentageNumeric(100.0)
                .crossGroupVisitsCount(0)
                .threshold(80.0)
                .belowThreshold(false)
                .build();

        ArgumentCaptor<CustomUserDetails> userCaptor = ArgumentCaptor.forClass(CustomUserDetails.class);
        when(studentPortalService.getAttendanceSummary(userCaptor.capture())).thenReturn(summary);

        mockMvc.perform(get("/api/student/attendance/summary")
                        .header("Authorization", studentToken)
                        .param("studentId", "VICTIM-STUDENT-ID")
                        .param("targetUser", UUID.randomUUID().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.attendancePercentage").value("100.0%"));

        assertEquals(studentUser.getId(), userCaptor.getValue().getUser().getId());
    }

    // =========================================================================
    // 6. CONFIRM NO WRITE / MUTATION ENDPOINTS EXIST ON /api/student/**
    // =========================================================================

    @Test
    @DisplayName("Security: Unsupported HTTP methods on student endpoints are rejected with 405 Method Not Allowed")
    void testUnsupportedMethodsOnStudentEndpointsReturn405() throws Exception {
        // Attempt POST on GET /api/student/me
        mockMvc.perform(post("/api/student/me")
                        .header("Authorization", studentToken))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405));

        // Attempt POST on GET /api/student/attendance/summary
        mockMvc.perform(post("/api/student/attendance/summary")
                        .header("Authorization", studentToken))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405));

        // Attempt DELETE on /api/student/attendance/history
        mockMvc.perform(delete("/api/student/attendance/history")
                        .header("Authorization", studentToken))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405));
    }

    @Test
    @DisplayName("Security: Non-existent mutation endpoints under /api/student/** return 404 Not Found (no student attendance mutation)")
    void testNoStudentAttendanceMutationEndpoints() throws Exception {
        // Attempt to create attendance record
        mockMvc.perform(post("/api/student/attendance")
                        .header("Authorization", studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PRESENT\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        // Attempt to modify attendance
        mockMvc.perform(put("/api/student/attendance/" + UUID.randomUUID())
                        .header("Authorization", studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PRESENT\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        // Attempt to delete attendance
        mockMvc.perform(delete("/api/student/attendance/" + UUID.randomUUID())
                        .header("Authorization", studentToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        // Attempt to create session
        mockMvc.perform(post("/api/student/sessions")
                        .header("Authorization", studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionDate\":\"2026-11-06\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }
}
