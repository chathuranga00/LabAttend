package com.labattend.dto.response.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentDetailedAttendanceResponse {

    private UUID studentId;
    private String officialStudentId;
    private String fullName;
    private String email;
    private String batchCode;
    private String programmeName;
    private UUID labGroupId;
    private String labGroupName;

    private long eligibleFinalizedSessions;
    private long attendedSessions;
    private long missedSessions;
    private long outgoingCrossGroupVisits;

    private String attendancePercentage;
    private Double percentageNumeric;

    private List<CrossGroupVisitDetail> otherGroupVisits;
    private List<StudentSessionHistoryItem> history;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CrossGroupVisitDetail {
        private UUID sessionId;
        private String sessionCode;
        private LocalDate sessionDate;
        private String sessionGroupName;
        private String lecturerName;
        private String moduleCode;
        private String moduleName;
        private OffsetDateTime markedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StudentSessionHistoryItem {
        private UUID sessionId;
        private String sessionCode;
        private String moduleCode;
        private String moduleName;
        private String batchCode;
        private LocalDate sessionDate;
        private LocalTime startTime;
        private LocalTime endTime;
        private String sessionStatus; // FINALIZED, ACTIVE
        private String attendanceStatus; // PRESENT, ABSENT, LATE, UNRECORDED
        private String method; // QR_SCAN, MANUAL
        private OffsetDateTime markedAt;
        private Boolean isCorrected;
        private String justificationNotes;
        private Boolean isCrossGroup;
        private String sessionGroupName;
        private String homeGroupName;
        private String lecturerName;
    }
}
