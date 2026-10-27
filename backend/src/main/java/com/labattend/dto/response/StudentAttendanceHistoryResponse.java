package com.labattend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAttendanceHistoryResponse {

    private UUID studentId;
    private String studentRegNumber;
    private String studentName;
    private String batchCode;
    private String degreeProgrammeCode;
    private int totalEligibleSessions;
    private int attendedSessions;
    private int missedSessions;
    private Double attendancePercentage; // null when totalEligibleSessions == 0 to represent N/A
    private List<AttendanceRecordItemDto> records;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceRecordItemDto {
        private UUID sessionId;
        private String sessionCode;
        private String moduleCode;
        private String moduleName;
        private String hallCode;
        private LocalDate sessionDate;
        private LocalTime startTime;
        private LocalTime endTime;
        private String sessionStatus;
        private String attendanceStatus;
        private String attendanceMethod;
        private OffsetDateTime markedAt;
        private String justificationNotes;
        private Boolean isCrossGroup;
        private String sessionGroupName;
        private String homeGroupName;
        private String lecturerName;
    }
}
