package com.labattend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ManualAttendanceRequest {

    private UUID studentId;

    private String studentIdentifier;

    @NotBlank(message = "A justification reason is required for manual attendance recording")
    private String reason;
}
