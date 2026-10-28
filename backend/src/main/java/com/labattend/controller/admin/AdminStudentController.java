package com.labattend.controller.admin;

import com.labattend.dto.request.QrRegenerateRequest;
import com.labattend.dto.request.StudentRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.dto.response.StudentAttendanceHistoryResponse;
import com.labattend.dto.response.StudentCsvImportResponse;
import com.labattend.dto.response.StudentResponse;
import com.labattend.service.QrCodeService;
import com.labattend.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/students")
@PreAuthorize("hasRole('ADMIN')")
public class AdminStudentController {

    private final StudentService studentService;
    private final QrCodeService qrCodeService;

    public AdminStudentController(StudentService studentService, QrCodeService qrCodeService) {
        this.studentService = studentService;
        this.qrCodeService = qrCodeService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<StudentResponse>>> getStudents(
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID labGroupId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String offeredBy,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "studentId") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        PageResponse<StudentResponse> result = studentService.getStudents(
                programmeId, batchId, labGroupId, isActive, offeredBy, search, page, size, sortBy, sortDir
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentResponse>> getStudentById(@PathVariable UUID id) {
        StudentResponse result = studentService.getStudentById(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StudentResponse>> createStudent(
            @Valid @RequestBody StudentRequest request
    ) {
        StudentResponse result = studentService.createStudent(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Student created successfully", result));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentResponse>> updateStudent(
            @PathVariable UUID id,
            @Valid @RequestBody StudentRequest request
    ) {
        StudentResponse result = studentService.updateStudent(id, request);
        return ResponseEntity.ok(ApiResponse.success("Student updated successfully", result));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<StudentResponse>> toggleStatus(@PathVariable UUID id) {
        StudentResponse result = studentService.toggleStatus(id);
        String msg = result.getIsActive() ? "Student activated successfully" : "Student deactivated successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, result));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStudent(@PathVariable UUID id) {
        studentService.deleteStudent(id);
        return ResponseEntity.ok(ApiResponse.message("Student deleted successfully"));
    }

    @DeleteMapping("/bulk")
    public ResponseEntity<ApiResponse<Void>> deleteStudentsBulk(@RequestBody List<UUID> studentIds) {
        studentService.deleteStudentsBulk(studentIds);
        return ResponseEntity.ok(ApiResponse.message(studentIds.size() + " student records deleted successfully"));
    }

    @GetMapping("/{id}/attendance")
    public ResponseEntity<ApiResponse<StudentAttendanceHistoryResponse>> getAttendanceHistory(@PathVariable UUID id) {
        StudentAttendanceHistoryResponse result = studentService.getAttendanceHistory(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping(value = "/import-csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<StudentCsvImportResponse>> importStudentsFromCsv(
            @RequestParam("file") MultipartFile file
    ) {
        StudentCsvImportResponse result = studentService.importStudentsFromCsv(file);
        String msg = String.format("CSV processed: %d imported successfully, %d failed", result.getSuccessCount(), result.getFailureCount());
        return ResponseEntity.ok(ApiResponse.success(msg, result));
    }

    @GetMapping("/{id}/qr")
    public ResponseEntity<byte[]> getStudentQrImage(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean sticker,
            @RequestParam(required = false) String layout
    ) {
        boolean isSticker = sticker || "sticker".equalsIgnoreCase(layout);
        byte[] imageBytes = qrCodeService.getStudentQrImage(id, isSticker);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        headers.setContentDisposition(ContentDisposition.inline()
                .filename("student_qr_" + (isSticker ? "sticker_" : "") + id + ".png")
                .build());

        return new ResponseEntity<>(imageBytes, headers, HttpStatus.OK);
    }

    @PostMapping("/{id}/qr/regenerate")
    public ResponseEntity<ApiResponse<StudentResponse>> regenerateQrCode(
            @PathVariable UUID id,
            @Valid @RequestBody QrRegenerateRequest request
    ) {
        StudentResponse result = qrCodeService.regenerateQrCode(id, request.getReason());
        return ResponseEntity.ok(ApiResponse.success("Student QR code regenerated successfully", result));
    }

    @GetMapping("/qr/bulk")
    public ResponseEntity<byte[]> getBulkQrCodes(
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) UUID groupId,
            @RequestParam(required = false) List<UUID> studentIds,
            @RequestParam(defaultValue = "zip") String format,
            @RequestParam(defaultValue = "false") boolean sticker,
            @RequestParam(required = false) String layout
    ) {
        boolean isSticker = sticker || "sticker".equalsIgnoreCase(layout);
        HttpHeaders headers = new HttpHeaders();

        if ("pdf".equalsIgnoreCase(format)) {
            byte[] pdfBytes = qrCodeService.generateStickerSheetPdf(batchId, groupId, studentIds);
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDisposition(ContentDisposition.attachment()
                    .filename("LabAttend_QR_Stickers.pdf")
                    .build());
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } else {
            byte[] zipBytes = qrCodeService.generateBulkZip(batchId, groupId, studentIds, isSticker);
            headers.setContentType(MediaType.parseMediaType("application/zip"));
            headers.setContentDisposition(ContentDisposition.attachment()
                    .filename("LabAttend_QR_Codes.zip")
                    .build());
            return new ResponseEntity<>(zipBytes, headers, HttpStatus.OK);
        }
    }
}
