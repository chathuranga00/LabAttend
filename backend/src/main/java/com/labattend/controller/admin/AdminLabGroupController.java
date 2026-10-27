package com.labattend.controller.admin;

import com.labattend.dto.request.AutoSplitConfirmRequest;
import com.labattend.dto.request.AutoSplitRequest;
import com.labattend.dto.request.BulkAssignGroupRequest;
import com.labattend.dto.request.LabGroupRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.AutoSplitPreviewResponse;
import com.labattend.dto.response.LabGroupResponse;
import com.labattend.service.LabGroupService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminLabGroupController {

    private final LabGroupService labGroupService;

    public AdminLabGroupController(LabGroupService labGroupService) {
        this.labGroupService = labGroupService;
    }

    @GetMapping("/groups")
    public ResponseEntity<ApiResponse<List<LabGroupResponse>>> getAllGroups() {
        List<LabGroupResponse> groups = labGroupService.getAllGroups();
        return ResponseEntity.ok(ApiResponse.success(groups));
    }

    @GetMapping("/batches/{batchId}/groups")
    public ResponseEntity<ApiResponse<List<LabGroupResponse>>> getGroupsByBatch(@PathVariable UUID batchId) {
        List<LabGroupResponse> groups = labGroupService.getGroupsByBatch(batchId);
        return ResponseEntity.ok(ApiResponse.success(groups));
    }

    @PostMapping("/batches/{batchId}/groups")
    public ResponseEntity<ApiResponse<LabGroupResponse>> createGroup(
            @PathVariable UUID batchId,
            @Valid @RequestBody LabGroupRequest request
    ) {
        LabGroupResponse created = labGroupService.createGroup(batchId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Lab group created successfully", created));
    }

    @GetMapping("/groups/{id}")
    public ResponseEntity<ApiResponse<LabGroupResponse>> getGroupById(@PathVariable UUID id) {
        LabGroupResponse group = labGroupService.getGroupById(id);
        return ResponseEntity.ok(ApiResponse.success(group));
    }

    @PutMapping("/groups/{id}")
    public ResponseEntity<ApiResponse<LabGroupResponse>> updateGroup(
            @PathVariable UUID id,
            @Valid @RequestBody LabGroupRequest request
    ) {
        LabGroupResponse updated = labGroupService.updateGroup(id, request);
        return ResponseEntity.ok(ApiResponse.success("Lab group updated successfully", updated));
    }

    @PatchMapping("/groups/{id}/toggle-status")
    public ResponseEntity<ApiResponse<LabGroupResponse>> toggleGroupStatus(@PathVariable UUID id) {
        LabGroupResponse toggled = labGroupService.toggleGroupStatus(id);
        String msg = Boolean.TRUE.equals(toggled.getIsActive()) ? "Lab group activated" : "Lab group deactivated";
        return ResponseEntity.ok(ApiResponse.success(msg, toggled));
    }

    @PostMapping("/batches/{batchId}/groups/bulk-assign")
    public ResponseEntity<ApiResponse<Void>> bulkAssignStudents(
            @PathVariable UUID batchId,
            @Valid @RequestBody BulkAssignGroupRequest request
    ) {
        labGroupService.bulkAssignStudentsToGroup(batchId, request);
        return ResponseEntity.ok(ApiResponse.success("Students assigned to lab group successfully", null));
    }

    @PostMapping("/batches/{batchId}/groups/auto-split-preview")
    public ResponseEntity<ApiResponse<AutoSplitPreviewResponse>> previewAutoSplit(
            @PathVariable UUID batchId,
            @Valid @RequestBody AutoSplitRequest request
    ) {
        AutoSplitPreviewResponse preview = labGroupService.previewAutoSplit(batchId, request);
        return ResponseEntity.ok(ApiResponse.success(preview));
    }

    @PostMapping("/batches/{batchId}/groups/auto-split-confirm")
    public ResponseEntity<ApiResponse<Void>> confirmAutoSplit(
            @PathVariable UUID batchId,
            @Valid @RequestBody AutoSplitConfirmRequest request
    ) {
        labGroupService.confirmAutoSplit(batchId, request);
        return ResponseEntity.ok(ApiResponse.success("Auto-split confirmed and applied successfully", null));
    }
}
