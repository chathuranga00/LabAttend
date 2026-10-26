package com.labattend.dto.request;

import jakarta.validation.constraints.Min;
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
public class ModuleRequest {

    @NotBlank(message = "Module code is required")
    @Size(max = 50, message = "Module code cannot exceed 50 characters")
    private String moduleCode;

    @NotBlank(message = "Module name is required")
    @Size(max = 255, message = "Module name cannot exceed 255 characters")
    private String name;

    @NotNull(message = "Credits are required")
    @Min(value = 1, message = "Credits must be at least 1")
    private Integer credits;

    private UUID degreeProgrammeId;

    @Size(max = 50, message = "Academic year cannot exceed 50 characters")
    private String academicYear;

    @Size(max = 50, message = "Semester cannot exceed 50 characters")
    private String semester;
}
