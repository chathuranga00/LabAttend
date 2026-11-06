package com.labattend.controller.admin;

import com.labattend.dto.request.ThresholdSettingRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.ThresholdSettingResponse;
import com.labattend.security.CustomUserDetails;
import com.labattend.service.SystemSettingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/settings")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSettingController {

    private final SystemSettingService systemSettingService;

    public AdminSettingController(SystemSettingService systemSettingService) {
        this.systemSettingService = systemSettingService;
    }

    @GetMapping("/low-attendance-threshold")
    public ResponseEntity<ApiResponse<ThresholdSettingResponse>> getThreshold() {
        double threshold = systemSettingService.getLowAttendanceThreshold();
        return ResponseEntity.ok(ApiResponse.success(
                "Threshold retrieved successfully",
                ThresholdSettingResponse.builder()
                        .threshold(threshold)
                        .description("Threshold percentage below which attendance is considered low or at risk")
                        .build()
        ));
    }

    @PutMapping("/low-attendance-threshold")
    public ResponseEntity<ApiResponse<ThresholdSettingResponse>> updateThreshold(
            @Valid @RequestBody ThresholdSettingRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        double updated = systemSettingService.setLowAttendanceThreshold(
                request.getThreshold(),
                userDetails != null ? userDetails.getId() : null
        );
        return ResponseEntity.ok(ApiResponse.success(
                "Threshold updated successfully",
                ThresholdSettingResponse.builder()
                        .threshold(updated)
                        .description("Threshold percentage below which attendance is considered low or at risk")
                        .build()
        ));
    }
}
