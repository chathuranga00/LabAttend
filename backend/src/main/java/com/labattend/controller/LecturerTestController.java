package com.labattend.controller;

import com.labattend.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lecturer")
@PreAuthorize("hasRole('LECTURER')")
public class LecturerTestController {

    @GetMapping("/ping")
    public ResponseEntity<ApiResponse<String>> pingLecturer() {
        return ResponseEntity.ok(ApiResponse.success("Lecturer authorized endpoint accessed successfully", "PONG_LECTURER"));
    }
}
