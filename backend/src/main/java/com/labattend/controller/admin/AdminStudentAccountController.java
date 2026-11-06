package com.labattend.controller.admin;

import com.labattend.dto.request.StudentBulkAccountRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.StudentResponse;
import com.labattend.service.StudentAccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/students")
@PreAuthorize("hasRole('ADMIN')")
public class AdminStudentAccountController {

    private final StudentAccountService studentAccountService;

    public AdminStudentAccountController(StudentAccountService studentAccountService) {
        this.studentAccountService = studentAccountService;
    }

    /**
     * Create a portal account for an existing student record.
     */
    @PostMapping("/{id}/account")
    public ResponseEntity<ApiResponse<StudentResponse>> createStudentAccount(@PathVariable UUID id) {
        StudentResponse response = studentAccountService.createAccount(id);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Student account created and activation link emailed", response));
    }

    /**
     * Send or resend one-time activation link to the student's university email.
     */
    @PostMapping("/{id}/account/send-activation")
    public ResponseEntity<ApiResponse<StudentResponse>> sendActivationLink(@PathVariable UUID id) {
        StudentResponse response = studentAccountService.sendActivationLink(id);
        return ResponseEntity.ok(ApiResponse.success("Activation link has been sent to the student's email", response));
    }

    /**
     * Deactivate or reactivate student portal account.
     */
    @PatchMapping("/{id}/account/toggle-status")
    public ResponseEntity<ApiResponse<StudentResponse>> toggleAccountStatus(@PathVariable UUID id) {
        StudentResponse response = studentAccountService.toggleAccountStatus(id);
        String msg = Boolean.TRUE.equals(response.getIsAccountActive())
                ? "Student account activated successfully"
                : "Student account deactivated successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    /**
     * Reset student access (invalidates tokens, resets password, triggers new activation email).
     */
    @PostMapping("/{id}/account/reset-access")
    public ResponseEntity<ApiResponse<StudentResponse>> resetStudentAccess(@PathVariable UUID id) {
        StudentResponse response = studentAccountService.resetAccess(id);
        return ResponseEntity.ok(ApiResponse.success("Student access reset. A new activation email has been dispatched.", response));
    }

    /**
     * Bulk create accounts for a batch, lab group, or list of student IDs.
     */
    @PostMapping("/accounts/bulk-create")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkCreateAccounts(
            @Valid @RequestBody StudentBulkAccountRequest request
    ) {
        Map<String, Object> result = studentAccountService.bulkCreateAccounts(
                request.getBatchId(),
                request.getLabGroupId(),
                request.getStudentIds()
        );
        return ResponseEntity.ok(ApiResponse.success("Bulk student account creation completed", result));
    }
}

