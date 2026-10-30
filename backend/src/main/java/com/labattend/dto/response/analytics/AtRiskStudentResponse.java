package com.labattend.dto.response.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AtRiskStudentResponse {

    private UUID studentId;
    private String officialStudentId;
    private String fullName;
    private String email;
    private String personalEmail;
    private String batchCode;
    private String moduleCode;
    private String moduleName;
    private int consecutiveAbsences;
    private long eligibleFinalizedSessions;
    private long attendedSessions;
    private String attendancePercentage;
    private LocalDate lastAbsentDate;
    private String outlookMailtoLink;
    private String outlookWebLink;
    private String emailSubject;
    private String emailBody;
}
