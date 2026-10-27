package com.labattend.report;

import com.labattend.dto.report.ReportData;
import com.labattend.dto.report.ReportExportFormat;
import com.labattend.dto.report.ReportType;
import com.labattend.entity.*;
import com.labattend.entity.Module;
import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.repository.*;
import com.labattend.service.report.CsvReportGenerator;
import com.labattend.service.report.ExcelReportGenerator;
import com.labattend.service.report.PdfReportGenerator;
import com.labattend.service.report.ReportService;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ReportServiceTest {

    @Mock
    private LabSessionRepository labSessionRepository;
    @Mock
    private SessionStudentRepository sessionStudentRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private StudentRepository studentRepository;
    @Mock
    private LecturerRepository lecturerRepository;
    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private BatchRepository batchRepository;
    @Mock
    private LaboratoryHallRepository laboratoryHallRepository;
    @Mock
    private DegreeProgrammeRepository degreeProgrammeRepository;
    @Mock
    private LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository;
    @Mock
    private LabGroupRepository labGroupRepository;

    @Spy
    private CsvReportGenerator csvReportGenerator = new CsvReportGenerator();
    @Spy
    private ExcelReportGenerator excelReportGenerator = new ExcelReportGenerator();
    @Spy
    private PdfReportGenerator pdfReportGenerator = new PdfReportGenerator();

    @InjectMocks
    private ReportService reportService;

    private User lecturerUserA;
    private User lecturerUserB;
    private Lecturer lecturerA;
    private Lecturer lecturerB;
    private DegreeProgramme programme;
    private Batch batch;
    private Module module;
    private LaboratoryHall hall;
    private LabSession finalizedSession;

    @BeforeEach
    void setUp() {
        lecturerUserA = User.builder().fullName("Dr. Perera").email("perera@sliit.lk").role(Role.LECTURER).build();
        lecturerUserA.setId(UUID.randomUUID());

        lecturerUserB = User.builder().fullName("Dr. Silva").email("silva@sliit.lk").role(Role.LECTURER).build();
        lecturerUserB.setId(UUID.randomUUID());

        lecturerA = Lecturer.builder().user(lecturerUserA).staffId("LEC001").fullName("Dr. Perera").department("Computing").isActive(true).build();
        lecturerA.setId(UUID.randomUUID());

        lecturerB = Lecturer.builder().user(lecturerUserB).staffId("LEC002").fullName("Dr. Silva").department("Computing").isActive(true).build();
        lecturerB.setId(UUID.randomUUID());

        programme = DegreeProgramme.builder().code("SE").name("Software Engineering").department("Computing").build();
        programme.setId(UUID.randomUUID());

        batch = Batch.builder().batchCode("Y2S1.01").academicYear("2026").degreeProgramme(programme).build();
        batch.setId(UUID.randomUUID());

        module = Module.builder().moduleCode("IT2010").name("Data Structures and Algorithms").degreeProgramme(programme).semester("Year 2 Semester 1").build();
        module.setId(UUID.randomUUID());

        hall = LaboratoryHall.builder().hallCode("LAB01").name("Main Computing Lab 01").capacity(60).location("Block A, Level 3").build();
        hall.setId(UUID.randomUUID());

        finalizedSession = LabSession.builder()
                .sessionCode("SES-IT2010-2026-001")
                .module(module)
                .batch(batch)
                .lecturer(lecturerA)
                .hall(hall)
                .sessionDate(LocalDate.of(2026, 10, 20))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .status(SessionStatus.FINALIZED)
                .finalizationNotes("Lab Sheet 04 - Graph Algorithms")
                .finalizedAt(OffsetDateTime.now())
                .build();
        finalizedSession.setId(UUID.randomUUID());
    }

    // =========================================================================
    // 1. EXPORT FORMAT INTEGRITY TESTS
    // =========================================================================

    @Test
    @DisplayName("CSV Export returns valid CSV stream with UTF-8 BOM and metadata")
    void testCsvExport_ReturnsValidCsvFileWithHeadersAndMatchingCounts() {
        ReportData reportData = ReportData.builder()
                .title("Individual Session Attendance")
                .type(ReportType.SESSION)
                .generatedAt("2026-10-26 10:00:00")
                .expectedCount(50)
                .presentCount(45)
                .absentCount(5)
                .attendancePercentage("90.0%")
                .metadata(Map.of("Module", "IT2010", "Batch", "Y2S1.01"))
                .headers(List.of("#", "Student ID", "Full Name", "Status", "Marked Time"))
                .rows(List.of(
                        List.of("1", "IT21001", "Kamal Perera", "PRESENT", "2026-10-26 09:05:00"),
                        List.of("2", "IT21002", "Nimal Silva", "ABSENT", "-")
                ))
                .additionalSummary("Session finalized normally")
                .build();

        byte[] csvBytes = reportService.exportReport(reportData, ReportExportFormat.CSV);
        assertNotNull(csvBytes);
        assertTrue(csvBytes.length > 0);

        String csvContent = new String(csvBytes, StandardCharsets.UTF_8);
        assertTrue(csvContent.startsWith("\uFEFF# LabAttend"));
        assertTrue(csvContent.contains("Individual Session Attendance"));
        assertTrue(csvContent.contains("Expected Students: 50 | Present: 45 | Absent: 5 | Attendance Rate: 90.0%"));
        assertTrue(csvContent.contains("\"Kamal Perera\""));
        assertTrue(csvContent.contains("\"IT21001\""));
    }

    @Test
    @DisplayName("Excel Export returns valid XLSX byte stream with ZIP magic bytes and valid structure")
    void testExcelExport_ReturnsValidXlsxFileWithMagicBytes() throws Exception {
        ReportData reportData = ReportData.builder()
                .title("Module Attendance Audit")
                .type(ReportType.MODULE)
                .generatedAt("2026-10-26 10:00:00")
                .expectedCount(100)
                .presentCount(88)
                .absentCount(12)
                .attendancePercentage("88.0%")
                .metadata(Map.of("Module", "IT2010 - DSA"))
                .headers(List.of("#", "Session Code", "Date", "Expected", "Present", "Absent", "Rate"))
                .rows(List.of(
                        List.of("1", "SES-001", "2026-10-15", "50", "44", "6", "88.0%"),
                        List.of("2", "SES-002", "2026-10-22", "50", "44", "6", "88.0%")
                ))
                .build();

        byte[] excelBytes = reportService.exportReport(reportData, ReportExportFormat.EXCEL);
        assertNotNull(excelBytes);
        assertTrue(excelBytes.length > 4);

        // Verify ZIP magic bytes (PK\x03\x04 -> 0x50, 0x4B, 0x03, 0x04)
        assertEquals((byte) 0x50, excelBytes[0]);
        assertEquals((byte) 0x4B, excelBytes[1]);
        assertEquals((byte) 0x03, excelBytes[2]);
        assertEquals((byte) 0x04, excelBytes[3]);

        // Verify valid POI workbook parse
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(excelBytes))) {
            assertEquals(1, workbook.getNumberOfSheets());
            assertEquals("Attendance Report", workbook.getSheetAt(0).getSheetName());
            assertTrue(workbook.getSheetAt(0).getPhysicalNumberOfRows() >= 5);
        }
    }

    @Test
    @DisplayName("PDF Export returns valid PDF byte stream with %PDF- header magic bytes")
    void testPdfExport_ReturnsValidPdfFileWithMagicBytes() {
        ReportData reportData = ReportData.builder()
                .title("Batch Attendance Audit")
                .type(ReportType.BATCH)
                .generatedAt("2026-10-26 10:00:00")
                .expectedCount(60)
                .presentCount(54)
                .absentCount(6)
                .attendancePercentage("90.0%")
                .metadata(Map.of("Batch", "Y2S1.01", "Programme", "Software Engineering"))
                .headers(List.of("#", "Date", "Session Code", "Module", "Turnout Rate"))
                .rows(List.of(
                        List.of("1", "2026-10-20", "SES-001", "IT2010", "90.0%")
                ))
                .additionalSummary("Cohort turnout meets faculty standards.")
                .build();

        byte[] pdfBytes = reportService.exportReport(reportData, ReportExportFormat.PDF);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 10);

        // Verify PDF Magic Bytes (%PDF- -> 0x25, 0x50, 0x44, 0x46, 0x2D)
        assertEquals((byte) '%', pdfBytes[0]);
        assertEquals((byte) 'P', pdfBytes[1]);
        assertEquals((byte) 'D', pdfBytes[2]);
        assertEquals((byte) 'F', pdfBytes[3]);
        assertEquals((byte) '-', pdfBytes[4]);
    }

    // =========================================================================
    // 2. DATA INTEGRITY & ANALYTICS MATCHING
    // =========================================================================

    @Test
    @DisplayName("Session Report totals exactly match analytics calculation logic")
    void testSessionReport_TotalsMatchAnalytics_WhenFinalized() {
        Student s1 = Student.builder().studentId("IT21001").fullName("Student One").build();
        s1.setId(UUID.randomUUID());
        Student s2 = Student.builder().studentId("IT21002").fullName("Student Two").build();
        s2.setId(UUID.randomUUID());
        Student s3 = Student.builder().studentId("IT21003").fullName("Student Three").build();
        s3.setId(UUID.randomUUID());

        SessionStudent ss1 = SessionStudent.builder().session(finalizedSession).student(s1).build();
        SessionStudent ss2 = SessionStudent.builder().session(finalizedSession).student(s2).build();
        SessionStudent ss3 = SessionStudent.builder().session(finalizedSession).student(s3).build();

        AttendanceRecord rec1 = AttendanceRecord.builder().session(finalizedSession).student(s1).status(AttendanceStatus.PRESENT).method(AttendanceMethod.QR_SCAN).markedAt(OffsetDateTime.now()).build();
        AttendanceRecord rec2 = AttendanceRecord.builder().session(finalizedSession).student(s2).status(AttendanceStatus.LATE).method(AttendanceMethod.QR_SCAN).markedAt(OffsetDateTime.now()).build();
        AttendanceRecord rec3 = AttendanceRecord.builder().session(finalizedSession).student(s3).status(AttendanceStatus.ABSENT).method(AttendanceMethod.MANUAL).markedAt(OffsetDateTime.now()).build();

        when(labSessionRepository.findById(finalizedSession.getId())).thenReturn(Optional.of(finalizedSession));
        when(sessionStudentRepository.findBySessionId(finalizedSession.getId())).thenReturn(new ArrayList<>(List.of(ss1, ss2, ss3)));
        when(attendanceRecordRepository.findBySessionId(finalizedSession.getId())).thenReturn(List.of(rec1, rec2, rec3));

        ReportData report = reportService.generateSessionReport(finalizedSession.getId(), lecturerUserA.getId(), true);

        assertEquals(3, report.getExpectedCount());
        assertEquals(2, report.getPresentCount(), "PRESENT + LATE count must equal 2");
        assertEquals(1, report.getAbsentCount(), "ABSENT count must equal 1");
        assertEquals("66.7%", report.getAttendancePercentage());
        assertEquals(3, report.getRows().size());
        assertEquals("Lab Sheet 04 - Graph Algorithms", report.getMetadata().get("Lab Sheet Number"));
    }

    // =========================================================================
    // 3. ROLE ISOLATION & LECTURER SECURITY
    // =========================================================================

    @Test
    @DisplayName("Lecturer cannot export report for another lecturer's session")
    void testLecturerCannotExportAnotherLecturersSession() {
        when(labSessionRepository.findById(finalizedSession.getId())).thenReturn(Optional.of(finalizedSession));
        when(lecturerRepository.findByUserId(lecturerUserB.getId())).thenReturn(Optional.of(lecturerB));

        // finalizedSession belongs to lecturerA, lecturerUserB attempts to export with isAdmin = false
        assertThrows(AccessDeniedException.class, () ->
                reportService.generateSessionReport(finalizedSession.getId(), lecturerUserB.getId(), false)
        );
    }

    @Test
    @DisplayName("Lecturer cannot export report for module they are not assigned to")
    void testLecturerCannotExportUnassignedModuleReport() {
        when(moduleRepository.findById(module.getId())).thenReturn(Optional.of(module));
        when(lecturerRepository.findByUserId(lecturerUserA.getId())).thenReturn(Optional.of(lecturerA));
        when(lecturerModuleAssignmentRepository.findByLecturerId(lecturerA.getId())).thenReturn(Collections.emptyList());

        assertThrows(AccessDeniedException.class, () ->
                reportService.generateModuleReport(module.getId(), null, null, null, null, lecturerUserA.getId(), false)
        );
    }

    // =========================================================================
    // 4. LIFECYCLE & STATUS REJECTION RULES
    // =========================================================================

    @Test
    @DisplayName("Cancelled sessions are rejected from official report generation")
    void testCancelledSession_CannotBeExported() {
        finalizedSession.setStatus(SessionStatus.CANCELLED);
        when(labSessionRepository.findById(finalizedSession.getId())).thenReturn(Optional.of(finalizedSession));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                reportService.generateSessionReport(finalizedSession.getId(), lecturerUserA.getId(), true)
        );
        assertTrue(ex.getMessage().contains("Cancelled sessions cannot be exported"));
    }

    @Test
    @DisplayName("Active or Draft sessions are rejected from official report generation")
    void testDraftOrActiveSession_CannotBeExported() {
        finalizedSession.setStatus(SessionStatus.ACTIVE);
        when(labSessionRepository.findById(finalizedSession.getId())).thenReturn(Optional.of(finalizedSession));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                reportService.generateSessionReport(finalizedSession.getId(), lecturerUserA.getId(), true)
        );
        assertTrue(ex.getMessage().contains("Only finalized sessions can generate official attendance reports"));
    }

    // =========================================================================
    // 5. ALL 8 REPORT TYPES GENERATE COMPLIANT REPORT DATA
    // =========================================================================

    @Test
    @DisplayName("Daily Report generates compliant ReportData")
    void testDailyReport_GeneratesCompliantData() {
        when(labSessionRepository.findFinalizedSessionsForReports(
                isNull(), eq(LocalDate.of(2026, 10, 20)), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(finalizedSession));
        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(finalizedSession.getId())).thenReturn(25L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(finalizedSession.getId()), anyList())).thenReturn(23L);

        ReportData report = reportService.generateDailyReport(LocalDate.of(2026, 10, 20), null, null, true);

        assertEquals(ReportType.DAILY, report.getType());
        assertEquals(25, report.getExpectedCount());
        assertEquals(23, report.getPresentCount());
        assertEquals(2, report.getAbsentCount());
        assertEquals("92.0%", report.getAttendancePercentage());
        assertEquals(1, report.getRows().size());
    }

    @Test
    @DisplayName("Student History Report generates compliant ReportData")
    void testStudentHistoryReport_GeneratesCompliantData() {
        Student s = Student.builder().studentId("IT21001").fullName("Kamal Perera").batch(batch).degreeProgramme(programme).build();
        s.setId(UUID.randomUUID());
        SessionStudent ss = SessionStudent.builder().session(finalizedSession).student(s).isExpected(true).build();
        AttendanceRecord ar = AttendanceRecord.builder().session(finalizedSession).student(s).status(AttendanceStatus.PRESENT).method(AttendanceMethod.QR_SCAN).markedAt(OffsetDateTime.now()).isCrossGroup(false).build();

        when(studentRepository.findById(s.getId())).thenReturn(Optional.of(s));
        when(sessionStudentRepository.findStudentEligibleSessions(eq(s.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(ss));
        when(attendanceRecordRepository.findByStudentIdAndSessionIdIn(eq(s.getId()), anyCollection()))
                .thenReturn(List.of(ar));

        ReportData report = reportService.generateStudentHistoryReport(s.getId(), null, null, null, null, true);

        assertEquals(ReportType.STUDENT_HISTORY, report.getType());
        assertEquals(1, report.getExpectedCount());
        assertEquals(1, report.getPresentCount());
        assertEquals(0, report.getAbsentCount());
        assertEquals("100.0%", report.getAttendancePercentage());
    }

    @Test
    @DisplayName("Batch Report generates compliant ReportData")
    void testBatchReport_GeneratesCompliantData() {
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));
        when(labSessionRepository.findFinalizedSessionsForReports(
                isNull(), isNull(), isNull(), isNull(), isNull(), eq(batch.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(finalizedSession));
        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(finalizedSession.getId())).thenReturn(40L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(finalizedSession.getId()), anyList())).thenReturn(36L);

        ReportData report = reportService.generateBatchReport(batch.getId(), null, null, null, null, null, true);

        assertEquals(ReportType.BATCH, report.getType());
        assertEquals(40, report.getExpectedCount());
        assertEquals(36, report.getPresentCount());
        assertEquals("90.0%", report.getAttendancePercentage());
    }

    @Test
    @DisplayName("Semester Report aggregates multiple modules accurately")
    void testSemesterReport_AggregatesModulesAccurately() {
        when(labSessionRepository.findFinalizedSessionsForReports(
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), eq("Year 2 Semester 1"), isNull()))
                .thenReturn(List.of(finalizedSession));
        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(finalizedSession.getId())).thenReturn(50L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(finalizedSession.getId()), anyList())).thenReturn(45L);

        ReportData report = reportService.generateSemesterReport("Year 2 Semester 1", null, null, null, null, null, null, null, true);

        assertEquals(ReportType.SEMESTER, report.getType());
        assertEquals(50, report.getExpectedCount());
        assertEquals(45, report.getPresentCount());
        assertEquals(5, report.getAbsentCount());
        assertEquals("90.0%", report.getAttendancePercentage());
        assertEquals(1, report.getRows().size());
    }

    @Test
    @DisplayName("Low Attendance Alert Report filters and ranks at-risk students below threshold")
    void testLowAttendanceReport_IdentifiesStudentsBelowThreshold() {
        UUID studentId = UUID.randomUUID();
        Object[] eligibleRow = new Object[]{studentId, "IT21099", "At Risk Student", "Y2S1.01", UUID.randomUUID(), "Group A", 10L};
        Object[] attendedRow = new Object[]{studentId, 6L}; // 6/10 = 60%, below 80% threshold

        List<Object[]> eligibleList = new ArrayList<>();
        eligibleList.add(eligibleRow);
        List<Object[]> attendedList = new ArrayList<>();
        attendedList.add(attendedRow);

        when(sessionStudentRepository.countEligibleFinalizedSessionsPerStudent(
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(eligibleList);
        when(attendanceRecordRepository.countAttendedSessionsPerStudent(
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(attendedList);

        ReportData report = reportService.generateLowAttendanceReport(80.0, null, null, null, null, null, null, null, true);

        assertEquals(ReportType.LOW_ATTENDANCE, report.getType());
        assertEquals(1, report.getRows().size());
        assertEquals("IT21099", report.getRows().get(0).get(1));
        assertEquals("Group A", report.getRows().get(0).get(4));
        assertEquals("60.0%", report.getRows().get(0).get(8));
        assertEquals("-20.0%", report.getRows().get(0).get(9));
    }

    @Test
    @DisplayName("Laboratory Hall Report computes capacity utilization and session turnout")
    void testHallReport_GeneratesCapacityAndTurnoutMetrics() {
        when(laboratoryHallRepository.findById(hall.getId())).thenReturn(Optional.of(hall));
        when(labSessionRepository.findFinalizedSessionsForReports(
                eq(hall.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(finalizedSession));
        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(finalizedSession.getId())).thenReturn(40L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(finalizedSession.getId()), anyList())).thenReturn(30L);

        ReportData report = reportService.generateHallReport(hall.getId(), null, null, null, true);

        assertEquals(ReportType.HALL, report.getType());
        assertEquals(40, report.getExpectedCount());
        assertEquals(30, report.getPresentCount());
        assertEquals(10, report.getAbsentCount());
        assertEquals("75.0%", report.getAttendancePercentage());
        assertEquals(1, report.getRows().size());
        // Hall capacity is 60, present is 30 -> 50.0% utilization
        assertEquals("50.0%", report.getRows().get(0).get(12));
    }
}
