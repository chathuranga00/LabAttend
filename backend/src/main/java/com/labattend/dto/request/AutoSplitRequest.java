package com.labattend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoSplitRequest {

    @Min(value = 2, message = "Must split into at least 2 groups")
    @Max(value = 10, message = "Cannot split into more than 10 groups")
    @Builder.Default
    private int numGroups = 2;

    // "ALPHABETICAL" (by full_name) or "STUDENT_ID" (by student_id index)
    @Builder.Default
    private String splitMethod = "ALPHABETICAL";

    // Optional custom group names, e.g. ["Group A", "Group B"]
    private List<String> groupNames;
}
