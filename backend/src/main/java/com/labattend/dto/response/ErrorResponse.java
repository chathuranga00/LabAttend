package com.labattend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {

    @Builder.Default
    private boolean success = false;

    private int status;

    private String error;

    private String message;

    private String path;

    private Map<String, String> validationErrors;

    @Builder.Default
    private OffsetDateTime timestamp = OffsetDateTime.now();
}
