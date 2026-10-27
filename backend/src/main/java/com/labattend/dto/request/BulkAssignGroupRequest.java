package com.labattend.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkAssignGroupRequest {

    @NotEmpty(message = "Student IDs list cannot be empty")
    private List<UUID> studentIds;

    // Optional: if null, unassigns students from their current group
    private UUID targetGroupId;

    private String targetGroupName;
}
