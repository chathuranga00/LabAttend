package com.labattend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabSessionResponse {

    private UUID id;
    private String sessionCode;

    // Module Details
    private UUID moduleId;
    private String moduleCode;
    private String moduleName;

    // Batch Details
    private UUID batchId;
    private String batchCode;
    private String batchAcademicYear;

    // Lecturer Details
    private UUID lecturerId;
    private String lecturerName;
    private String lecturerStaffId;

    // Hall Details
    private UUID hallId;
    private String hallCode;
    private String hallName;
    private Integer hallCapacity;

    // Schedule
    private LocalDate sessionDate;
    private LocalTime startTime;
    private LocalTime endTime;

    // State machine & metrics
    private String status;
    private int expectedStudentCount;
    private int attendedCount;

    // Lifecycle timestamps
    private OffsetDateTime actualStartedAt;
    private OffsetDateTime cancelledAt;
    private String cancellationReason;
    private String finalizationNotes;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
