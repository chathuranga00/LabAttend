package com.labattend.controller;

import com.labattend.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminTestController {

    @GetMapping("/ping")
    public ResponseEntity<ApiResponse<String>> pingAdmin() {
        return ResponseEntity.ok(ApiResponse.success("Admin authorized endpoint accessed successfully", "PONG_ADMIN"));
    }
}
