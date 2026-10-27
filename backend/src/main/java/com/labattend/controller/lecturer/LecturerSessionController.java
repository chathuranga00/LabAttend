package com.labattend.controller.lecturer;

import com.labattend.dto.request.AttendanceScanRequest;
import com.labattend.dto.request.LabSessionCancelRequest;
import com.labattend.dto.request.LabSessionCreateRequest;
import com.labattend.dto.request.ManualAttendanceRequest;
import com.labattend.dto.response.*;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.security.CustomUserDetails;
import com.labattend.service.AttendanceService;
import com.labattend.service.LabSessionService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lecturer/sessions")
@PreAuthorize("hasRole('LECTURER')")
public class LecturerSessionController {

    private final LabSessionService labSessionService;
    private final AttendanceService attendanceService;

    public LecturerSessionController(LabSessionService labSessionService, AttendanceService attendanceService) {
        this.labSessionService = labSessionService;
        this.attendanceService = attendanceService;
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
            @RequestParam(required = false) UUID labGroupId,
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
                userDetails.getId(), status, moduleId, batchId, labGroupId, startDate, endDate, search, page, size, sortBy, sortDir
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

    @PostMapping("/{id}/scan")
    public ResponseEntity<ApiResponse<AttendanceScanResponse>> scanQrAttendance(
            @PathVariable UUID id,
            @Valid @RequestBody AttendanceScanRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        AttendanceScanResponse result = attendanceService.scanQrAttendance(userDetails.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success(result.getMessage(), result));
    }

    @PostMapping("/{id}/manual-attendance")
    public ResponseEntity<ApiResponse<AttendanceScanResponse>> recordManualAttendance(
            @PathVariable UUID id,
            @Valid @RequestBody ManualAttendanceRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        AttendanceScanResponse result = attendanceService.recordManualAttendance(userDetails.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success(result.getMessage(), result));
    }

    @GetMapping("/{id}/attendance")
    public ResponseEntity<ApiResponse<PageResponse<AttendanceRecordResponse>>> getSessionAttendance(
            @PathVariable UUID id,
            @RequestParam(required = false) com.labattend.entity.enums.AttendanceStatus status,
            @RequestParam(required = false) com.labattend.entity.enums.AttendanceMethod method,
            @RequestParam(required = false) Boolean isCorrected,
            @RequestParam(required = false) Boolean isCrossGroup,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "markedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PageResponse<AttendanceRecordResponse> result = attendanceService.searchAttendanceRecords(
                userDetails.getId(), id, null, status, method, isCorrected, isCrossGroup, search, page, size, sortBy, sortDir, false
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}/expected-students")
    public ResponseEntity<ApiResponse<List<SessionExpectedStudentResponse>>> getExpectedStudents(
            @PathVariable UUID id,
            @RequestParam(required = false) String query,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<SessionExpectedStudentResponse> result = attendanceService.getSessionExpectedStudents(
                userDetails.getId(), id, query
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/{id}/finalize")
    public ResponseEntity<ApiResponse<SessionSummaryResponse>> finalizeSession(
            @PathVariable UUID id,
            @RequestBody(required = false) com.labattend.dto.request.SessionFinalizeRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        SessionSummaryResponse result = labSessionService.finalizeSession(userDetails.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Session finalized successfully", result));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<ApiResponse<SessionSummaryResponse>> getSessionSummary(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        SessionSummaryResponse result = labSessionService.getSessionSummary(userDetails.getId(), id, false);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/{id}/attendance/{recordId}/correct")
    public ResponseEntity<ApiResponse<AttendanceRecordResponse>> correctAttendance(
            @PathVariable UUID id,
            @PathVariable UUID recordId,
            @Valid @RequestBody com.labattend.dto.request.AttendanceCorrectionRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        AttendanceRecordResponse result = attendanceService.correctAttendanceRecord(
                userDetails.getId(), id, recordId, request, false
        );
        return ResponseEntity.ok(ApiResponse.success("Attendance record corrected successfully", result));
    }
}

