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
public class SessionAnalyticsResponse {

    private UUID sessionId;
    private String sessionCode;
    private String moduleCode;
    private String moduleName;
    private String batchCode;
    private String lecturerName;
    private LocalDate sessionDate;
    private String status;

    private long expectedStudentCount;
    private long presentCount;
    private long absentCount;

    private String attendancePercentage;
    private Double percentageNumeric;
}
