package com.labattend.controller.admin;

import com.labattend.dto.request.LaboratoryHallRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.LaboratoryHallResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.service.LaboratoryHallService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/halls")
@PreAuthorize("hasRole('ADMIN')")
public class AdminLaboratoryHallController {

    private final LaboratoryHallService laboratoryHallService;

    public AdminLaboratoryHallController(LaboratoryHallService laboratoryHallService) {
        this.laboratoryHallService = laboratoryHallService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LaboratoryHallResponse>>> getHalls(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "hallCode") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        PageResponse<LaboratoryHallResponse> result = laboratoryHallService.getHalls(search, page, size, sortBy, sortDir);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LaboratoryHallResponse>> getHallById(@PathVariable UUID id) {
        LaboratoryHallResponse result = laboratoryHallService.getHallById(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LaboratoryHallResponse>> createHall(
            @Valid @RequestBody LaboratoryHallRequest request
    ) {
        LaboratoryHallResponse result = laboratoryHallService.createHall(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Laboratory hall created successfully", result));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LaboratoryHallResponse>> updateHall(
            @PathVariable UUID id,
            @Valid @RequestBody LaboratoryHallRequest request
    ) {
        LaboratoryHallResponse result = laboratoryHallService.updateHall(id, request);
        return ResponseEntity.ok(ApiResponse.success("Laboratory hall updated successfully", result));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<LaboratoryHallResponse>> toggleStatus(@PathVariable UUID id) {
        LaboratoryHallResponse result = laboratoryHallService.toggleStatus(id);
        String msg = result.getIsActive() ? "Hall activated successfully" : "Hall deactivated successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, result));
    }
}
