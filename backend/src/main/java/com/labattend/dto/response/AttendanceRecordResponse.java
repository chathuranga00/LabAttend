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
public class AttendanceRecordResponse {

    private UUID id;

    private UUID studentUuid;

    private String studentId;

    private String studentName;

    private String email;

    private String status;

    private String method;

    private OffsetDateTime markedAt;

    private String markedByName;

    private String justificationNotes;

    private Boolean isCorrected;

    private OffsetDateTime correctedAt;

    private String correctedByName;

    private String previousStatus;

    private UUID sessionId;

    private String sessionCode;

    private String moduleCode;

    private Boolean isCrossGroup;

    private UUID homeLabGroupId;

    private String homeLabGroupName;

    private String sessionLabGroupName;

    private String crossGroupNote;
}
