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
public class StudentCsvImportResponse {
    private int totalRows;
    private int successCount;
    private int failureCount;
    private List<CsvRowError> errors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CsvRowError {
        private int rowNumber;
        private String studentId;
        private String error;
    }
}
