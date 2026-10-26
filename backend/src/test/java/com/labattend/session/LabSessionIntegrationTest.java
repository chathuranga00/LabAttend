package com.labattend.session;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.config.SecurityConfig;
import com.labattend.controller.admin.AdminSessionController;
import com.labattend.controller.lecturer.LecturerSessionController;
import com.labattend.dto.request.LabSessionCancelRequest;
import com.labattend.dto.request.LabSessionCreateRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.LabSessionResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.entity.Lecturer;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.GlobalExceptionHandler;
import com.labattend.repository.LecturerRepository;
import com.labattend.repository.UserRepository;
import com.labattend.security.*;
import com.labattend.service.LabSessionService;
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
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {LecturerSessionController.class, AdminSessionController.class})
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
public class LabSessionIntegrationTest {

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
    private LabSessionService labSessionService;

    @MockBean
    private com.labattend.service.AttendanceService attendanceService;

    private User lecturerUser;
    private User adminUser;
    private Lecturer lecturer;
    private String lecturerToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        UUID adminId = UUID.randomUUID();
        adminUser = User.builder()
                .email("admin@test.com")
                .fullName("System Admin")
                .passwordHash("hashed")
                .role(Role.ADMIN)
                .isActive(true)
                .build();
        adminUser.setId(adminId);

        UUID lecturerId = UUID.randomUUID();
        lecturerUser = User.builder()
                .email("lecturer@test.com")
                .fullName("Dr. Lecturer")
                .passwordHash("hashed")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUser.setId(lecturerId);

        lecturer = Lecturer.builder()
                .user(lecturerUser)
                .staffId("LEC-100")
                .fullName("Dr. Lecturer")
                .department("Computing")
                .isActive(true)
                .build();
        lecturer.setId(UUID.randomUUID());

