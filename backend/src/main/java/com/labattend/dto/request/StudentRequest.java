package com.labattend.dto.request;

import jakarta.validation.constraints.Email;
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
public class StudentRequest {

    @NotBlank(message = "Student ID is required")
    @Size(max = 50, message = "Student ID cannot exceed 50 characters")
    private String studentId;

    @NotBlank(message = "Full name is required")
    @Size(max = 255, message = "Full name cannot exceed 255 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 255, message = "Email cannot exceed 255 characters")
    private String email;

    @NotNull(message = "Degree programme ID is required")
    private UUID degreeProgrammeId;

    @NotNull(message = "Batch ID is required")
    private UUID batchId;

    private UUID labGroupId;

    @Size(max = 50, message = "Group name cannot exceed 50 characters")
    private String groupName;

    @Size(max = 100, message = "QR Token cannot exceed 100 characters")
    private String qrToken;
}
