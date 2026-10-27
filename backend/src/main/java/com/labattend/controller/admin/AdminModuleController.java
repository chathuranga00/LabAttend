package com.labattend.controller.admin;

import com.labattend.dto.request.ModuleRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.ModuleResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.service.ModuleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/modules")
@PreAuthorize("hasRole('ADMIN')")
public class AdminModuleController {

    private final ModuleService moduleService;

    public AdminModuleController(ModuleService moduleService) {
        this.moduleService = moduleService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ModuleResponse>>> getModules(
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "moduleCode") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        PageResponse<ModuleResponse> result = moduleService.getModules(programmeId, search, page, size, sortBy, sortDir);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ModuleResponse>> getModuleById(@PathVariable UUID id) {
        ModuleResponse result = moduleService.getModuleById(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ModuleResponse>> createModule(
            @Valid @RequestBody ModuleRequest request
    ) {
        ModuleResponse result = moduleService.createModule(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Module created successfully", result));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ModuleResponse>> updateModule(
            @PathVariable UUID id,
            @Valid @RequestBody ModuleRequest request
    ) {
        ModuleResponse result = moduleService.updateModule(id, request);
        return ResponseEntity.ok(ApiResponse.success("Module updated successfully", result));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<ModuleResponse>> toggleStatus(@PathVariable UUID id) {
        ModuleResponse result = moduleService.toggleStatus(id);
        String msg = result.getIsActive() ? "Module activated successfully" : "Module deactivated successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, result));
    }
}
