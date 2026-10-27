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
public class BatchAnalyticsResponse {

    private UUID batchId;
    private String batchCode;
    private String academicYear;
    private String programmeCode;
    private String programmeName;

    private long totalSessions;
    private long finalizedSessions;
    private long totalExpected;
    private long totalPresent;
    private long totalAbsent;

    private String attendancePercentage;
    private Double percentageNumeric;
}
