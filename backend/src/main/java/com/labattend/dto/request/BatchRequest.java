package com.labattend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchRequest {

    @NotBlank(message = "Batch code is required")
    @Size(max = 50, message = "Batch code cannot exceed 50 characters")
    private String batchCode;

    @NotBlank(message = "Academic year is required")
    @Size(max = 50, message = "Academic year cannot exceed 50 characters")
    private String academicYear;

    @NotNull(message = "Degree programme ID is required")
    private UUID degreeProgrammeId;
}
