package com.labattend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionSummaryResponse {

    private UUID sessionId;
    private String sessionCode;
    private String moduleCode;
    private String moduleName;
    private String batchName;
    private String hallName;
    private String hallCode;
    private String lecturerName;

    private LocalDate sessionDate;
    private LocalTime startTime;
    private LocalTime endTime;

    private OffsetDateTime actualStartedAt;
    private OffsetDateTime actualEndedAt;
    private OffsetDateTime finalizedAt;

    private String status;
    private boolean isFinalized;

    private long expectedStudentCount;
    private long presentCount;
    private long absentCount;
    private long unmarkedCount;

    private String attendancePercentage; // e.g. "87.5%" or "N/A"
    private String finalizationNotes;
}
