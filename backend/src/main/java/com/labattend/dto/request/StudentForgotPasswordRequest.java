package com.labattend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentForgotPasswordRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Valid email is required")
    private String email;
}
