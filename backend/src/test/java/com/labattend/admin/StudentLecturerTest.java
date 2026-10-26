package com.labattend.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.config.SecurityConfig;
import com.labattend.controller.admin.AdminLecturerController;
import com.labattend.controller.admin.AdminStudentController;
import com.labattend.dto.request.LecturerCreateRequest;
import com.labattend.dto.request.LecturerUpdateRequest;
import com.labattend.dto.request.StudentRequest;
import com.labattend.dto.response.*;
import com.labattend.entity.*;
import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.GlobalExceptionHandler;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.*;
import com.labattend.security.*;
import com.labattend.service.AuditLogService;
import com.labattend.service.AuthService;
import com.labattend.service.LecturerService;
import com.labattend.service.StudentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {AdminStudentController.class, AdminLecturerController.class})
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
public class StudentLecturerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private StudentService studentService;

    @MockBean
    private LecturerService lecturerService;

    private User adminUser;
    private User lecturerUser;
    private String adminToken;
    private String lecturerToken;

    @BeforeEach
    void setUp() {
        UUID adminId = UUID.randomUUID();
        adminUser = User.builder()
                .email("admin@test.com")
                .fullName("System Admin")
                .passwordHash("hashed")
                .role(Role.ADMIN)
                .isActive(true)
                .mustChangePassword(false)
                .build();
        adminUser.setId(adminId);

        UUID lecturerId = UUID.randomUUID();
        lecturerUser = User.builder()
                .email("lecturer@test.com")
                .fullName("Test Lecturer")
                .passwordHash("hashed")
                .role(Role.LECTURER)
                .isActive(true)
                .mustChangePassword(false)
                .build();
        lecturerUser.setId(lecturerId);

        adminToken = jwtService.generateToken(adminUser);
        lecturerToken = jwtService.generateToken(lecturerUser);

        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByEmail("lecturer@test.com")).thenReturn(Optional.of(lecturerUser));
    }

    // ==========================================
    // 1. CREATE STUDENT
    // ==========================================
    @Test
    @DisplayName("Create Student -> Returns 201 Created with student details")
    void testCreateStudentSuccess() throws Exception {
        UUID progId = UUID.randomUUID();
        UUID batchId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        StudentRequest request = StudentRequest.builder()
                .studentId("STU001")
                .fullName("Jane Doe")
                .email("jane.doe@uni.ac.lk")
                .degreeProgrammeId(progId)
                .batchId(batchId)
                .qrToken("QR-RAW-TOKEN-1234")
                .build();

        StudentResponse response = StudentResponse.builder()
                .id(studentId)
                .studentId("STU001")
                .fullName("Jane Doe")
                .email("jane.doe@uni.ac.lk")
                .degreeProgrammeId(progId)
                .degreeProgrammeCode("SE")
                .degreeProgrammeName("Software Engineering")
                .batchId(batchId)
                .batchCode("Y2026-B1")
                .isActive(true)
                .hasQrToken(true)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        when(studentService.createStudent(any(StudentRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/admin/students")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.studentId").value("STU001"))
                .andExpect(jsonPath("$.data.fullName").value("Jane Doe"))
                .andExpect(jsonPath("$.data.hasQrToken").value(true));
    }

    // ==========================================
    // 2. DUPLICATE STUDENT ID
    // ==========================================
    @Test
    @DisplayName("Create Student with Duplicate ID -> Returns 400 Bad Request")
    void testCreateStudentDuplicateId() throws Exception {
        StudentRequest request = StudentRequest.builder()
                .studentId("STU001")
                .fullName("Duplicate Student")
                .email("dup@uni.ac.lk")
                .degreeProgrammeId(UUID.randomUUID())
                .batchId(UUID.randomUUID())
                .build();

        when(studentService.createStudent(any(StudentRequest.class)))
                .thenThrow(new BadRequestException("Student ID already exists: STU001"));

        mockMvc.perform(post("/api/admin/students")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Student ID already exists: STU001"));
    }

    // ==========================================
    // 3. INVALID BATCH
    // ==========================================
    @Test
    @DisplayName("Create Student with Invalid Batch -> Returns 400 Bad Request")
    void testCreateStudentInvalidBatch() throws Exception {
        StudentRequest request = StudentRequest.builder()
                .studentId("STU002")
                .fullName("John Smith")
                .email("john@uni.ac.lk")
                .degreeProgrammeId(UUID.randomUUID())
                .batchId(UUID.randomUUID())
                .build();

        when(studentService.createStudent(any(StudentRequest.class)))
                .thenThrow(new BadRequestException("Selected batch does not belong to the selected degree programme"));

        mockMvc.perform(post("/api/admin/students")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("batch does not belong")));
    }

    // ==========================================
    // 4. UPDATE STUDENT
    // ==========================================
    @Test
    @DisplayName("Update Student -> Returns 200 OK with updated details")
    void testUpdateStudentSuccess() throws Exception {
        UUID id = UUID.randomUUID();
        StudentRequest request = StudentRequest.builder()
                .studentId("STU001")
                .fullName("Jane Updated Doe")
                .email("jane.updated@uni.ac.lk")
                .degreeProgrammeId(UUID.randomUUID())
                .batchId(UUID.randomUUID())
                .build();

        StudentResponse response = StudentResponse.builder()
                .id(id)
                .studentId("STU001")
                .fullName("Jane Updated Doe")
                .email("jane.updated@uni.ac.lk")
                .isActive(true)
                .build();

        when(studentService.updateStudent(eq(id), any(StudentRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/admin/students/" + id)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Jane Updated Doe"));
    }

    // ==========================================
    // 5. DEACTIVATION (STUDENT & LECTURER)
    // ==========================================
    @Test
    @DisplayName("Deactivate Student -> Returns 200 OK and toggles isActive to false")
    void testToggleStudentStatusDeactivate() throws Exception {
        UUID id = UUID.randomUUID();
        StudentResponse response = StudentResponse.builder()
                .id(id)
                .studentId("STU001")
                .fullName("Jane Doe")
                .isActive(false)
                .build();

        when(studentService.toggleStatus(id)).thenReturn(response);

        mockMvc.perform(patch("/api/admin/students/" + id + "/toggle-status")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.isActive").value(false))
                .andExpect(jsonPath("$.message").value("Student deactivated successfully"));
    }

    @Test
    @DisplayName("Deactivate Lecturer -> Returns 200 OK and toggles isActive to false")
    void testToggleLecturerStatusDeactivate() throws Exception {
        UUID id = UUID.randomUUID();
        LecturerResponse response = LecturerResponse.builder()
                .id(id)
                .staffId("LEC001")
                .fullName("Dr. Alan Turing")
                .department("Computer Science")
                .isActive(false)
                .build();

        when(lecturerService.toggleStatus(id)).thenReturn(response);

        mockMvc.perform(patch("/api/admin/lecturers/" + id + "/toggle-status")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.isActive").value(false))
                .andExpect(jsonPath("$.message").value("Lecturer deactivated successfully"));
    }

    // ==========================================
    // 6. CREATE LECTURER WITH TEMP PASSWORD
    // ==========================================
    @Test
    @DisplayName("Create Lecturer -> Returns 201 Created with temporary password")
    void testCreateLecturerSuccess() throws Exception {
        UUID id = UUID.randomUUID();
        LecturerCreateRequest request = LecturerCreateRequest.builder()
                .staffId("LEC001")
                .fullName("Dr. Ada Lovelace")
                .email("ada@uni.ac.lk")
                .department("Computing")
                .build();

        LecturerResponse response = LecturerResponse.builder()
                .id(id)
                .staffId("LEC001")
                .fullName("Dr. Ada Lovelace")
                .email("ada@uni.ac.lk")
                .department("Computing")
                .isActive(true)
                .mustChangePassword(true)
                .temporaryPassword("SecureTempPass123!")
                .build();

        when(lecturerService.createLecturer(any(LecturerCreateRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/admin/lecturers")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.temporaryPassword").value("SecureTempPass123!"))
                .andExpect(jsonPath("$.data.mustChangePassword").value(true));
    }

    // ==========================================
    // 7. LECTURER CANNOT CALL ADMIN ENDPOINT
    // ==========================================
    @Test
    @DisplayName("Lecturer Calling Admin Student Endpoint -> Returns 403 Forbidden")
    void testLecturerAccessDeniedToAdminStudents() throws Exception {
        mockMvc.perform(get("/api/admin/students")
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }
}
