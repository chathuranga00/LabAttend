package com.labattend.attendance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.config.SecurityConfig;
import com.labattend.controller.lecturer.LecturerSessionController;
import com.labattend.dto.request.AttendanceScanRequest;
import com.labattend.dto.request.ManualAttendanceRequest;
import com.labattend.dto.response.AttendanceScanResponse;
import com.labattend.entity.Lecturer;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.GlobalExceptionHandler;
import com.labattend.repository.LecturerRepository;
import com.labattend.repository.UserRepository;
import com.labattend.security.*;
import com.labattend.service.AttendanceService;
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

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = LecturerSessionController.class)
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
public class AttendanceIntegrationTest {

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
    private AttendanceService attendanceService;

    private User lecturerUser;
    private Lecturer lecturer;
    private String lecturerToken;
    private UUID sessionId;

    @BeforeEach
    void setUp() {
        sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        lecturerUser = User.builder()
                .email("lecturer@sliit.lk")
                .fullName("Dr. Perera")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUser.setId(userId);

        lecturer = Lecturer.builder()
                .user(lecturerUser)
                .staffId("LEC001")
                .build();
        lecturer.setId(UUID.randomUUID());

        when(userRepository.findByEmail("lecturer@sliit.lk")).thenReturn(java.util.Optional.of(lecturerUser));
        when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(lecturerUser));
        when(lecturerRepository.findByUserId(userId)).thenReturn(java.util.Optional.of(lecturer));

        lecturerToken = jwtService.generateToken(lecturerUser);
    }

    @Test
    @DisplayName("POST /api/lecturer/sessions/{id}/scan: success returns 200 with attendance data")
    void testScanEndpoint_Success() throws Exception {
        AttendanceScanResponse mockResponse = AttendanceScanResponse.builder()
                .result("SUCCESS")
                .message("Attendance Recorded Successfully")
                .studentId("IT21001234")
                .studentName("Kasun Jayawardena")
                .scannedAt(OffsetDateTime.now())
                .attendanceStatus("PRESENT")
                .method("QR_SCAN")
                .totalExpected(30)
                .attendedCount(1)
                .remainingCount(29)
                .build();

        when(attendanceService.scanQrAttendance(any(), eq(sessionId), any(AttendanceScanRequest.class)))
                .thenReturn(mockResponse);

        AttendanceScanRequest req = new AttendanceScanRequest("IT21001234");

        mockMvc.perform(post("/api/lecturer/sessions/" + sessionId + "/scan")
                        .header("Authorization", "Bearer " + lecturerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.result").value("SUCCESS"))
                .andExpect(jsonPath("$.data.studentId").value("IT21001234"))
                .andExpect(jsonPath("$.data.attendedCount").value(1));
    }

    @Test
    @DisplayName("POST /api/lecturer/sessions/{id}/scan: invalid QR returns 400")
    void testScanEndpoint_InvalidQr() throws Exception {
        when(attendanceService.scanQrAttendance(any(), eq(sessionId), any(AttendanceScanRequest.class)))
                .thenThrow(new BadRequestException("Invalid QR Code — Student Not Found"));

        AttendanceScanRequest req = new AttendanceScanRequest("UNKNOWN");

        mockMvc.perform(post("/api/lecturer/sessions/" + sessionId + "/scan")
                        .header("Authorization", "Bearer " + lecturerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid QR Code — Student Not Found"));
    }

    @Test
    @DisplayName("POST /api/lecturer/sessions/{id}/manual-attendance: blank reason rejected with 400")
    void testManualAttendance_BlankReasonRejected() throws Exception {
        ManualAttendanceRequest req = new ManualAttendanceRequest(UUID.randomUUID(), null, "");

        mockMvc.perform(post("/api/lecturer/sessions/" + sessionId + "/manual-attendance")
                        .header("Authorization", "Bearer " + lecturerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /api/lecturer/sessions/{id}/expected-students: returns expected roster")
    void testGetExpectedStudents_ReturnsRoster() throws Exception {
        when(attendanceService.getSessionExpectedStudents(any(), eq(sessionId), any()))
                .thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/lecturer/sessions/" + sessionId + "/expected-students")
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }
}
