package com.labattend.service.report;

import com.labattend.dto.report.ReportData;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

@Component
public class PdfReportGenerator {

    private static class HeaderFooterPageEvent extends PdfPageEventHelper {
        private final Font footerFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, Color.GRAY);

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfPTable footer = new PdfPTable(2);
            try {
                footer.setWidths(new int[]{70, 30});
                footer.setTotalWidth(document.right() - document.left());

                PdfPCell leftCell = new PdfPCell(new Phrase("LabAttend Official Report — Academic & Laboratory Audit", footerFont));
                leftCell.setBorder(Rectangle.TOP);
                leftCell.setBorderColor(Color.LIGHT_GRAY);
                leftCell.setHorizontalAlignment(Element.ALIGN_LEFT);
                leftCell.setPaddingTop(4);
                footer.addCell(leftCell);

                PdfPCell rightCell = new PdfPCell(new Phrase(String.format("Page %d", writer.getPageNumber()), footerFont));
                rightCell.setBorder(Rectangle.TOP);
                rightCell.setBorderColor(Color.LIGHT_GRAY);
                rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                rightCell.setPaddingTop(4);
                footer.addCell(rightCell);

                footer.writeSelectedRows(0, -1, document.left(), document.bottom() - 10, writer.getDirectContent());
            } catch (Exception e) {
                // Ignore footer errors
            }
        }
    }

    public byte[] generate(ReportData reportData) {
        // Switch to landscape if more than 5 columns
        boolean landscape = reportData.getHeaders() != null && reportData.getHeaders().size() > 5;
        Rectangle pageSize = landscape ? PageSize.A4.rotate() : PageSize.A4;
        Document document = new Document(pageSize, 36, 36, 40, 40);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new HeaderFooterPageEvent());
            document.open();

            // Fonts
            Font brandFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(15, 23, 42)); // Slate 900
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, new Color(30, 58, 138)); // Blue 900
            Font metaLabelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.DARK_GRAY);
            Font metaValFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
            Font metricLabelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new Color(55, 65, 81));
            Font metricValFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new Color(3, 105, 161));
            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
            Font tableDataFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK);

            // LabAttend Brand Header
            Paragraph brandPara = new Paragraph("LabAttend", brandFont);
            brandPara.setSpacingAfter(2);
            document.add(brandPara);

            Paragraph titlePara = new Paragraph(reportData.getTitle() + " Report", titleFont);
            titlePara.setSpacingAfter(10);
            document.add(titlePara);

            // Metadata Table (2-column key-value)
            PdfPTable metaTable = new PdfPTable(4);
            metaTable.setWidthPercentage(100);
            metaTable.setWidths(new float[]{20f, 30f, 20f, 30f});
            metaTable.setSpacingAfter(12);

            addMetaCell(metaTable, "Generated At:", metaLabelFont, reportData.getGeneratedAt(), metaValFont);
            addMetaCell(metaTable, "Report Scope:", metaLabelFont, reportData.getType() != null ? reportData.getType().name() : "GENERAL", metaValFont);

            if (reportData.getMetadata() != null) {
                for (Map.Entry<String, String> entry : reportData.getMetadata().entrySet()) {
                    addMetaCell(metaTable, entry.getKey() + ":", metaLabelFont, entry.getValue(), metaValFont);
                }
            }

            // Fill empty cells if odd count
            int remainder = metaTable.size() % 2; // handled internally by OpenPDF
            document.add(metaTable);

            // Summary Metrics Box Table
            PdfPTable metricsTable = new PdfPTable(4);
            metricsTable.setWidthPercentage(100);
            metricsTable.setSpacingAfter(15);
            addMetricCard(metricsTable, "EXPECTED STUDENTS", String.valueOf(reportData.getExpectedCount()), metricLabelFont, metricValFont);
            addMetricCard(metricsTable, "PRESENT COUNT", String.valueOf(reportData.getPresentCount()), metricLabelFont, metricValFont);
            addMetricCard(metricsTable, "ABSENT COUNT", String.valueOf(reportData.getAbsentCount()), metricLabelFont, metricValFont);
            addMetricCard(metricsTable, "ATTENDANCE RATE", reportData.getAttendancePercentage(), metricLabelFont, metricValFont);
            document.add(metricsTable);

            // Main Data Table
            List<String> headers = reportData.getHeaders();
            if (headers != null && !headers.isEmpty()) {
                PdfPTable dataTable = new PdfPTable(headers.size());
                dataTable.setWidthPercentage(100);
                dataTable.setHeaderRows(1);

                // Add Table Headers
                for (String header : headers) {
                    PdfPCell hCell = new PdfPCell(new Phrase(header, tableHeaderFont));
                    hCell.setBackgroundColor(new Color(30, 64, 175)); // Blue 800
                    hCell.setPadding(6);
                    hCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    hCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                    dataTable.addCell(hCell);
                }

                // Add Table Rows
                List<List<String>> rows = reportData.getRows();
                Color alternateColor = new Color(248, 250, 252); // Slate 50
                Color normalColor = Color.WHITE;

                for (int r = 0; r < rows.size(); r++) {
                    List<String> row = rows.get(r);
                    Color rowBg = (r % 2 == 1) ? alternateColor : normalColor;

                    for (String colValue : row) {
                        PdfPCell dCell = new PdfPCell(new Phrase(colValue != null ? colValue : "-", tableDataFont));
                        dCell.setBackgroundColor(rowBg);
                        dCell.setPadding(5);
                        dCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                        dataTable.addCell(dCell);
                    }
                }

                document.add(dataTable);
            }

            // Additional Summary Note
            if (reportData.getAdditionalSummary() != null && !reportData.getAdditionalSummary().isEmpty()) {
                Paragraph notePara = new Paragraph("\nAudit Summary Note: " + reportData.getAdditionalSummary(),
                        FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 9, Color.DARK_GRAY));
                notePara.setSpacingBefore(10);
                document.add(notePara);
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report", e);
        }
    }

    private void addMetaCell(PdfPTable table, String label, Font labelFont, String value, Font valFont) {
        PdfPCell lCell = new PdfPCell(new Phrase(label, labelFont));
        lCell.setBorder(Rectangle.NO_BORDER);
        lCell.setPadding(3);
        table.addCell(lCell);

        PdfPCell vCell = new PdfPCell(new Phrase(value != null ? value : "-", valFont));
        vCell.setBorder(Rectangle.NO_BORDER);
        vCell.setPadding(3);
        table.addCell(vCell);
    }

    private void addMetricCard(PdfPTable table, String label, String value, Font labelFont, Font valFont) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(new Color(241, 245, 249)); // Slate 100
        cell.setBorderColor(new Color(203, 213, 225)); // Slate 300
        cell.setPadding(8);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);

        Paragraph pLabel = new Paragraph(label, labelFont);
        pLabel.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(pLabel);

        Paragraph pVal = new Paragraph(value, valFont);
        pVal.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(pVal);

        table.addCell(cell);
    }
}
