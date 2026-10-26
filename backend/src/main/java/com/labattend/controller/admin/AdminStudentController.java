package com.labattend.controller.admin;

import com.labattend.dto.request.StudentRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.dto.response.StudentAttendanceHistoryResponse;
import com.labattend.dto.response.StudentCsvImportResponse;
import com.labattend.dto.response.StudentResponse;
import com.labattend.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/students")
@PreAuthorize("hasRole('ADMIN')")
public class AdminStudentController {

    private final StudentService studentService;

    public AdminStudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<StudentResponse>>> getStudents(
            @RequestParam(required = false) UUID programmeId,
            @RequestParam(required = false) UUID batchId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "studentId") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        PageResponse<StudentResponse> result = studentService.getStudents(
                programmeId, batchId, isActive, search, page, size, sortBy, sortDir
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
}
