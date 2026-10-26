package com.labattend.controller.admin;

import com.labattend.dto.request.DegreeProgrammeRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.DegreeProgrammeResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.service.DegreeProgrammeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/programmes")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDegreeProgrammeController {

    private final DegreeProgrammeService degreeProgrammeService;

    public AdminDegreeProgrammeController(DegreeProgrammeService degreeProgrammeService) {
        this.degreeProgrammeService = degreeProgrammeService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<DegreeProgrammeResponse>>> getProgrammes(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "code") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        PageResponse<DegreeProgrammeResponse> result = degreeProgrammeService.getProgrammes(search, page, size, sortBy, sortDir);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DegreeProgrammeResponse>> getProgrammeById(@PathVariable UUID id) {
        DegreeProgrammeResponse result = degreeProgrammeService.getProgrammeById(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DegreeProgrammeResponse>> createProgramme(
            @Valid @RequestBody DegreeProgrammeRequest request
    ) {
        DegreeProgrammeResponse result = degreeProgrammeService.createProgramme(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Degree programme created successfully", result));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DegreeProgrammeResponse>> updateProgramme(
            @PathVariable UUID id,
            @Valid @RequestBody DegreeProgrammeRequest request
    ) {
        DegreeProgrammeResponse result = degreeProgrammeService.updateProgramme(id, request);
        return ResponseEntity.ok(ApiResponse.success("Degree programme updated successfully", result));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<DegreeProgrammeResponse>> toggleStatus(@PathVariable UUID id) {
        DegreeProgrammeResponse result = degreeProgrammeService.toggleStatus(id);
        String msg = result.getIsActive() ? "Programme activated successfully" : "Programme deactivated successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, result));
    }
}
