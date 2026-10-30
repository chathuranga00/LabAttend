package com.labattend.controller.admin;

import com.labattend.dto.request.AttendanceCorrectionRequest;
import com.labattend.dto.request.LabSessionUpdateRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.AttendanceRecordResponse;
import com.labattend.dto.response.LabSessionResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.dto.response.SessionSummaryResponse;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.security.CustomUserDetails;
import com.labattend.service.AttendanceService;
import com.labattend.service.LabSessionService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/sessions")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSessionController {

    private final LabSessionService labSessionService;
    private final AttendanceService attendanceService;

    public AdminSessionController(LabSessionService labSessionService, AttendanceService attendanceService) {
        this.labSessionService = labSessionService;
        this.attendanceService = attendanceService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LabSessionResponse>>> getAllSessions(
            @RequestParam(required = false) UUID lecturerId,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) UUID hallId,
            @RequestParam(required = false) SessionStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "sessionDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        PageResponse<LabSessionResponse> result = labSessionService.getAllSessionsForAdmin(
                lecturerId, moduleId, batchId, labGroupId, hallId, status, startDate, endDate, search, page, size, sortBy, sortDir
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LabSessionResponse>> getSessionById(@PathVariable UUID id) {
        LabSessionResponse result = labSessionService.getSessionByIdForAdmin(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LabSessionResponse>> updateSession(
            @PathVariable UUID id,
            @Valid @RequestBody LabSessionUpdateRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        LabSessionResponse result = labSessionService.updateSessionForAdmin(userDetails.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Laboratory session updated successfully", result));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        labSessionService.deleteSessionForAdmin(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Laboratory session deleted successfully", null));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<ApiResponse<SessionSummaryResponse>> getSessionSummary(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        SessionSummaryResponse result = labSessionService.getSessionSummary(userDetails.getId(), id, true);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/{id}/attendance/{recordId}/correct")
    public ResponseEntity<ApiResponse<AttendanceRecordResponse>> correctAttendance(
            @PathVariable UUID id,
            @PathVariable UUID recordId,
            @Valid @RequestBody AttendanceCorrectionRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        AttendanceRecordResponse result = attendanceService.correctAttendanceRecord(
                userDetails.getId(), id, recordId, request, true
        );
        return ResponseEntity.ok(ApiResponse.success("Attendance record corrected successfully by administrator", result));
    }
}
