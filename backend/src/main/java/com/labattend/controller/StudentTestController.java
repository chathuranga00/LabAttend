package com.labattend.controller;

import com.labattend.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasRole('STUDENT')")
public class StudentTestController {

    @GetMapping("/ping")
    public ResponseEntity<ApiResponse<String>> pingStudent() {
        return ResponseEntity.ok(ApiResponse.success("Student authorized endpoint accessed successfully", "PONG_STUDENT"));
    }
}
