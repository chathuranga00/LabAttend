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
public class LecturerUpdateRequest {

    @NotBlank(message = "Full name is required")
    @Size(max = 255, message = "Full name cannot exceed 255 characters")
    private String fullName;

    @NotBlank(message = "Staff ID is required")
    @Size(max = 50, message = "Staff ID cannot exceed 50 characters")
    private String staffId;

    @NotBlank(message = "Department is required")
    @Size(max = 255, message = "Department cannot exceed 255 characters")
    private String department;
}
