package com.labattend.controller.lecturer;

import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.analytics.*;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.security.CustomUserDetails;
import com.labattend.service.AnalyticsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lecturer/analytics")
@PreAuthorize("hasRole('LECTURER')")
public class LecturerAnalyticsController {

    private final AnalyticsService analyticsService;

    public LecturerAnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AnalyticsOverviewResponse>> getOverview(
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        AnalyticsOverviewResponse result = analyticsService.getLecturerOverview(
                userDetails.getId(), moduleId, batchId, labGroupId, startDate, endDate, semester
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/attendance-trends")
    public ResponseEntity<ApiResponse<List<AttendanceTrendPoint>>> getAttendanceTrends(
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        UUID lecturerId = analyticsService.getLecturerByUserId(userDetails.getId()).getId();
        List<AttendanceTrendPoint> result = analyticsService.getAttendanceTrends(
                lecturerId, null, moduleId, batchId, labGroupId, startDate, endDate, semester
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<SessionAnalyticsResponse>>> getSessions(
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) SessionStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        UUID lecturerId = analyticsService.getLecturerByUserId(userDetails.getId()).getId();
        List<SessionAnalyticsResponse> result = analyticsService.getSessionAnalytics(
                lecturerId, null, moduleId, batchId, labGroupId, status, startDate, endDate, semester
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/students")
    public ResponseEntity<ApiResponse<List<StudentAttendanceSummaryResponse>>> getStudents(
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) Double threshold,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        UUID lecturerId = analyticsService.getLecturerByUserId(userDetails.getId()).getId();
        List<StudentAttendanceSummaryResponse> result = analyticsService.getStudentAttendanceSummaries(
                lecturerId, null, moduleId, batchId, labGroupId, startDate, endDate, semester, threshold, search
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/students/{studentId}")
    public ResponseEntity<ApiResponse<StudentDetailedAttendanceResponse>> getStudentDetails(
            @PathVariable UUID studentId,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        StudentDetailedAttendanceResponse result = analyticsService.getStudentDetailedAttendance(
                userDetails.getId(), false, studentId, moduleId, startDate, endDate
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/modules")
    public ResponseEntity<ApiResponse<List<ModuleAnalyticsResponse>>> getModules(
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        UUID lecturerId = analyticsService.getLecturerByUserId(userDetails.getId()).getId();
        List<ModuleAnalyticsResponse> result = analyticsService.getModuleAnalytics(
                lecturerId, null, batchId, labGroupId, startDate, endDate, semester
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/batches")
    public ResponseEntity<ApiResponse<List<BatchAnalyticsResponse>>> getBatches(
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        UUID lecturerId = analyticsService.getLecturerByUserId(userDetails.getId()).getId();
        List<BatchAnalyticsResponse> result = analyticsService.getBatchAnalytics(
                lecturerId, null, moduleId, labGroupId, startDate, endDate, semester
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/groups")
    public ResponseEntity<ApiResponse<List<GroupAnalyticsResponse>>> getGroups(
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        UUID lecturerId = analyticsService.getLecturerByUserId(userDetails.getId()).getId();
        List<GroupAnalyticsResponse> result = analyticsService.getGroupAttendanceAnalytics(
                lecturerId, null, batchId, labGroupId, moduleId, startDate, endDate, semester
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
