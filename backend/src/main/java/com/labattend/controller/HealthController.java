package com.labattend.controller;

import com.labattend.dto.response.ApiResponse;
import com.labattend.dto.response.HealthResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final DataSource dataSource;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    @Autowired
    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<HealthResponse>> checkHealth() {
        String dbStatus = "DISCONNECTED";
        Map<String, Object> details = new HashMap<>();

        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(2)) {
                dbStatus = "CONNECTED";
                details.put("databaseProduct", connection.getMetaData().getDatabaseProductName());
                details.put("databaseVersion", connection.getMetaData().getDatabaseProductVersion());
            }
        } catch (Exception e) {
            dbStatus = "ERROR: " + e.getMessage();
            details.put("databaseError", e.getMessage());
        }

        HealthResponse healthResponse = HealthResponse.builder()
                .status("UP")
                .database(dbStatus)
                .version("1.0.0")
                .environment(activeProfile)
                .timestamp(OffsetDateTime.now())
                .details(details)
                .build();

        return ResponseEntity.ok(ApiResponse.success("LabAttend System Health Status", healthResponse));
    }
}
