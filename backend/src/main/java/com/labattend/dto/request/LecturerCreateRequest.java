package com.labattend.dto.request;

import jakarta.validation.constraints.Email;
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
public class LecturerCreateRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 255, message = "Email cannot exceed 255 characters")
    private String email;

    @NotBlank(message = "Full name is required")
    @Size(max = 255, message = "Full name cannot exceed 255 characters")
    private String fullName;

    @NotBlank(message = "Staff ID is required")
    @Size(max = 50, message = "Staff ID cannot exceed 50 characters")
    private String staffId;

    @NotBlank(message = "Department is required")
    @Size(max = 255, message = "Department cannot exceed 255 characters")
    private String department;

    @Size(min = 8, max = 50, message = "Initial password must be between 8 and 50 characters if provided")
    private String initialPassword;
}
