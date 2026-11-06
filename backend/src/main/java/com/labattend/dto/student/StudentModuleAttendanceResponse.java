package com.labattend.dto.student;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentModuleAttendanceResponse {
    private UUID moduleId;
    private String moduleCode;
    private String moduleName;
    private long eligibleFinalizedSessions;
    private long attendedSessions;
    private long missedSessions;
    private String attendancePercentage;
    private Double percentageNumeric;
    private boolean belowThreshold;
}
