package com.labattend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabGroupRequest {

    @NotBlank(message = "Group name is required")
    @Size(max = 50, message = "Group name must not exceed 50 characters")
    private String groupName;

    @Builder.Default
    private Boolean isActive = true;
}
