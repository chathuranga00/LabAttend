package com.labattend.controller.admin;

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
@RequestMapping("/api/admin/analytics")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAnalyticsController {

    private final AnalyticsService analyticsService;

    public AdminAnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AnalyticsOverviewResponse>> getOverview(
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) String groupName,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID lecturerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester
    ) {
        UUID effectiveGroupId = analyticsService.resolveLabGroupId(labGroupId, groupName, batchId);
        AnalyticsOverviewResponse result = analyticsService.getAdminOverview(
                programmeId, batchId, effectiveGroupId, moduleId, lecturerId, startDate, endDate, semester
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/attendance-trends")
    public ResponseEntity<ApiResponse<List<AttendanceTrendPoint>>> getAttendanceTrends(
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) String groupName,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID lecturerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester
    ) {
        UUID effectiveGroupId = analyticsService.resolveLabGroupId(labGroupId, groupName, batchId);
        List<AttendanceTrendPoint> result = analyticsService.getAttendanceTrends(
                lecturerId, programmeId, moduleId, batchId, effectiveGroupId, startDate, endDate, semester
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<SessionAnalyticsResponse>>> getSessions(
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) String groupName,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID lecturerId,
            @RequestParam(required = false) SessionStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester
    ) {
        UUID effectiveGroupId = analyticsService.resolveLabGroupId(labGroupId, groupName, batchId);
        List<SessionAnalyticsResponse> result = analyticsService.getSessionAnalytics(
                lecturerId, programmeId, moduleId, batchId, effectiveGroupId, status, startDate, endDate, semester
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/students")
    public ResponseEntity<ApiResponse<List<StudentAttendanceSummaryResponse>>> getStudents(
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) String groupName,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID lecturerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) Double threshold,
            @RequestParam(required = false) String search
    ) {
        UUID effectiveGroupId = analyticsService.resolveLabGroupId(labGroupId, groupName, batchId);
        List<StudentAttendanceSummaryResponse> result = analyticsService.getStudentAttendanceSummaries(
                lecturerId, programmeId, moduleId, batchId, effectiveGroupId, startDate, endDate, semester, threshold, search
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
                userDetails.getId(), true, studentId, moduleId, startDate, endDate
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/modules")
    public ResponseEntity<ApiResponse<List<ModuleAnalyticsResponse>>> getModules(
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) String groupName,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester
    ) {
        UUID effectiveGroupId = analyticsService.resolveLabGroupId(labGroupId, groupName, batchId);
        List<ModuleAnalyticsResponse> result = analyticsService.getModuleAnalytics(
                null, programmeId, batchId, effectiveGroupId, startDate, endDate, semester
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/batches")
    public ResponseEntity<ApiResponse<List<BatchAnalyticsResponse>>> getBatches(
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) String groupName,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester
    ) {
        UUID effectiveGroupId = analyticsService.resolveLabGroupId(labGroupId, groupName, null);
        List<BatchAnalyticsResponse> result = analyticsService.getBatchAnalytics(
                null, programmeId, moduleId, effectiveGroupId, startDate, endDate, semester
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/groups")
    public ResponseEntity<ApiResponse<List<GroupAnalyticsResponse>>> getGroups(
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) String groupName,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID lecturerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String semester
    ) {
        UUID effectiveGroupId = analyticsService.resolveLabGroupId(labGroupId, groupName, batchId);
        List<GroupAnalyticsResponse> result = analyticsService.getGroupAttendanceAnalytics(
                lecturerId, programmeId, batchId, effectiveGroupId, moduleId, startDate, endDate, semester
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/at-risk")
    public ResponseEntity<ApiResponse<List<AtRiskStudentResponse>>> getAtRiskStudents(
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false, defaultValue = "4") Integer minConsecutiveAbsences,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<AtRiskStudentResponse> result = analyticsService.getAtRiskStudents(
                userDetails.getId(), true, moduleId, batchId, minConsecutiveAbsences
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

}
