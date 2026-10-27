package com.labattend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrRegenerateRequest {

    @NotBlank(message = "Reason is required for QR code regeneration")
    private String reason;
}
