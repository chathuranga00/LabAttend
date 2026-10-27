package com.labattend.controller;

import com.labattend.dto.request.LoginRequest;
import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.LoginResponse;
import com.labattend.dto.response.UserSummaryDto;
import com.labattend.security.CustomUserDetails;
import com.labattend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Authentication successful", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout() {
        // Stateless JWT: Client deletes the Bearer token
        return ResponseEntity.ok(ApiResponse.success("Successfully logged out", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserSummaryDto>> getCurrentUser(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        UserSummaryDto profile = authService.getCurrentUserProfile(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Current user profile retrieved", profile));
    }
}
