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
public class LecturerAssignmentResponse {
    private UUID id;
    private UUID lecturerId;
    private String lecturerName;
    private String lecturerStaffId;
    private UUID moduleId;
    private String moduleCode;
    private String moduleName;
    private UUID batchId;
    private String batchName;
    private String batchCode;
    private UUID labGroupId;
    private String labGroupName;
    private String academicYear;
    private String semester;
    private Boolean isActive;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
