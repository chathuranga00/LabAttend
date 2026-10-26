package com.labattend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceScanResponse {

    private String result; // "SUCCESS", "ALREADY_MARKED"

    private String message;

    private UUID studentUuid;

    private String studentId;

    private String studentName;

    private OffsetDateTime scannedAt;

    private String attendanceStatus; // "PRESENT", "LATE"

    private String method; // "QR_SCAN", "MANUAL"

    private long totalExpected;

    private long attendedCount;

    private long remainingCount;
}
