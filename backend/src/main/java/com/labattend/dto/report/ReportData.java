package com.labattend.dto.report;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportData {

    private String title;
    private ReportType type;
    private String generatedAt;
    private String generatedBy;
    private String institutionName;

    // Summary metrics (Finalized sessions only)
    private int expectedCount;
    private int presentCount;
    private int absentCount;
    private String attendancePercentage;

    // Dynamic metadata key-values (Module, Batch, Date Range, Hall, Lecturer, Lab Sheet #, etc.)
    private Map<String, String> metadata;

    // Tabular preview and export data
    private List<String> headers;
    private List<List<String>> rows;
    private String additionalSummary;
}
