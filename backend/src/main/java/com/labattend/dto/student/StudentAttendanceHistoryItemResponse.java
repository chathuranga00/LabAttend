package com.labattend.dto.student;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAttendanceHistoryItemResponse {
    private LocalDate sessionDate;
    private String moduleCode;
    private String moduleName;
    private String labSheetNumber;
    private String labGroup;
    private String status;
    private Boolean isCrossGroup;
    private Boolean isCorrected;
}
