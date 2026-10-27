package com.labattend.dto.request;

import com.labattend.entity.enums.AttendanceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceCorrectionRequest {

    @NotNull(message = "New attendance status is required")
    private AttendanceStatus status;

    @NotBlank(message = "A justification reason is required for attendance correction")
    private String reason;
}