        adminToken = jwtService.generateToken(adminUser);
        lecturerToken = jwtService.generateToken(lecturerUser);

        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByEmail("lecturer@test.com")).thenReturn(Optional.of(lecturerUser));
        when(lecturerRepository.findByUserId(lecturerUser.getId())).thenReturn(Optional.of(lecturer));
    }

    // ==========================================
    // 1. CREATE SESSION
    // ==========================================
    @Test
    @DisplayName("Create Lab Session -> Returns 201 Created and expected student count")
    void testCreateSessionSuccess() throws Exception {
        UUID moduleId = UUID.randomUUID();
        UUID batchId = UUID.randomUUID();
        UUID hallId = UUID.randomUUID();
        LocalDate date = LocalDate.now().plusDays(2);

        LabSessionCreateRequest request = LabSessionCreateRequest.builder()
                .moduleId(moduleId)
                .batchId(batchId)
                .hallId(hallId)
                .sessionDate(date)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .build();

        LabSessionResponse response = LabSessionResponse.builder()
                .id(UUID.randomUUID())
                .sessionCode("SES-CS101-261028-A1B2")
                .moduleId(moduleId)
                .moduleCode("CS101")
                .batchId(batchId)
                .batchCode("Y2026-B1")
                .hallId(hallId)
                .hallCode("LH-01")
                .sessionDate(date)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .status("DRAFT")
                .expectedStudentCount(45)
                .attendedCount(0)
                .build();

        when(labSessionService.createSession(eq(lecturerUser.getId()), any(LabSessionCreateRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/lecturer/sessions")
                        .header("Authorization", "Bearer " + lecturerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionCode").value("SES-CS101-261028-A1B2"))
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.expectedStudentCount").value(45));
    }

    // ==========================================
    // 2. INVALID TIMES
    // ==========================================
    @Test
    @DisplayName("Create Session with Invalid Times -> Returns 400 Bad Request")
    void testCreateSessionInvalidTimes() throws Exception {
        LabSessionCreateRequest request = LabSessionCreateRequest.builder()
                .moduleId(UUID.randomUUID())
                .batchId(UUID.randomUUID())
                .hallId(UUID.randomUUID())
                .sessionDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(12, 0))
                .endTime(LocalTime.of(10, 0)) // end before start!
                .build();

        when(labSessionService.createSession(eq(lecturerUser.getId()), any(LabSessionCreateRequest.class)))
                .thenThrow(new BadRequestException("End time must be strictly after start time"));

        mockMvc.perform(post("/api/lecturer/sessions")
                        .header("Authorization", "Bearer " + lecturerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("End time must be strictly after start time"));
    }

    // ==========================================
    // 3. UNAUTHORIZED MODULE
    // ==========================================
    @Test
    @DisplayName("Create Session with Unauthorized Module -> Returns 400 Bad Request")
    void testCreateSessionUnauthorizedModule() throws Exception {
        LabSessionCreateRequest request = LabSessionCreateRequest.builder()
                .moduleId(UUID.randomUUID())
                .batchId(UUID.randomUUID())
                .hallId(UUID.randomUUID())
                .sessionDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .build();

        when(labSessionService.createSession(eq(lecturerUser.getId()), any(LabSessionCreateRequest.class)))
                .thenThrow(new BadRequestException("Module 'CS999' and Batch 'B1' are not assigned to this lecturer"));

        mockMvc.perform(post("/api/lecturer/sessions")
                        .header("Authorization", "Bearer " + lecturerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("not assigned to this lecturer")));
    }

    // ==========================================
    // 4. CONFLICTING SESSION
    // ==========================================
    @Test
    @DisplayName("Create Session with Hall Conflict -> Returns 400 Bad Request")
    void testCreateSessionConflictingSession() throws Exception {
        LabSessionCreateRequest request = LabSessionCreateRequest.builder()
                .moduleId(UUID.randomUUID())
                .batchId(UUID.randomUUID())
                .hallId(UUID.randomUUID())
                .sessionDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .build();

        when(labSessionService.createSession(eq(lecturerUser.getId()), any(LabSessionCreateRequest.class)))
                .thenThrow(new BadRequestException("Hall conflict: 'LH-01' is already occupied by session 'SES-OTHER'"));

        mockMvc.perform(post("/api/lecturer/sessions")
                        .header("Authorization", "Bearer " + lecturerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("Hall conflict")));
    }

    // ==========================================
    // 5. START SESSION (DRAFT -> ACTIVE)
    // ==========================================
    @Test
    @DisplayName("Start Lab Session -> Returns 200 OK and ACTIVE status with actualStartedAt")
    void testStartSessionSuccess() throws Exception {
        UUID sessionId = UUID.randomUUID();
        LabSessionResponse response = LabSessionResponse.builder()
                .id(sessionId)
                .sessionCode("SES-CS101-261028-A1B2")
                .status("ACTIVE")
                .actualStartedAt(OffsetDateTime.now())
                .build();

        when(labSessionService.startSession(eq(lecturerUser.getId()), eq(sessionId)))
                .thenReturn(response);

        mockMvc.perform(post("/api/lecturer/sessions/" + sessionId + "/start")
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.actualStartedAt").isNotEmpty());
    }

    // ==========================================
    // 6. INVALID STATE TRANSITION
    // ==========================================
    @Test
    @DisplayName("Start Already Active Session -> Returns 400 Bad Request (Invalid Transition)")
    void testStartSessionInvalidTransition() throws Exception {
        UUID sessionId = UUID.randomUUID();

        when(labSessionService.startSession(eq(lecturerUser.getId()), eq(sessionId)))
                .thenThrow(new BadRequestException("Invalid state transition: Cannot start session in 'ACTIVE' state."));

        mockMvc.perform(post("/api/lecturer/sessions/" + sessionId + "/start")
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("Invalid state transition")));
    }

    // ==========================================
    // 7. LECTURER CANNOT VIEW ANOTHER LECTURER'S SESSION
    // ==========================================
    @Test
    @DisplayName("Lecturer Viewing Another Lecturer's Session -> Returns 400 Bad Request")
    void testLecturerCannotViewAnotherLecturersSession() throws Exception {
        UUID sessionId = UUID.randomUUID();

        when(labSessionService.getLecturerSessionById(eq(lecturerUser.getId()), eq(sessionId)))
                .thenThrow(new BadRequestException("Access denied. You can only view your own lab sessions."));

        mockMvc.perform(get("/api/lecturer/sessions/" + sessionId)
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("Access denied")));
    }

    // ==========================================
    // 8. ADMIN READ-ONLY LIST ALL SESSIONS
    // ==========================================
    @Test
    @DisplayName("Admin All Sessions -> Returns 200 OK with paginated list")
    void testAdminCanListAllSessions() throws Exception {
        LabSessionResponse item = LabSessionResponse.builder()
                .id(UUID.randomUUID())
                .sessionCode("SES-001")
                .status("DRAFT")
                .build();
        PageResponse<LabSessionResponse> pageResponse = PageResponse.<LabSessionResponse>builder()
                .content(List.of(item))
                .totalElements(1)
                .totalPages(1)
                .build();

        when(labSessionService.getAllSessionsForAdmin(any(), any(), any(), any(), any(), any(), any(), any(), eq(0), eq(10), any(), any()))
                .thenReturn(pageResponse);

        mockMvc.perform(get("/api/admin/sessions")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(1)));
    }

    @Test
    @DisplayName("Lecturer Calling Admin Sessions Endpoint -> Returns 403 Forbidden")
    void testLecturerAccessDeniedToAdminSessions() throws Exception {
        mockMvc.perform(get("/api/admin/sessions")
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }
}
