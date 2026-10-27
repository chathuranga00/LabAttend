package com.labattend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LecturerDashboardResponse {

    private List<LabSessionResponse> todaySessions;
    private List<LabSessionResponse> upcomingSessions;

    private long totalAssignedModules;
    private long totalAssignedBatches;
    private long totalCompletedSessions;
    private Double averageAttendancePercentage;
}
