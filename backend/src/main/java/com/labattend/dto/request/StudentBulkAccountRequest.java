package com.labattend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentBulkAccountRequest {
    private UUID batchId;
    private UUID labGroupId;
    private List<UUID> studentIds;
}

