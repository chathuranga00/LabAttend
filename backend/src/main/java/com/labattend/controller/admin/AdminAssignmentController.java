package com.labattend.controller.admin;

import com.labattend.dto.request.LecturerAssignmentRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.LecturerAssignmentResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.service.LecturerAssignmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.labattend.dto.response.UserSummaryDto;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/assignments")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAssignmentController {

    private final LecturerAssignmentService assignmentService;

    public AdminAssignmentController(LecturerAssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @GetMapping("/lecturers")
    public ResponseEntity<ApiResponse<List<UserSummaryDto>>> getAvailableLecturers() {
        List<UserSummaryDto> result = assignmentService.getAvailableLecturers();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LecturerAssignmentResponse>>> getAssignments(
            @RequestParam(required = false) UUID lecturerId,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) String semester,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        PageResponse<LecturerAssignmentResponse> result = assignmentService.getAssignments(
                lecturerId, moduleId, batchId, academicYear, semester, page, size, sortBy, sortDir
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LecturerAssignmentResponse>> getAssignmentById(@PathVariable UUID id) {
        LecturerAssignmentResponse result = assignmentService.getAssignmentById(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LecturerAssignmentResponse>> createAssignment(
            @Valid @RequestBody LecturerAssignmentRequest request
    ) {
        LecturerAssignmentResponse result = assignmentService.createAssignment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Assignment created successfully", result));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<LecturerAssignmentResponse>> toggleStatus(@PathVariable UUID id) {
        LecturerAssignmentResponse result = assignmentService.toggleStatus(id);
        String msg = result.getIsActive() ? "Assignment activated successfully" : "Assignment deactivated successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, result));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAssignment(@PathVariable UUID id) {
        assignmentService.deleteAssignment(id);
        return ResponseEntity.ok(ApiResponse.message("Assignment deleted successfully"));
    }
}
