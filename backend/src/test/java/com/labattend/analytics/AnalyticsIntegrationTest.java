package com.labattend.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.config.SecurityConfig;
import com.labattend.controller.admin.AdminAnalyticsController;
import com.labattend.controller.lecturer.LecturerAnalyticsController;
import com.labattend.dto.response.analytics.AnalyticsOverviewResponse;
import com.labattend.dto.response.analytics.AttendanceTrendPoint;
import com.labattend.dto.response.analytics.StudentAttendanceSummaryResponse;
import com.labattend.entity.Lecturer;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.exception.GlobalExceptionHandler;
import com.labattend.repository.LecturerRepository;
import com.labattend.repository.UserRepository;
import com.labattend.security.*;
import com.labattend.service.AnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {AdminAnalyticsController.class, LecturerAnalyticsController.class})
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
public class AnalyticsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private LecturerRepository lecturerRepository;

    @MockBean
    private AnalyticsService analyticsService;

    private String adminToken;
    private String lecturerToken;
    private User adminUser;
    private User lecturerUser;
    private Lecturer lecturer;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .email("admin@labattend.edu")
                .fullName("System Admin")
                .role(Role.ADMIN)
                .isActive(true)
                .build();
        adminUser.setId(UUID.randomUUID());

        lecturerUser = User.builder()
                .email("lecturer@labattend.edu")
                .fullName("Dr. Perera")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUser.setId(UUID.randomUUID());

        lecturer = Lecturer.builder()
                .user(lecturerUser)
                .staffId("LEC001")
                .build();
        lecturer.setId(UUID.randomUUID());

        when(userRepository.findByEmail("admin@labattend.edu")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByEmail("lecturer@labattend.edu")).thenReturn(Optional.of(lecturerUser));
        when(lecturerRepository.findByUserId(lecturerUser.getId())).thenReturn(Optional.of(lecturer));

        adminToken = jwtService.generateToken(adminUser);
        lecturerToken = jwtService.generateToken(lecturerUser);
    }

    @Test
    @DisplayName("Admin can access admin analytics overview")
    void testAdminCanAccessAdminOverview() throws Exception {
        AnalyticsOverviewResponse mockResponse = AnalyticsOverviewResponse.builder()
                .totalSessions(10)
                .finalizedSessions(8)
                .activeSessions(1)
                .cancelledSessions(1)
                .totalExpectedSlots(240)
                .totalPresentSlots(216)
                .totalAbsentSlots(24)
                .overallAttendancePercentage("90.0%")
                .percentageNumeric(90.0)
                .totalStudents(150L)
                .totalLecturers(12L)
                .totalModules(8L)
                .totalBatches(6L)
                .totalProgrammes(2L)
                .build();

        when(analyticsService.getAdminOverview(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(mockResponse);

        mockMvc.perform(get("/api/admin/analytics/overview")
                        .header("Authorization", "Bearer " + adminToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.overallAttendancePercentage", is("90.0%")))
                .andExpect(jsonPath("$.data.totalStudents", is(150)));
    }

    @Test
    @DisplayName("Lecturer cannot access admin analytics endpoints (403 Forbidden)")
    void testLecturerCannotAccessAdminAnalytics() throws Exception {
        mockMvc.perform(get("/api/admin/analytics/overview")
                        .header("Authorization", "Bearer " + lecturerToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin cannot access lecturer analytics endpoints (403 Forbidden)")
    void testAdminCannotAccessLecturerAnalytics() throws Exception {
        mockMvc.perform(get("/api/lecturer/analytics/overview")
                        .header("Authorization", "Bearer " + adminToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Unauthenticated request is rejected (401 Unauthorized)")
    void testUnauthenticatedAccessRejected() throws Exception {
        mockMvc.perform(get("/api/lecturer/analytics/overview")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Lecturer can access lecturer analytics overview and student summaries")
    void testLecturerCanAccessLecturerAnalytics() throws Exception {
        AnalyticsOverviewResponse mockOverview = AnalyticsOverviewResponse.builder()
                .totalSessions(5)
                .finalizedSessions(4)
                .activeSessions(1)
                .totalExpectedSlots(100)
                .totalPresentSlots(85)
                .totalAbsentSlots(15)
                .overallAttendancePercentage("85.0%")
                .percentageNumeric(85.0)
                .build();

        when(analyticsService.getLecturerOverview(eq(lecturerUser.getId()), any(), any(), any(), any(), any(), any()))
                .thenReturn(mockOverview);

        when(analyticsService.getLecturerByUserId(lecturerUser.getId())).thenReturn(lecturer);

        mockMvc.perform(get("/api/lecturer/analytics/overview")
                        .header("Authorization", "Bearer " + lecturerToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.overallAttendancePercentage", is("85.0%")))
                .andExpect(jsonPath("$.data.activeSessions", is(1)));

        // Test students summary endpoint
        StudentAttendanceSummaryResponse studentSummary = StudentAttendanceSummaryResponse.builder()
                .studentId(UUID.randomUUID())
                .officialStudentId("IT21001234")
                .fullName("Kasun Silva")
                .batchCode("Y2S1-2026")
                .eligibleFinalizedSessions(4)
                .attendedSessions(4)
                .missedSessions(0)
                .attendancePercentage("100.0%")
                .percentageNumeric(100.0)
                .isLowAttendance(false)
                .build();

        when(analyticsService.getStudentAttendanceSummaries(eq(lecturer.getId()), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(Collections.singletonList(studentSummary));

        mockMvc.perform(get("/api/lecturer/analytics/students")
                        .header("Authorization", "Bearer " + lecturerToken)
                        .param("threshold", "75.0")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data[0].officialStudentId", is("IT21001234")))
                .andExpect(jsonPath("$.data[0].attendancePercentage", is("100.0%")));
    }
}
