package com.labattend.service;

import com.labattend.dto.request.LecturerAssignmentRequest;
import com.labattend.dto.response.LecturerAssignmentResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.entity.Batch;
import com.labattend.entity.Lecturer;
import com.labattend.entity.LecturerModuleAssignment;
import com.labattend.entity.Module;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.BatchRepository;
import com.labattend.repository.LecturerModuleAssignmentRepository;
import com.labattend.repository.LecturerRepository;
import com.labattend.repository.ModuleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.labattend.dto.response.UserSummaryDto;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class LecturerAssignmentService {

    private final LecturerModuleAssignmentRepository assignmentRepository;
    private final LecturerRepository lecturerRepository;
    private final ModuleRepository moduleRepository;
    private final BatchRepository batchRepository;
    private final AuditLogService auditLogService;

    public LecturerAssignmentService(LecturerModuleAssignmentRepository assignmentRepository,
                                     LecturerRepository lecturerRepository,
                                     ModuleRepository moduleRepository,
                                     BatchRepository batchRepository,
                                     AuditLogService auditLogService) {
        this.assignmentRepository = assignmentRepository;
        this.lecturerRepository = lecturerRepository;
        this.moduleRepository = moduleRepository;
        this.batchRepository = batchRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<UserSummaryDto> getAvailableLecturers() {
        return lecturerRepository.findAll().stream()
                .map(l -> UserSummaryDto.builder()
                        .id(l.getId())
                        .email(l.getUser() != null ? l.getUser().getEmail() : null)
                        .fullName(l.getFullName())
                        .staffId(l.getStaffId())
                        .department(l.getDepartment())
                        .isActive(l.getIsActive())
                        .role(com.labattend.entity.enums.Role.LECTURER)
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<LecturerAssignmentResponse> getAssignments(UUID lecturerId, UUID moduleId, UUID batchId,
                                                                  String academicYear, String semester,
                                                                  int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<LecturerModuleAssignment> assignmentPage = assignmentRepository.searchAssignments(
                lecturerId,
                moduleId,
                batchId,
                academicYear != null && !academicYear.isBlank() ? academicYear.trim() : null,
                semester != null && !semester.isBlank() ? semester.trim() : null,
                pageable
        );

        return PageResponse.of(assignmentPage.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public LecturerAssignmentResponse getAssignmentById(UUID id) {
        LecturerModuleAssignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LecturerModuleAssignment", "id", id));
        return mapToResponse(assignment);
    }

    public LecturerAssignmentResponse createAssignment(LecturerAssignmentRequest request) {
        Lecturer lecturer = lecturerRepository.findById(request.getLecturerId())
                .orElseThrow(() -> new ResourceNotFoundException("Lecturer", "id", request.getLecturerId()));

        Module module = moduleRepository.findById(request.getModuleId())
                .orElseThrow(() -> new ResourceNotFoundException("Module", "id", request.getModuleId()));

        Batch batch = null;
        if (request.getBatchId() != null) {
            batch = batchRepository.findById(request.getBatchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch", "id", request.getBatchId()));
        }

        String academicYear = request.getAcademicYear().trim();
        String semester = request.getSemester().trim();

        Optional<LecturerModuleAssignment> existing = assignmentRepository.findExistingAssignment(
                lecturer.getId(), module.getId(), batch != null ? batch.getId() : null, academicYear, semester
        );
        if (existing.isPresent()) {
            throw new BadRequestException("Assignment already exists for lecturer, module, batch, academic year, and semester");
        }

        LecturerModuleAssignment assignment = LecturerModuleAssignment.builder()
                .lecturer(lecturer)
                .module(module)
                .batch(batch)
                .academicYear(academicYear)
                .semester(semester)
                .isActive(true)
                .build();

        LecturerModuleAssignment saved = assignmentRepository.save(assignment);
        LecturerAssignmentResponse response = mapToResponse(saved);

        auditLogService.logAction("LecturerModuleAssignment", saved.getId(), "CREATE", null, response);

        return response;
    }

    public LecturerAssignmentResponse toggleStatus(UUID id) {
        LecturerModuleAssignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LecturerModuleAssignment", "id", id));

        LecturerAssignmentResponse previousState = mapToResponse(assignment);

        assignment.setIsActive(!assignment.getIsActive());
        LecturerModuleAssignment updated = assignmentRepository.save(assignment);
        LecturerAssignmentResponse newState = mapToResponse(updated);

        String action = updated.getIsActive() ? "ACTIVATE" : "DEACTIVATE";
        auditLogService.logAction("LecturerModuleAssignment", updated.getId(), action, previousState, newState);

        return newState;
    }

    public void deleteAssignment(UUID id) {
        LecturerModuleAssignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LecturerModuleAssignment", "id", id));

        LecturerAssignmentResponse previousState = mapToResponse(assignment);

        assignmentRepository.delete(assignment);
        auditLogService.logAction("LecturerModuleAssignment", id, "DELETE", previousState, null);
    }

    private LecturerAssignmentResponse mapToResponse(LecturerModuleAssignment a) {
        return LecturerAssignmentResponse.builder()
                .id(a.getId())
                .lecturerId(a.getLecturer() != null ? a.getLecturer().getId() : null)
                .lecturerName(a.getLecturer() != null ? a.getLecturer().getFullName() : null)
                .lecturerStaffId(a.getLecturer() != null ? a.getLecturer().getStaffId() : null)
                .moduleId(a.getModule() != null ? a.getModule().getId() : null)
                .moduleCode(a.getModule() != null ? a.getModule().getModuleCode() : null)
                .moduleName(a.getModule() != null ? a.getModule().getName() : null)
                .batchId(a.getBatch() != null ? a.getBatch().getId() : null)
                .batchName(a.getBatch() != null ? a.getBatch().getBatchCode() : null)
                .batchCode(a.getBatch() != null ? a.getBatch().getBatchCode() : null)
                .academicYear(a.getAcademicYear())
                .semester(a.getSemester())
                .isActive(a.getIsActive())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}
