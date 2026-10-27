package com.labattend.service.report;

import com.labattend.dto.report.ReportData;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Component
public class CsvReportGenerator {

    public byte[] generate(ReportData data) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(new OutputStreamWriter(baos, StandardCharsets.UTF_8))) {
            // Write UTF-8 BOM for Excel compatibility
            writer.print('\ufeff');

            // Metadata Comment Block
            writer.println("# LabAttend - Laboratory Attendance Management System");
            writer.println("# Report Title: " + escapeComment(data.getTitle()));
            writer.println("# Report Type: " + (data.getType() != null ? data.getType().name() : "GENERAL"));
            writer.println("# Generated At: " + escapeComment(data.getGeneratedAt()));

            if (data.getMetadata() != null) {
                for (Map.Entry<String, String> entry : data.getMetadata().entrySet()) {
                    writer.println("# " + escapeComment(entry.getKey()) + ": " + escapeComment(entry.getValue()));
                }
            }

            writer.println("# Expected Students: " + data.getExpectedCount() +
                    " | Present: " + data.getPresentCount() +
                    " | Absent: " + data.getAbsentCount() +
                    " | Attendance Rate: " + data.getAttendancePercentage());

            if (data.getAdditionalSummary() != null && !data.getAdditionalSummary().isEmpty()) {
                writer.println("# Summary Note: " + escapeComment(data.getAdditionalSummary()));
            }
            writer.println("#");

            // CSV Column Headers
            if (data.getHeaders() != null && !data.getHeaders().isEmpty()) {
                writer.println(toCsvLine(data.getHeaders()));
            }

            // CSV Data Rows
            if (data.getRows() != null) {
                for (List<String> row : data.getRows()) {
                    writer.println(toCsvLine(row));
                }
            }

            writer.flush();
        }
        return baos.toByteArray();
    }

    private String escapeComment(String text) {
        if (text == null) return "N/A";
        return text.replace("\r", " ").replace("\n", " ");
    }

    private String toCsvLine(List<String> values) {
        if (values == null || values.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(escapeCsvField(values.get(i)));
        }
        return sb.toString();
    }

    private String escapeCsvField(String field) {
        if (field == null) return "\"\"";
        // If field contains comma, quote, or newline, escape quotes with double quotes and wrap in quotes
        if (field.contains(",") || field.contains("\"") || field.contains("\n") || field.contains("\r")) {
            return "\"" + field.replace("\"", "\"\"") + "\"";
        }
        return "\"" + field + "\"";
    }
}
