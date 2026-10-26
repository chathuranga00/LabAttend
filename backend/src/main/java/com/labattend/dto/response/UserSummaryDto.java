package com.labattend.dto.response;

import com.labattend.entity.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDto {

    private UUID id;
    private String email;
    private String fullName;
    private Role role;
    private Boolean isActive;
    private String staffId;
    private String department;
}
