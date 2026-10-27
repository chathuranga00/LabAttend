package com.labattend.dto.response;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabGroupResponse {
    private UUID id;
    private UUID batchId;
    private String batchCode;
    private String groupName;
    private Boolean isActive;
    private long studentCount;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
