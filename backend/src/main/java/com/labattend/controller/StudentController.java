package com.labattend.controller;

import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.student.*;
import com.labattend.security.CustomUserDetails;
import com.labattend.service.StudentPortalService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasRole('STUDENT')")
public class StudentController {

    private final StudentPortalService studentPortalService;

    public StudentController(StudentPortalService studentPortalService) {
        this.studentPortalService = studentPortalService;
    }

    @GetMapping("/ping")
    public ResponseEntity<ApiResponse<String>> pingStudent() {
        return ResponseEntity.ok(ApiResponse.success("Student authorized endpoint accessed successfully", "PONG_STUDENT"));
    }

    /**
     * GET /api/student/me
     * Returns personal student profile derived solely from the authenticated JWT token.
     * No student ID parameter is accepted.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> getProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        StudentProfileResponse profile = studentPortalService.getProfile(userDetails);
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", profile));
    }

    /**
     * GET /api/student/attendance/summary
     * Returns overall eligible finalized sessions, attended, missed, percentage, cross-group visits, and belowThreshold.
     */
    @GetMapping("/attendance/summary")
    public ResponseEntity<ApiResponse<StudentSummaryResponse>> getAttendanceSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        StudentSummaryResponse summary = studentPortalService.getAttendanceSummary(userDetails);
        return ResponseEntity.ok(ApiResponse.success("Attendance summary retrieved successfully", summary));
    }

    /**
     * GET /api/student/attendance/modules
     * Returns per-module attendance breakdown for all modules with eligible sessions.
     */
    @GetMapping("/attendance/modules")
    public ResponseEntity<ApiResponse<List<StudentModuleAttendanceResponse>>> getModuleAttendance(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<StudentModuleAttendanceResponse> modules = studentPortalService.getModuleAttendance(userDetails);
        return ResponseEntity.ok(ApiResponse.success("Module attendance retrieved successfully", modules));
    }

    /**
     * GET /api/student/attendance/history
     * Returns paginated session history with optional filters (module, date range, status).
     * Excludes forbidden fields: correction reasons, lecturer notes, recorded-by user, audit data, QR token.
     */
    @GetMapping("/attendance/history")
    public ResponseEntity<ApiResponse<Page<StudentAttendanceHistoryItemResponse>>> getAttendanceHistory(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(100, size));
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Page<StudentAttendanceHistoryItemResponse> history = studentPortalService.getAttendanceHistory(
                userDetails, moduleId, startDate, endDate, status, pageable);

        return ResponseEntity.ok(ApiResponse.success("Attendance history retrieved successfully", history));
    }

    /**
     * POST /api/student/change-password
     * Requires current password and enforces password policy.
     */
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody StudentPasswordChangeRequest request
    ) {
        studentPortalService.changePassword(userDetails, request);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
    }
}
