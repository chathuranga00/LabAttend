package com.labattend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LecturerResponse {
    private UUID id;
    private UUID userId;
    private String email;
    private String fullName;
    private String staffId;
    private String department;
    private Boolean isActive;
    private Boolean mustChangePassword;
    private String temporaryPassword; // only returned upon creation or access-reset
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
