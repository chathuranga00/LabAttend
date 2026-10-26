package com.labattend.controller.admin;

import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.AttendanceRecordResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.security.CustomUserDetails;
import com.labattend.service.AttendanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/attendance")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAttendanceController {

    private final AttendanceService attendanceService;

    public AdminAttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AttendanceRecordResponse>>> getAllAttendanceRecords(
            @RequestParam(required = false) UUID sessionId,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) AttendanceStatus status,
            @RequestParam(required = false) AttendanceMethod method,
            @RequestParam(required = false) Boolean isCorrected,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "markedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PageResponse<AttendanceRecordResponse> result = attendanceService.searchAttendanceRecords(
                userDetails.getId(), sessionId, studentId, status, method, isCorrected, search, page, size, sortBy, sortDir, true
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
