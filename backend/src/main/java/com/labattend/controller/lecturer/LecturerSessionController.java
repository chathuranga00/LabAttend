package com.labattend.controller.lecturer;

import com.labattend.dto.request.LabSessionCancelRequest;
import com.labattend.dto.request.LabSessionCreateRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.LabSessionResponse;
import com.labattend.dto.response.LecturerDashboardResponse;
import com.labattend.dto.response.LecturerSessionOptionsResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.security.CustomUserDetails;
import com.labattend.service.LabSessionService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/lecturer/sessions")
@PreAuthorize("hasRole('LECTURER')")
public class LecturerSessionController {

    private final LabSessionService labSessionService;

    public LecturerSessionController(LabSessionService labSessionService) {
        this.labSessionService = labSessionService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LabSessionResponse>> createSession(
            @Valid @RequestBody LabSessionCreateRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        LabSessionResponse result = labSessionService.createSession(userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Laboratory session scheduled successfully", result));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LabSessionResponse>>> getMySessions(
            @RequestParam(required = false) SessionStatus status,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "sessionDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PageResponse<LabSessionResponse> result = labSessionService.getLecturerSessions(
                userDetails.getId(), status, moduleId, batchId, startDate, endDate, search, page, size, sortBy, sortDir
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LabSessionResponse>> getSessionById(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        LabSessionResponse result = labSessionService.getLecturerSessionById(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<ApiResponse<LabSessionResponse>> startSession(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        LabSessionResponse result = labSessionService.startSession(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Lab session is now ACTIVE. Attendance scanning is open.", result));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<LabSessionResponse>> cancelSession(
            @PathVariable UUID id,
            @Valid @RequestBody LabSessionCancelRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        LabSessionResponse result = labSessionService.cancelSession(userDetails.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Lab session has been CANCELLED.", result));
    }

    @GetMapping("/form-options")
    public ResponseEntity<ApiResponse<LecturerSessionOptionsResponse>> getFormOptions(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        LecturerSessionOptionsResponse result = labSessionService.getLecturerFormOptions(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<LecturerDashboardResponse>> getDashboard(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        LecturerDashboardResponse result = labSessionService.getLecturerDashboard(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
