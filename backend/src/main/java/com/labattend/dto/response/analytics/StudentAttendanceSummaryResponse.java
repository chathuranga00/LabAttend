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
    private String email;
    private String personalEmail;
    private String batchCode;
    private UUID labGroupId;
    private String labGroupName;

    private long eligibleFinalizedSessions;
    private long attendedSessions;
    private long missedSessions;
    private long outgoingCrossGroupVisits;
    private long incomingCrossGroupVisits;

    private int consecutiveAbsences;
    private boolean isAtRisk;
    private String outlookMailtoLink;
    private String outlookWebLink;

    private String attendancePercentage; // "87.5%" or "N/A"
    private Double percentageNumeric;
    private boolean isLowAttendance;
}
