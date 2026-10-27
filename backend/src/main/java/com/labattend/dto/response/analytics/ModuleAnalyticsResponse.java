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
public class ModuleAnalyticsResponse {

    private UUID moduleId;
    private String moduleCode;
    private String moduleName;
    private String semester;
    private String academicYear;

    private long totalSessions;
    private long finalizedSessions;
    private long activeSessions;

    private long totalExpected;
    private long totalPresent;
    private long totalAbsent;

    private String attendancePercentage;
    private Double percentageNumeric;
}
