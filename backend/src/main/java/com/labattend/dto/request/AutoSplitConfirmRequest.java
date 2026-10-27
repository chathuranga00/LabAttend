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
public class AutoSplitConfirmRequest {

    @NotEmpty(message = "Assignments list cannot be empty")
    private List<GroupSplitAssignment> assignments;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GroupSplitAssignment {
        private String groupName;
        private List<UUID> studentIds;
    }
}
