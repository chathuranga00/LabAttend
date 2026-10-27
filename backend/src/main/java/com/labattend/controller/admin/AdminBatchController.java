package com.labattend.controller.admin;

import com.labattend.dto.request.BatchRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.BatchResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.service.BatchService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/batches")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBatchController {

    private final BatchService batchService;

    public AdminBatchController(BatchService batchService) {
        this.batchService = batchService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<BatchResponse>>> getBatches(
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "batchCode") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        PageResponse<BatchResponse> result = batchService.getBatches(programmeId, search, page, size, sortBy, sortDir);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BatchResponse>> getBatchById(@PathVariable UUID id) {
        BatchResponse result = batchService.getBatchById(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BatchResponse>> createBatch(
            @Valid @RequestBody BatchRequest request
    ) {
        BatchResponse result = batchService.createBatch(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Batch created successfully", result));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BatchResponse>> updateBatch(
            @PathVariable UUID id,
            @Valid @RequestBody BatchRequest request
    ) {
        BatchResponse result = batchService.updateBatch(id, request);
        return ResponseEntity.ok(ApiResponse.success("Batch updated successfully", result));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<BatchResponse>> toggleStatus(@PathVariable UUID id) {
        BatchResponse result = batchService.toggleStatus(id);
        String msg = result.getIsActive() ? "Batch activated successfully" : "Batch deactivated successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, result));
    }
}
