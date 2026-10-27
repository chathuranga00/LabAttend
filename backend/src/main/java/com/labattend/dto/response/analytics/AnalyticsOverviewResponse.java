package com.labattend.dto.response.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsOverviewResponse {

    private long totalSessions;
    private long finalizedSessions;
    private long activeSessions; // Labelled provisional
    private long cancelledSessions; // Excluded from official statistics
    private long draftSessions;

    private long totalExpectedSlots;
    private long totalPresentSlots;
    private long totalAbsentSlots;

    private String overallAttendancePercentage; // "87.5%" or "N/A"
    private Double percentageNumeric;

    private long totalCrossGroupVisitors;
    private java.util.List<GroupAnalyticsResponse> groupAttendance;

    // Optional admin system-wide metrics
    private Long totalStudents;
    private Long totalLecturers;
    private Long totalModules;
    private Long totalBatches;
    private Long totalProgrammes;
}
