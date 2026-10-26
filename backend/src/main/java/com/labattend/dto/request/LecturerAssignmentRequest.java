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
public class LecturerAssignmentRequest {

    @NotNull(message = "Lecturer ID is required")
    private UUID lecturerId;

    @NotNull(message = "Module ID is required")
    private UUID moduleId;

    private UUID batchId;

    @NotBlank(message = "Academic year is required")
    @Size(max = 50, message = "Academic year cannot exceed 50 characters")
    private String academicYear;

    @NotBlank(message = "Semester is required")
    @Size(max = 50, message = "Semester cannot exceed 50 characters")
    private String semester;
}
