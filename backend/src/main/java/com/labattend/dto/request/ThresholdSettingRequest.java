package com.labattend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThresholdSettingRequest {

    @NotNull(message = "Threshold is required")
    @DecimalMin(value = "0.0", message = "Threshold cannot be negative")
    @DecimalMax(value = "100.0", message = "Threshold cannot exceed 100.0")
    private Double threshold;
}
