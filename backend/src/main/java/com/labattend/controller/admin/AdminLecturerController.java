package com.labattend.controller.admin;

import com.labattend.dto.request.LecturerCreateRequest;
import com.labattend.dto.request.LecturerUpdateRequest;
import com.labattend.dto.response.AccessResetResponse;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.LecturerResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.service.LecturerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/lecturers")
@PreAuthorize("hasRole('ADMIN')")
public class AdminLecturerController {

    private final LecturerService lecturerService;

    public AdminLecturerController(LecturerService lecturerService) {
        this.lecturerService = lecturerService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LecturerResponse>>> getLecturers(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "staffId") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        PageResponse<LecturerResponse> result = lecturerService.getLecturers(
                department, isActive, search, page, size, sortBy, sortDir
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LecturerResponse>> getLecturerById(@PathVariable UUID id) {
        LecturerResponse result = lecturerService.getLecturerById(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LecturerResponse>> createLecturer(
            @Valid @RequestBody LecturerCreateRequest request
    ) {
        LecturerResponse result = lecturerService.createLecturer(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Lecturer created successfully with temporary access credentials", result));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LecturerResponse>> updateLecturer(
            @PathVariable UUID id,
            @Valid @RequestBody LecturerUpdateRequest request
    ) {
        LecturerResponse result = lecturerService.updateLecturer(id, request);
        return ResponseEntity.ok(ApiResponse.success("Lecturer updated successfully", result));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<LecturerResponse>> toggleStatus(@PathVariable UUID id) {
        LecturerResponse result = lecturerService.toggleStatus(id);
        String msg = result.getIsActive() ? "Lecturer activated successfully" : "Lecturer deactivated successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, result));
    }

    @PostMapping("/{id}/reset-access")
    public ResponseEntity<ApiResponse<AccessResetResponse>> resetAccess(@PathVariable UUID id) {
        AccessResetResponse result = lecturerService.resetAccess(id);
        return ResponseEntity.ok(ApiResponse.success(result.getMessage(), result));
    }
}
