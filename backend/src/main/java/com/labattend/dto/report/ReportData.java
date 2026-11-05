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

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public ReportType getType() { return type; }
    public void setType(ReportType type) { this.type = type; }

    public String getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(String generatedAt) { this.generatedAt = generatedAt; }

    public String getGeneratedBy() { return generatedBy; }
    public void setGeneratedBy(String generatedBy) { this.generatedBy = generatedBy; }

    public String getInstitutionName() { return institutionName; }
    public void setInstitutionName(String institutionName) { this.institutionName = institutionName; }

    public int getExpectedCount() { return expectedCount; }
    public void setExpectedCount(int expectedCount) { this.expectedCount = expectedCount; }

    public int getPresentCount() { return presentCount; }
    public void setPresentCount(int presentCount) { this.presentCount = presentCount; }

    public int getAbsentCount() { return absentCount; }
    public void setAbsentCount(int absentCount) { this.absentCount = absentCount; }

    public String getAttendancePercentage() { return attendancePercentage; }
    public void setAttendancePercentage(String attendancePercentage) { this.attendancePercentage = attendancePercentage; }

    public Map<String, String> getMetadata() { return metadata; }
    public void setMetadata(Map<String, String> metadata) { this.metadata = metadata; }

    public List<String> getHeaders() { return headers; }
    public void setHeaders(List<String> headers) { this.headers = headers; }

    public List<List<String>> getRows() { return rows; }
    public void setRows(List<List<String>> rows) { this.rows = rows; }

    public String getAdditionalSummary() { return additionalSummary; }
    public void setAdditionalSummary(String additionalSummary) { this.additionalSummary = additionalSummary; }
}
