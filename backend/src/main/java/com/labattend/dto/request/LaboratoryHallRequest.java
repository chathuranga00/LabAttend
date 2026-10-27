package com.labattend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LaboratoryHallRequest {

    @NotBlank(message = "Hall code is required")
    @Size(max = 50, message = "Hall code cannot exceed 50 characters")
    private String hallCode;

    @NotBlank(message = "Hall name is required")
    @Size(max = 255, message = "Hall name cannot exceed 255 characters")
    private String name;

    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity;

    @Size(max = 255, message = "Location cannot exceed 255 characters")
    private String location;
}
