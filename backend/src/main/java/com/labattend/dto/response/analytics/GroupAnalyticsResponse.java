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
public class GroupAnalyticsResponse {

    private UUID groupId;
    private String groupName;
    private UUID batchId;
    private String batchCode;

    private long totalSessions;
    private long finalizedSessions;

    private long totalExpected;
    private long totalPresent;
    private long totalAbsent;

    private String attendancePercentage;
    private Double percentageNumeric;

    private long visitorsReceived;
    private long outgoingVisits;
}
