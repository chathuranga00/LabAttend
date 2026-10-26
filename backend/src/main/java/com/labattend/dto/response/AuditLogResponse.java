package com.labattend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLogResponse {

    private UUID id;
    private String entityName;
    private UUID entityId;
    private String action;
    private UUID performedById;
    private String performedByName;
    private String performedByEmail;
    private String performedByRole;
    private String details;
    private String ipAddress;
    private OffsetDateTime timestamp;
}
