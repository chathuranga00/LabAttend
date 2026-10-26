package com.labattend.controller.lecturer;

import com.labattend.dto.report.ReportData;
import com.labattend.dto.report.ReportExportFormat;
import com.labattend.dto.report.ReportType;
import com.labattend.dto.response.ApiResponse;
import com.labattend.security.CustomUserDetails;
import com.labattend.service.report.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@RestController
@RequestMapping("/api/lecturer/reports")
@PreAuthorize("hasRole('LECTURER')")
public class LecturerReportController {

    private final ReportService reportService;

    public LecturerReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/{type}/preview")
    public ResponseEntity<ApiResponse<ReportData>> getPreviewByPath(
            @PathVariable ReportType type,
            @RequestParam(required = false) UUID sessionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate sessionDate,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) Double threshold,
            @RequestParam(required = false) UUID hallId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        ReportData reportData = generateReportData(
                type, sessionId, sessionDate, studentId, moduleId, batchId, programmeId, semester, threshold, hallId, startDate, endDate, userDetails.getId(), false
        );
        return ResponseEntity.ok(ApiResponse.success(reportData));
    }

    @GetMapping("/preview")
    public ResponseEntity<ApiResponse<ReportData>> getPreview(
            @RequestParam ReportType type,
            @RequestParam(required = false) UUID sessionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate sessionDate,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) Double threshold,
            @RequestParam(required = false) UUID hallId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return getPreviewByPath(type, sessionId, sessionDate, studentId, moduleId, batchId, programmeId, semester, threshold, hallId, startDate, endDate, userDetails);
    }

    @GetMapping("/{type}/export")
    public ResponseEntity<StreamingResponseBody> exportByPath(
            @PathVariable ReportType type,
            @RequestParam(defaultValue = "PDF") ReportExportFormat format,
            @RequestParam(required = false) UUID sessionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate sessionDate,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) Double threshold,
            @RequestParam(required = false) UUID hallId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        ReportData reportData = generateReportData(
                type, sessionId, sessionDate, studentId, moduleId, batchId, programmeId, semester, threshold, hallId, startDate, endDate, userDetails.getId(), false
        );

        byte[] reportBytes = reportService.exportReport(reportData, format);
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String extension = getExtension(format);
        String filename = String.format("labattend-lecturer-%s-%s.%s", type.name().toLowerCase(), timestamp, extension);
        MediaType mediaType = getMediaType(format);

        StreamingResponseBody stream = outputStream -> {
            outputStream.write(reportBytes);
            outputStream.flush();
        };

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
                .contentType(mediaType)
                .contentLength(reportBytes.length)
                .body(stream);
    }

    @GetMapping("/export")
    public ResponseEntity<StreamingResponseBody> export(
            @RequestParam ReportType type,
            @RequestParam(defaultValue = "PDF") ReportExportFormat format,
            @RequestParam(required = false) UUID sessionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate sessionDate,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) Double threshold,
            @RequestParam(required = false) UUID hallId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return exportByPath(type, format, sessionId, sessionDate, studentId, moduleId, batchId, programmeId, semester, threshold, hallId, startDate, endDate, userDetails);
    }

    private ReportData generateReportData(
            ReportType type,
            UUID sessionId,
            LocalDate sessionDate,
            UUID studentId,
            UUID moduleId,
            UUID batchId,
            UUID programmeId,
            String semester,
            Double threshold,
            UUID hallId,
            LocalDate startDate,
            LocalDate endDate,
            UUID requestingUserId,
            boolean isAdmin
    ) {
        return switch (type) {
            case SESSION -> reportService.generateSessionReport(sessionId, requestingUserId, isAdmin);
            case DAILY -> reportService.generateDailyReport(sessionDate, requestingUserId, isAdmin);
            case STUDENT_HISTORY -> reportService.generateStudentHistoryReport(studentId, moduleId, startDate, endDate, requestingUserId, isAdmin);
            case MODULE -> reportService.generateModuleReport(moduleId, batchId, startDate, endDate, requestingUserId, isAdmin);
            case BATCH -> reportService.generateBatchReport(batchId, moduleId, startDate, endDate, requestingUserId, isAdmin);
            case SEMESTER -> reportService.generateSemesterReport(semester, programmeId, batchId, moduleId, startDate, endDate, requestingUserId, isAdmin);
            case LOW_ATTENDANCE -> reportService.generateLowAttendanceReport(threshold, programmeId, moduleId, batchId, startDate, endDate, requestingUserId, isAdmin);
            case HALL -> reportService.generateHallReport(hallId, startDate, endDate, requestingUserId, isAdmin);
        };
    }

    private String getExtension(ReportExportFormat format) {
        return switch (format) {
            case CSV -> "csv";
            case EXCEL -> "xlsx";
            case PDF -> "pdf";
        };
    }

    private MediaType getMediaType(ReportExportFormat format) {
        return switch (format) {
            case CSV -> MediaType.parseMediaType("text/csv; charset=UTF-8");
            case EXCEL -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            case PDF -> MediaType.APPLICATION_PDF;
        };
    }
}
