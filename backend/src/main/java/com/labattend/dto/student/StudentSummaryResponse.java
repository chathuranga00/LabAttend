package com.labattend.dto.student;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentSummaryResponse {
    private long eligibleFinalizedSessions;
    private long attendedSessions;
    private long missedSessions;
    private String attendancePercentage;
    private Double percentageNumeric;
    private long crossGroupVisitsCount;
    private Double threshold;
    private boolean belowThreshold;
}
