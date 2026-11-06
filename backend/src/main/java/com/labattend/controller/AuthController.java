package com.labattend.controller;

import com.labattend.dto.request.LoginRequest;
import com.labattend.dto.request.StudentActivateRequest;
import com.labattend.dto.request.StudentForgotPasswordRequest;
import com.labattend.dto.request.StudentResetPasswordRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.LoginResponse;
import com.labattend.dto.response.UserSummaryDto;
import com.labattend.security.CustomUserDetails;
import com.labattend.service.AuthService;
import com.labattend.service.StudentAccountService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final StudentAccountService studentAccountService;

    public AuthController(AuthService authService, StudentAccountService studentAccountService) {
        this.authService = authService;
        this.studentAccountService = studentAccountService;
    }

    /**
     * Dedicated Staff Login endpoint (ADMIN and LECTURER only).
     */
    @PostMapping("/staff/login")
    public ResponseEntity<ApiResponse<LoginResponse>> staffLogin(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientIp = extractClientIp(httpRequest);
        LoginResponse response = authService.staffLogin(request, clientIp);
        return ResponseEntity.ok(ApiResponse.success("Staff authentication successful", response));
    }

    /**
     * Dedicated Student Login endpoint (STUDENT only).
     */
    @PostMapping("/student/login")
    public ResponseEntity<ApiResponse<LoginResponse>> studentLogin(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientIp = extractClientIp(httpRequest);
        LoginResponse response = authService.studentLogin(request, clientIp);
        return ResponseEntity.ok(ApiResponse.success("Student authentication successful", response));
    }

    /**
     * Legacy login endpoint alias (defaults to staff login).
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientIp = extractClientIp(httpRequest);
        LoginResponse response = authService.staffLogin(request, clientIp);
        return ResponseEntity.ok(ApiResponse.success("Authentication successful", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout() {
        return ResponseEntity.ok(ApiResponse.success("Successfully logged out", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserSummaryDto>> getCurrentUser(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        UserSummaryDto profile = authService.getCurrentUserProfile(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Current user profile retrieved", profile));
    }

    /**
     * Public student account activation.
     */
    @PostMapping("/student/activate")
    public ResponseEntity<ApiResponse<Void>> activateStudentAccount(
            @Valid @RequestBody StudentActivateRequest request
    ) {
        studentAccountService.activateAccount(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.message("Your student account has been successfully activated. You may now sign in."));
    }

    /**
     * Public student forgot-password request.
     * Always returns the same generic message whether the email exists or not.
     */
    @PostMapping("/student/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody StudentForgotPasswordRequest request
    ) {
        studentAccountService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(ApiResponse.message("If an account with that email exists, password reset instructions have been sent."));
    }

    /**
     * Public student password reset.
     */
    @PostMapping("/student/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody StudentResetPasswordRequest request
    ) {
        studentAccountService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.message("Your password has been successfully reset. You may now sign in."));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isBlank()) {
            return xfHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}
