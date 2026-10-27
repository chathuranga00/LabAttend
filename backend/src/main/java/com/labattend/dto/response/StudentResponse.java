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
public class StudentResponse {
    private UUID id;
    private String studentId;
    private String fullName;
    private String email;
    private UUID degreeProgrammeId;
    private String degreeProgrammeCode;
    private String degreeProgrammeName;
    private UUID batchId;
    private String batchCode;
    private String batchAcademicYear;
    private UUID labGroupId;
    private String labGroupName;
    private String qrTokenHash;
    private Boolean hasQrToken;
    private Boolean isActive;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
