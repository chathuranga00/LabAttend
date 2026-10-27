package com.labattend.service.report;

import com.labattend.dto.report.ReportData;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@Component
public class ExcelReportGenerator {

    public byte[] generate(ReportData reportData) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Attendance Report");

            // Fonts & Styles
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleFont.setColor(IndexedColors.WHITE.getIndex());

            CellStyle titleStyle = workbook.createCellStyle();
            titleStyle.setFont(titleFont);
            titleStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            titleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            titleStyle.setAlignment(HorizontalAlignment.LEFT);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            Font subTitleFont = workbook.createFont();
            subTitleFont.setFontHeightInPoints((short) 11);
            subTitleFont.setItalic(true);
            subTitleFont.setColor(IndexedColors.WHITE.getIndex());

            CellStyle subTitleStyle = workbook.createCellStyle();
            subTitleStyle.setFont(subTitleFont);
            subTitleStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            subTitleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Font labelFont = workbook.createFont();
            labelFont.setBold(true);
            labelFont.setFontHeightInPoints((short) 10);

            CellStyle labelStyle = workbook.createCellStyle();
            labelStyle.setFont(labelFont);

            Font valueFont = workbook.createFont();
            valueFont.setFontHeightInPoints((short) 10);

            CellStyle valueStyle = workbook.createCellStyle();
            valueStyle.setFont(valueFont);

            // Summary Card Style
            Font summaryMetricFont = workbook.createFont();
            summaryMetricFont.setBold(true);
            summaryMetricFont.setFontHeightInPoints((short) 11);

            CellStyle summaryStyle = workbook.createCellStyle();
            summaryStyle.setFont(summaryMetricFont);
            summaryStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            summaryStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            summaryStyle.setBorderBottom(BorderStyle.THIN);
            summaryStyle.setBorderTop(BorderStyle.THIN);
            summaryStyle.setBorderLeft(BorderStyle.THIN);
            summaryStyle.setBorderRight(BorderStyle.THIN);

            // Table Header Style
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setFontHeightInPoints((short) 10);

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.ROYAL_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.MEDIUM);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Data Row Style
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setFont(valueFont);
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            // Alternate Data Row Style (Zebra striping)
            CellStyle zebraStyle = workbook.createCellStyle();
            zebraStyle.setFont(valueFont);
            zebraStyle.setFillForegroundColor(IndexedColors.LEMON_CHIFFON.getIndex());
            zebraStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            zebraStyle.setBorderBottom(BorderStyle.THIN);
            zebraStyle.setBorderTop(BorderStyle.THIN);
            zebraStyle.setBorderLeft(BorderStyle.THIN);
            zebraStyle.setBorderRight(BorderStyle.THIN);

            int rowIndex = 0;

            // Row 0: Title Banner
            Row titleRow = sheet.createRow(rowIndex++);
            titleRow.setHeightInPoints(24);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(reportData.getTitle() + " - LabAttend");
            titleCell.setCellStyle(titleStyle);

            // Row 1: Subtitle
            Row subTitleRow = sheet.createRow(rowIndex++);
            Cell subTitleCell = subTitleRow.createCell(0);
            subTitleCell.setCellValue("Official Attendance & Academic Audit Record");
            subTitleCell.setCellStyle(subTitleStyle);

            rowIndex++; // Blank row

            // Metadata Section
            Row genRow = sheet.createRow(rowIndex++);
            Cell genLbl = genRow.createCell(0);
            genLbl.setCellValue("Generated At:");
            genLbl.setCellStyle(labelStyle);
            Cell genVal = genRow.createCell(1);
            genVal.setCellValue(reportData.getGeneratedAt());
            genVal.setCellStyle(valueStyle);

            if (reportData.getMetadata() != null) {
                for (Map.Entry<String, String> entry : reportData.getMetadata().entrySet()) {
                    Row metaRow = sheet.createRow(rowIndex++);
                    Cell lblCell = metaRow.createCell(0);
                    lblCell.setCellValue(entry.getKey() + ":");
                    lblCell.setCellStyle(labelStyle);
                    Cell valCell = metaRow.createCell(1);
                    valCell.setCellValue(entry.getValue());
                    valCell.setCellStyle(valueStyle);
                }
            }

            rowIndex++; // Blank row

            // Summary Metrics Row
            Row summaryRow = sheet.createRow(rowIndex++);
            summaryRow.setHeightInPoints(20);
            Cell expLbl = summaryRow.createCell(0);
            expLbl.setCellValue("Expected: " + reportData.getExpectedCount());
            expLbl.setCellStyle(summaryStyle);

            Cell presLbl = summaryRow.createCell(1);
            presLbl.setCellValue("Present: " + reportData.getPresentCount());
            presLbl.setCellStyle(summaryStyle);

            Cell absLbl = summaryRow.createCell(2);
            absLbl.setCellValue("Absent: " + reportData.getAbsentCount());
            absLbl.setCellStyle(summaryStyle);

            Cell rateLbl = summaryRow.createCell(3);
            rateLbl.setCellValue("Attendance Rate: " + reportData.getAttendancePercentage());
            rateLbl.setCellStyle(summaryStyle);

            rowIndex++; // Blank row

            // Data Table Headers
            List<String> headers = reportData.getHeaders();
            Row headerRow = sheet.createRow(rowIndex++);
            headerRow.setHeightInPoints(20);
            for (int col = 0; col < headers.size(); col++) {
                Cell cell = headerRow.createCell(col);
                cell.setCellValue(headers.get(col));
                cell.setCellStyle(headerStyle);
            }

            // Data Table Rows
            List<List<String>> rows = reportData.getRows();
            for (int r = 0; r < rows.size(); r++) {
                Row row = sheet.createRow(rowIndex++);
                List<String> rowData = rows.get(r);
                CellStyle activeStyle = (r % 2 == 1) ? zebraStyle : dataStyle;

                for (int c = 0; c < rowData.size(); c++) {
                    Cell cell = row.createCell(c);
                    cell.setCellValue(rowData.get(c));
                    cell.setCellStyle(activeStyle);
                }
            }

            // Additional Summary footer if present
            if (reportData.getAdditionalSummary() != null && !reportData.getAdditionalSummary().isEmpty()) {
                rowIndex++;
                Row footerRow = sheet.createRow(rowIndex++);
                Cell footerCell = footerRow.createCell(0);
                footerCell.setCellValue("Note: " + reportData.getAdditionalSummary());
                footerCell.setCellStyle(labelStyle);
            }

            // Auto-size columns
            for (int col = 0; col < headers.size(); col++) {
                sheet.autoSizeColumn(col);
                int currentWidth = sheet.getColumnWidth(col);
                if (currentWidth < 3000) {
                    sheet.setColumnWidth(col, 3500);
                }
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate Excel report", e);
        }
    }
}
