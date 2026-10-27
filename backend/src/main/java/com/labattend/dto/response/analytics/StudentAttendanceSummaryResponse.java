package com.labattend.dto.response.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAttendanceSummaryResponse {

    private UUID studentId;
    private String officialStudentId;
    private String fullName;
    private String batchCode;
    private UUID labGroupId;
    private String labGroupName;

    private long eligibleFinalizedSessions;
    private long attendedSessions;
    private long missedSessions;
    private long outgoingCrossGroupVisits;
    private long incomingCrossGroupVisits;

    private String attendancePercentage; // "87.5%" or "N/A"
    private Double percentageNumeric;
    private boolean isLowAttendance;
}
