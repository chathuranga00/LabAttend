package com.labattend.academic;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.config.SecurityConfig;
import com.labattend.controller.admin.*;
import com.labattend.dto.request.*;
import com.labattend.dto.response.*;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.GlobalExceptionHandler;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.UserRepository;
import com.labattend.security.*;
import com.labattend.service.*;
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
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {
        AdminDegreeProgrammeController.class,
        AdminBatchController.class,
        AdminModuleController.class,
        AdminLaboratoryHallController.class,
        AdminAssignmentController.class
})
@Import({
        SecurityConfig.class,
        JwtService.class,
        CustomUserDetailsService.class,
        JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class,
        CustomAccessDeniedHandler.class,
        GlobalExceptionHandler.class
})
public class AcademicStructureIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private DegreeProgrammeService degreeProgrammeService;

    @MockBean
    private BatchService batchService;

    @MockBean
    private ModuleService moduleService;

    @MockBean
    private LaboratoryHallService laboratoryHallService;

    @MockBean
    private LecturerAssignmentService lecturerAssignmentService;

    private String adminToken;
    private String lecturerToken;
    private User adminUser;
    private User lecturerUser;

    @BeforeEach
    void setUp() {
        UUID adminId = UUID.randomUUID();
        adminUser = User.builder()
                .email("admin@labattend.com")
                .passwordHash("hashed")
                .fullName("Administrator")
                .role(Role.ADMIN)
                .isActive(true)
                .build();
        adminUser.setId(adminId);

        UUID lecturerId = UUID.randomUUID();
        lecturerUser = User.builder()
                .email("lecturer@labattend.com")
                .passwordHash("hashed")
                .fullName("Lecturer User")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUser.setId(lecturerId);

        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));
        when(userRepository.findByEmail(adminUser.getEmail())).thenReturn(Optional.of(adminUser));

        when(userRepository.findById(lecturerId)).thenReturn(Optional.of(lecturerUser));
        when(userRepository.findByEmail(lecturerUser.getEmail())).thenReturn(Optional.of(lecturerUser));

        adminToken = jwtService.generateToken(adminUser);
        lecturerToken = jwtService.generateToken(lecturerUser);
    }

    // =========================================================================
    // 1. ROLE-BASED ACCESS CONTROL: Lecturer cannot access Admin endpoints
    // =========================================================================

    @Test
    @DisplayName("Lecturer cannot access degree programmes endpoint (403 Forbidden)")
    void testLecturerCannotAccessDegreeProgrammes() throws Exception {
        mockMvc.perform(get("/api/admin/programmes")
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    @Test
    @DisplayName("Lecturer cannot create a module (403 Forbidden)")
    void testLecturerCannotCreateModule() throws Exception {
        ModuleRequest request = ModuleRequest.builder()
                .moduleCode("CS301")
                .name("Computer Networks")
                .credits(3)
                .build();

        mockMvc.perform(post("/api/admin/modules")
                        .header("Authorization", "Bearer " + lecturerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Lecturer cannot access laboratory halls (403 Forbidden)")
    void testLecturerCannotAccessHalls() throws Exception {
        mockMvc.perform(get("/api/admin/halls")
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Lecturer cannot create a batch (403 Forbidden)")
    void testLecturerCannotCreateBatch() throws Exception {
        BatchRequest request = BatchRequest.builder()
                .batchCode("Y3S1-CS")
                .academicYear("2024")
                .degreeProgrammeId(UUID.randomUUID())
                .build();

        mockMvc.perform(post("/api/admin/batches")
                        .header("Authorization", "Bearer " + lecturerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    // =========================================================================
    // 2. DUPLICATE CODE REJECTION (400 Bad Request)
    // =========================================================================

    @Test
    @DisplayName("Reject duplicate degree programme code (400 Bad Request)")
    void testDuplicateDegreeProgrammeCodeRejected() throws Exception {
        DegreeProgrammeRequest request = DegreeProgrammeRequest.builder()
                .code("BSC-CS")
                .name("BSc in Computer Science")
                .department("Computing")
                .build();

        when(degreeProgrammeService.createProgramme(any(DegreeProgrammeRequest.class)))
                .thenThrow(new BadRequestException("Degree programme code already exists: BSC-CS"));

        mockMvc.perform(post("/api/admin/programmes")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Degree programme code already exists: BSC-CS"));
    }

    @Test
    @DisplayName("Reject duplicate module code (400 Bad Request)")
    void testDuplicateModuleCodeRejected() throws Exception {
        ModuleRequest request = ModuleRequest.builder()
                .moduleCode("CS101")
                .name("Introduction to Programming")
                .credits(4)
                .build();

        when(moduleService.createModule(any(ModuleRequest.class)))
                .thenThrow(new BadRequestException("Module code already exists: CS101"));

        mockMvc.perform(post("/api/admin/modules")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Module code already exists: CS101"));
    }

    @Test
    @DisplayName("Reject duplicate hall code (400 Bad Request)")
    void testDuplicateHallCodeRejected() throws Exception {
        LaboratoryHallRequest request = LaboratoryHallRequest.builder()
                .hallCode("LAB-A")
                .name("Computer Lab A")
                .capacity(50)
                .build();

        when(laboratoryHallService.createHall(any(LaboratoryHallRequest.class)))
                .thenThrow(new BadRequestException("Laboratory hall code already exists: LAB-A"));

        mockMvc.perform(post("/api/admin/halls")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Laboratory hall code already exists: LAB-A"));
    }

    @Test
    @DisplayName("Reject duplicate batch code (400 Bad Request)")
    void testDuplicateBatchCodeRejected() throws Exception {
        BatchRequest request = BatchRequest.builder()
                .batchCode("BATCH-2024")
                .academicYear("2024")
                .degreeProgrammeId(UUID.randomUUID())
                .build();

        when(batchService.createBatch(any(BatchRequest.class)))
                .thenThrow(new BadRequestException("Batch code already exists: BATCH-2024"));

        mockMvc.perform(post("/api/admin/batches")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Batch code already exists: BATCH-2024"));
    }

    // =========================================================================
    // 3. INVALID FOREIGN KEYS REJECTED (404 Not Found)
    // =========================================================================

    @Test
    @DisplayName("Reject batch creation when degree programme does not exist (404 Not Found)")
    void testBatchWithInvalidProgrammeIdRejected() throws Exception {
        UUID fakeProgrammeId = UUID.randomUUID();
        BatchRequest request = BatchRequest.builder()
                .batchCode("BATCH-99")
                .academicYear("2024")
                .degreeProgrammeId(fakeProgrammeId)
                .build();

        when(batchService.createBatch(any(BatchRequest.class)))
                .thenThrow(new ResourceNotFoundException("DegreeProgramme", "id", fakeProgrammeId));

        mockMvc.perform(post("/api/admin/batches")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("DegreeProgramme not found with id")));
    }

    @Test
    @DisplayName("Reject module creation when degree programme does not exist (404 Not Found)")
    void testModuleWithInvalidProgrammeIdRejected() throws Exception {
        UUID fakeProgrammeId = UUID.randomUUID();
        ModuleRequest request = ModuleRequest.builder()
                .moduleCode("CS404")
                .name("Distributed Systems")
                .credits(3)
                .degreeProgrammeId(fakeProgrammeId)
                .build();

        when(moduleService.createModule(any(ModuleRequest.class)))
                .thenThrow(new ResourceNotFoundException("DegreeProgramme", "id", fakeProgrammeId));

        mockMvc.perform(post("/api/admin/modules")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("DegreeProgramme not found with id")));
    }

    @Test
    @DisplayName("Reject lecturer assignment when lecturer does not exist (404 Not Found)")
    void testAssignmentWithInvalidLecturerIdRejected() throws Exception {
        UUID fakeLecturerId = UUID.randomUUID();
        LecturerAssignmentRequest request = LecturerAssignmentRequest.builder()
                .lecturerId(fakeLecturerId)
                .moduleId(UUID.randomUUID())
                .academicYear("2024")
                .semester("1")
                .build();

        when(lecturerAssignmentService.createAssignment(any(LecturerAssignmentRequest.class)))
                .thenThrow(new ResourceNotFoundException("Lecturer", "id", fakeLecturerId));

        mockMvc.perform(post("/api/admin/assignments")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("Lecturer not found with id")));
    }

    // =========================================================================
    // 4. ADMIN SUCCESSFUL CRUD & PAGINATION
    // =========================================================================

    @Test
    @DisplayName("Admin can successfully create a degree programme (201 Created)")
    void testAdminCreateProgrammeSuccess() throws Exception {
        DegreeProgrammeRequest request = DegreeProgrammeRequest.builder()
                .code("BSC-SE")
                .name("BSc in Software Engineering")
                .department("Computing")
                .build();

        DegreeProgrammeResponse response = DegreeProgrammeResponse.builder()
                .id(UUID.randomUUID())
                .code("BSC-SE")
                .name("BSc in Software Engineering")
                .department("Computing")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        when(degreeProgrammeService.createProgramme(any(DegreeProgrammeRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/admin/programmes")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value("BSC-SE"))
                .andExpect(jsonPath("$.data.isActive").value(true));
    }

    @Test
    @DisplayName("Admin can fetch paginated degree programmes (200 OK)")
    void testAdminGetProgrammesPaginated() throws Exception {
        DegreeProgrammeResponse item = DegreeProgrammeResponse.builder()
                .id(UUID.randomUUID())
                .code("BSC-SE")
                .name("BSc in Software Engineering")
                .department("Computing")
                .isActive(true)
                .build();

        PageResponse<DegreeProgrammeResponse> pageResponse = PageResponse.<DegreeProgrammeResponse>builder()
                .content(List.of(item))
                .pageNumber(0)
                .pageSize(10)
                .totalElements(1)
                .totalPages(1)
                .isLast(true)
                .build();

        when(degreeProgrammeService.getProgrammes(any(), eq(0), eq(10), eq("code"), eq("asc")))
                .thenReturn(pageResponse);

        mockMvc.perform(get("/api/admin/programmes")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].code").value("BSC-SE"))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    @DisplayName("Admin can toggle status (soft activate/deactivate)")
    void testAdminToggleStatus() throws Exception {
        UUID id = UUID.randomUUID();
        DegreeProgrammeResponse response = DegreeProgrammeResponse.builder()
                .id(id)
                .code("BSC-SE")
                .name("BSc in Software Engineering")
                .isActive(false)
                .build();

        when(degreeProgrammeService.toggleStatus(id)).thenReturn(response);

        mockMvc.perform(patch("/api/admin/programmes/" + id + "/toggle-status")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.isActive").value(false));
    }
}
