package com.labattend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.config.SecurityConfig;
import com.labattend.dto.student.*;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.exception.GlobalExceptionHandler;
import com.labattend.repository.LecturerRepository;
import com.labattend.repository.UserRepository;
import com.labattend.security.*;
import com.labattend.service.AuthService;
import com.labattend.service.StudentPortalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = StudentController.class)
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
class StudentControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private StudentPortalService studentPortalService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private LecturerRepository lecturerRepository;

    @MockBean
    private AuthService authService;

    private String studentToken;
    private String adminToken;
    private String lecturerToken;

    @BeforeEach
    void setUp() {
        User studentUser = User.builder()
                .email("student@test.ac.lk")
                .passwordHash("hashedPass")
                .role(Role.STUDENT)
                .isActive(true)
                .build();
        studentUser.setId(UUID.randomUUID());

        User adminUser = User.builder()
                .email("admin@test.ac.lk")
                .passwordHash("hashedPass")
                .role(Role.ADMIN)
                .isActive(true)
                .build();
        adminUser.setId(UUID.randomUUID());

        User lecturerUser = User.builder()
                .email("lecturer@test.ac.lk")
                .passwordHash("hashedPass")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUser.setId(UUID.randomUUID());

        when(userRepository.findByEmail("student@test.ac.lk")).thenReturn(Optional.of(studentUser));
        when(userRepository.findByEmail("admin@test.ac.lk")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByEmail("lecturer@test.ac.lk")).thenReturn(Optional.of(lecturerUser));

        studentToken = "Bearer " + jwtService.generateToken(studentUser);
        adminToken = "Bearer " + jwtService.generateToken(adminUser);
        lecturerToken = "Bearer " + jwtService.generateToken(lecturerUser);
    }

    @Test
    @DisplayName("GET /api/student/me -> 401 without token, 403 for ADMIN and LECTURER, 200 for STUDENT")
    void testGetProfileAuthorization() throws Exception {
        // 401 Unauthorized without token
        mockMvc.perform(get("/api/student/me"))
                .andExpect(status().isUnauthorized());

        // 403 Forbidden with ADMIN token
        mockMvc.perform(get("/api/student/me")
                        .header("Authorization", adminToken))
                .andExpect(status().isForbidden());

        // 403 Forbidden with LECTURER token
        mockMvc.perform(get("/api/student/me")
                        .header("Authorization", lecturerToken))
                .andExpect(status().isForbidden());

        // 200 OK with STUDENT token
        StudentProfileResponse profile = StudentProfileResponse.builder()
                .studentId("NSBM2026042")
                .fullName("Kasun Perera")
                .email("student@test.ac.lk")
                .degreeProgramme("BSc Software Engineering")
                .batch("2026.1")
                .labGroup("Group A")
                .enrollmentStatus("ACTIVE")
                .build();

        when(studentPortalService.getProfile(any())).thenReturn(profile);

        mockMvc.perform(get("/api/student/me")
                        .header("Authorization", studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.studentId").value("NSBM2026042"))
                .andExpect(jsonPath("$.data.fullName").value("Kasun Perera"))
                // Ensure forbidden fields are strictly absent
                .andExpect(jsonPath("$.data.qrToken").doesNotExist())
                .andExpect(jsonPath("$.data.qr_token").doesNotExist())
                .andExpect(jsonPath("$.data.qrTokenHash").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/student/attendance/summary -> 403 for staff, 200 for STUDENT with accurate summary")
    void testGetAttendanceSummaryAuthorization() throws Exception {
        mockMvc.perform(get("/api/student/attendance/summary")
                        .header("Authorization", adminToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/student/attendance/summary")
                        .header("Authorization", lecturerToken))
                .andExpect(status().isForbidden());

        StudentSummaryResponse summary = StudentSummaryResponse.builder()
                .eligibleFinalizedSessions(10)
                .attendedSessions(8)
                .missedSessions(2)
                .attendancePercentage("80.0%")
                .percentageNumeric(80.0)
                .crossGroupVisitsCount(1)
                .threshold(80.0)
                .belowThreshold(false)
                .build();

        when(studentPortalService.getAttendanceSummary(any())).thenReturn(summary);

        mockMvc.perform(get("/api/student/attendance/summary")
                        .header("Authorization", studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.eligibleFinalizedSessions").value(10))
                .andExpect(jsonPath("$.data.attendedSessions").value(8))
                .andExpect(jsonPath("$.data.attendancePercentage").value("80.0%"))
                .andExpect(jsonPath("$.data.belowThreshold").value(false));
    }

    @Test
    @DisplayName("GET /api/student/attendance/modules -> 403 for staff, 200 for STUDENT")
    void testGetModuleAttendance() throws Exception {
        mockMvc.perform(get("/api/student/attendance/modules")
                        .header("Authorization", lecturerToken))
                .andExpect(status().isForbidden());

        StudentModuleAttendanceResponse mod = StudentModuleAttendanceResponse.builder()
                .moduleCode("SE301")
                .moduleName("Distributed Systems")
                .eligibleFinalizedSessions(5)
                .attendedSessions(4)
                .missedSessions(1)
                .attendancePercentage("80.0%")
                .percentageNumeric(80.0)
                .belowThreshold(false)
                .build();

        when(studentPortalService.getModuleAttendance(any())).thenReturn(List.of(mod));

        mockMvc.perform(get("/api/student/attendance/modules")
                        .header("Authorization", studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].moduleCode").value("SE301"))
                .andExpect(jsonPath("$.data[0].attendedSessions").value(4));
    }

    @Test
    @DisplayName("GET /api/student/attendance/history -> Returns paginated history and excludes forbidden fields")
    void testGetAttendanceHistoryExcludesForbiddenFields() throws Exception {
        StudentAttendanceHistoryItemResponse item = StudentAttendanceHistoryItemResponse.builder()
                .sessionDate(LocalDate.of(2026, 11, 5))
                .moduleCode("SE301")
                .moduleName("Distributed Systems")
                .labSheetNumber("SHEET-01")
                .labGroup("Group A")
                .status("PRESENT")
                .isCrossGroup(false)
                .isCorrected(true)
                .build();

        when(studentPortalService.getAttendanceHistory(any(), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(item), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/student/attendance/history")
                        .header("Authorization", studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].moduleCode").value("SE301"))
                .andExpect(jsonPath("$.data.content[0].labSheetNumber").value("SHEET-01"))
                .andExpect(jsonPath("$.data.content[0].status").value("PRESENT"))
                .andExpect(jsonPath("$.data.content[0].isCorrected").value(true))
                // Verify forbidden fields are NOT in output
                .andExpect(jsonPath("$.data.content[0].justificationNotes").doesNotExist())
                .andExpect(jsonPath("$.data.content[0].lecturerNotes").doesNotExist())
                .andExpect(jsonPath("$.data.content[0].markedBy").doesNotExist())
                .andExpect(jsonPath("$.data.content[0].correctedBy").doesNotExist())
                .andExpect(jsonPath("$.data.content[0].qrToken").doesNotExist())
                .andExpect(jsonPath("$.data.content[0].auditData").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/student/change-password -> 403 for staff, 200 for STUDENT")
    void testChangePasswordAuthorization() throws Exception {
        StudentPasswordChangeRequest req = StudentPasswordChangeRequest.builder()
                .currentPassword("OldPass123!")
                .newPassword("NewPass123!@#")
                .confirmPassword("NewPass123!@#")
                .build();

        mockMvc.perform(post("/api/student/change-password")
                        .header("Authorization", lecturerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/student/change-password")
                        .header("Authorization", studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Password changed successfully"));
    }
}
