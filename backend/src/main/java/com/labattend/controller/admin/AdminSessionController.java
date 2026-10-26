package com.labattend.controller.admin;

import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.LabSessionResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.service.LabSessionService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/sessions")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSessionController {

    private final LabSessionService labSessionService;

    public AdminSessionController(LabSessionService labSessionService) {
        this.labSessionService = labSessionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LabSessionResponse>>> getAllSessions(
            @RequestParam(required = false) UUID lecturerId,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID batchId,
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
                lecturerId, moduleId, batchId, hallId, status, startDate, endDate, search, page, size, sortBy, sortDir
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LabSessionResponse>> getSessionById(@PathVariable UUID id) {
        LabSessionResponse result = labSessionService.getSessionByIdForAdmin(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
