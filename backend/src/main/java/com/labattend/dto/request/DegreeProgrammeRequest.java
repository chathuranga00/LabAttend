package com.labattend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DegreeProgrammeRequest {

    @NotBlank(message = "Degree programme code is required")
    @Size(max = 50, message = "Programme code cannot exceed 50 characters")
    private String code;

    @NotBlank(message = "Degree programme name is required")
    @Size(max = 255, message = "Programme name cannot exceed 255 characters")
    private String name;

    @Size(max = 255, message = "Department cannot exceed 255 characters")
    private String department;
}
