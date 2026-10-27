package com.labattend.analytics;

import com.labattend.dto.report.ReportData;
import com.labattend.dto.report.ReportExportFormat;
import com.labattend.dto.report.ReportType;
import com.labattend.dto.response.analytics.AnalyticsOverviewResponse;
import com.labattend.dto.response.analytics.GroupAnalyticsResponse;
import com.labattend.dto.response.analytics.SessionAnalyticsResponse;
import com.labattend.entity.*;
import com.labattend.entity.Module;
import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.repository.*;
import com.labattend.service.AnalyticsService;
import com.labattend.service.report.CsvReportGenerator;
import com.labattend.service.report.ExcelReportGenerator;
import com.labattend.service.report.PdfReportGenerator;
import com.labattend.service.report.ReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class GroupAwareAnalyticsTest {

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
    private DegreeProgrammeRepository degreeProgrammeRepository;
    @Mock
    private LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository;
    @Mock
    private LabGroupRepository labGroupRepository;
    @Mock
    private LaboratoryHallRepository laboratoryHallRepository;

    @Spy
    private CsvReportGenerator csvReportGenerator = new CsvReportGenerator();
    @Spy
    private ExcelReportGenerator excelReportGenerator = new ExcelReportGenerator();
    @Spy
    private PdfReportGenerator pdfReportGenerator = new PdfReportGenerator();

    private AnalyticsService analyticsService;
    private ReportService reportService;

    private User lecturerUserA;
    private Lecturer lecturerA;
    private User lecturerUserB;
    private Lecturer lecturerB;
    private Batch batch;
    private LabGroup groupA;
    private LabGroup groupB;
    private Module module;
    private LaboratoryHall hall;
    private LabSession sessionGroupA;
    private Student regularStudent;
    private Student visitingStudent;

    @BeforeEach
    void setUp() {
        analyticsService = new AnalyticsService(
                labSessionRepository,
                sessionStudentRepository,
                attendanceRecordRepository,
                lecturerRepository,
                studentRepository,
                moduleRepository,
                batchRepository,
                degreeProgrammeRepository,
                lecturerModuleAssignmentRepository,
                labGroupRepository
        );

        reportService = new ReportService(
                labSessionRepository,
                sessionStudentRepository,
                attendanceRecordRepository,
                studentRepository,
                lecturerRepository,
                moduleRepository,
                batchRepository,
                laboratoryHallRepository,
                degreeProgrammeRepository,
                lecturerModuleAssignmentRepository,
                labGroupRepository,
                csvReportGenerator,
                excelReportGenerator,
                pdfReportGenerator
        );

        lecturerUserA = User.builder().fullName("Dr. Perera").email("perera@labattend.edu").role(Role.LECTURER).build();
        lecturerUserA.setId(UUID.randomUUID());
        lecturerA = Lecturer.builder().user(lecturerUserA).fullName("Dr. Perera").staffId("LEC001").department("Computing").build();
        lecturerA.setId(UUID.randomUUID());

        lecturerUserB = User.builder().fullName("Prof. Silva").email("silva@labattend.edu").role(Role.LECTURER).build();
        lecturerUserB.setId(UUID.randomUUID());
        lecturerB = Lecturer.builder().user(lecturerUserB).fullName("Prof. Silva").staffId("LEC002").department("Computing").build();
        lecturerB.setId(UUID.randomUUID());

        DegreeProgramme programme = DegreeProgramme.builder().code("SE").name("Software Engineering").build();
        programme.setId(UUID.randomUUID());

        batch = Batch.builder().batchCode("Y2S1-2026").academicYear("2026").degreeProgramme(programme).build();
        batch.setId(UUID.randomUUID());

        groupA = LabGroup.builder().groupName("Group A").batch(batch).build();
        groupA.setId(UUID.randomUUID());

        groupB = LabGroup.builder().groupName("Group B").batch(batch).build();
        groupB.setId(UUID.randomUUID());

        module = Module.builder().moduleCode("CS201").name("Data Structures").semester("Y2S1").degreeProgramme(programme).build();
        module.setId(UUID.randomUUID());

        hall = LaboratoryHall.builder().name("Lab 01").capacity(60).build();
        hall.setId(UUID.randomUUID());

        sessionGroupA = LabSession.builder()
                .sessionCode("SES-101")
                .batch(batch)
                .labGroup(groupA)
                .module(module)
                .hall(hall)
                .lecturer(lecturerA)
                .sessionDate(LocalDate.now())
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .status(SessionStatus.FINALIZED)
                .build();
        sessionGroupA.setId(UUID.randomUUID());

        regularStudent = Student.builder()
                .studentId("IT21001001")
                .fullName("Regular Student A")
                .batch(batch)
                .labGroup(groupA)
                .build();
        regularStudent.setId(UUID.randomUUID());

        visitingStudent = Student.builder()
                .studentId("IT21002002")
                .fullName("Visiting Student B")
                .batch(batch)
                .labGroup(groupB)
                .build();
        visitingStudent.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("1. Group-wise counts: breakdown calculates expected, present, absent, visitors received and outgoing visits accurately")
    void testGroupWiseCounts() {
        when(labGroupRepository.findByBatchIdOrderByGroupNameAsc(batch.getId()))
                .thenReturn(List.of(groupA, groupB));

        // Group A: 1 finalized session, 25 expected slots, 20 present, 5 absent, 2 visitors received, 1 outgoing visit
        when(labSessionRepository.countSessionsByStatus(isNull(), isNull(), eq(batch.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{SessionStatus.FINALIZED, 1L}));
        when(sessionStudentRepository.countTotalExpectedFinalizedSlots(isNull(), isNull(), eq(batch.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(25L);
        when(attendanceRecordRepository.countFinalizedAttendanceSlotsByStatus(isNull(), isNull(), eq(batch.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{AttendanceStatus.PRESENT, 20L}, new Object[]{AttendanceStatus.ABSENT, 5L}));
        when(attendanceRecordRepository.countTotalCrossGroupVisitorsFinalizedSlots(isNull(), isNull(), eq(batch.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(2L);
        when(attendanceRecordRepository.countOutgoingCrossGroupVisitsPerStudent(isNull(), isNull(), eq(batch.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{regularStudent.getId(), 1L}));

        // Group B: 1 finalized session, 30 expected slots, 27 present, 3 absent, 1 visitor received, 2 outgoing visits
        when(labSessionRepository.countSessionsByStatus(isNull(), isNull(), eq(batch.getId()), eq(groupB.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{SessionStatus.FINALIZED, 1L}));
        when(sessionStudentRepository.countTotalExpectedFinalizedSlots(isNull(), isNull(), eq(batch.getId()), eq(groupB.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(30L);
        when(attendanceRecordRepository.countFinalizedAttendanceSlotsByStatus(isNull(), isNull(), eq(batch.getId()), eq(groupB.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{AttendanceStatus.PRESENT, 27L}, new Object[]{AttendanceStatus.ABSENT, 3L}));
        when(attendanceRecordRepository.countTotalCrossGroupVisitorsFinalizedSlots(isNull(), isNull(), eq(batch.getId()), eq(groupB.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(1L);
        when(attendanceRecordRepository.countOutgoingCrossGroupVisitsPerStudent(isNull(), isNull(), eq(batch.getId()), eq(groupB.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{visitingStudent.getId(), 2L}));

        List<GroupAnalyticsResponse> responses = analyticsService.getGroupAttendanceAnalytics(
                null, null, batch.getId(), null, null, null, null, null
        );

        assertNotNull(responses);
        assertEquals(2, responses.size());

        GroupAnalyticsResponse resA = responses.stream().filter(g -> g.getGroupId().equals(groupA.getId())).findFirst().orElseThrow();
        assertEquals("Group A", resA.getGroupName());
        assertEquals(25L, resA.getTotalExpected());
        assertEquals(20L, resA.getTotalPresent());
        assertEquals(5L, resA.getTotalAbsent());
        assertEquals(2L, resA.getVisitorsReceived());
        assertEquals(1L, resA.getOutgoingVisits());
        assertEquals("80.0%", resA.getAttendancePercentage());
        assertEquals(80.0, resA.getPercentageNumeric());

        GroupAnalyticsResponse resB = responses.stream().filter(g -> g.getGroupId().equals(groupB.getId())).findFirst().orElseThrow();
        assertEquals("Group B", resB.getGroupName());
        assertEquals(30L, resB.getTotalExpected());
        assertEquals(27L, resB.getTotalPresent());
        assertEquals(3L, resB.getTotalAbsent());
        assertEquals(1L, resB.getVisitorsReceived());
        assertEquals(2L, resB.getOutgoingVisits());
        assertEquals("90.0%", resB.getAttendancePercentage());
        assertEquals(90.0, resB.getPercentageNumeric());
    }

    @Test
    @DisplayName("2. Visitors excluded from the percentage in Overview, Session Analytics, and Session Report")
    void testVisitorsExcludedFromPercentage() {
        // Setup a session with 20 expected roster students, 18 present regular students, 2 absent regular students, and 3 visitors (all marked present)
        when(lecturerRepository.findByUserId(lecturerUserA.getId())).thenReturn(Optional.of(lecturerA));

        when(labSessionRepository.countSessionsByStatus(eq(lecturerA.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{SessionStatus.FINALIZED, 1L}));
        when(sessionStudentRepository.countTotalExpectedFinalizedSlots(eq(lecturerA.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(20L);
        // countFinalizedAttendanceSlotsByStatus only queries isCrossGroup = false
        when(attendanceRecordRepository.countFinalizedAttendanceSlotsByStatus(eq(lecturerA.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{AttendanceStatus.PRESENT, 18L}, new Object[]{AttendanceStatus.ABSENT, 2L}));
        when(attendanceRecordRepository.countTotalCrossGroupVisitorsFinalizedSlots(eq(lecturerA.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(3L);

        // A. Verify Overview Analytics: 18 / 20 = 90.0%, visitors = 3 (excluded from the 90.0% calculation)
        AnalyticsOverviewResponse overview = analyticsService.getLecturerOverview(
                lecturerUserA.getId(), null, null, null, null, null, null
        );
        assertEquals(20L, overview.getTotalExpectedSlots());
        assertEquals(18L, overview.getTotalPresentSlots());
        assertEquals(2L, overview.getTotalAbsentSlots());
        assertEquals(3L, overview.getTotalCrossGroupVisitors());
        assertEquals("90.0%", overview.getOverallAttendancePercentage());
        assertEquals(90.0, overview.getPercentageNumeric());

        // B. Verify Session Analytics Endpoint
        when(labSessionRepository.findSessionsForAnalytics(eq(lecturerA.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(sessionGroupA));
        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(sessionGroupA.getId())).thenReturn(20L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(sessionGroupA.getId()), anyList())).thenReturn(18L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrue(sessionGroupA.getId())).thenReturn(3L);

        List<SessionAnalyticsResponse> sessionAnalytics = analyticsService.getSessionAnalytics(
                lecturerA.getId(), null, null, null, null, null, null, null, null
        );
        assertEquals(1, sessionAnalytics.size());
        SessionAnalyticsResponse sa = sessionAnalytics.get(0);
        assertEquals(20L, sa.getExpectedStudentCount());
        assertEquals(18L, sa.getPresentCount());
        assertEquals(2L, sa.getAbsentCount());
        assertEquals(3L, sa.getCrossGroupVisitorsCount());
        assertEquals("90.0%", sa.getAttendancePercentage());

        // C. Verify Session Report: visitors excluded from rate
        when(labSessionRepository.findById(sessionGroupA.getId())).thenReturn(Optional.of(sessionGroupA));

        SessionStudent ssRegular = SessionStudent.builder().session(sessionGroupA).student(regularStudent).isExpected(true).build();
        SessionStudent ssVisitor = SessionStudent.builder().session(sessionGroupA).student(visitingStudent).isExpected(false).build();
        when(sessionStudentRepository.findBySessionId(sessionGroupA.getId())).thenReturn(List.of(ssRegular, ssVisitor));

        AttendanceRecord recRegular = AttendanceRecord.builder().session(sessionGroupA).student(regularStudent).status(AttendanceStatus.PRESENT).isCrossGroup(false).build();
        AttendanceRecord recVisitor = AttendanceRecord.builder().session(sessionGroupA).student(visitingStudent).status(AttendanceStatus.PRESENT).isCrossGroup(true).homeLabGroup(groupB).build();
        when(attendanceRecordRepository.findBySessionId(sessionGroupA.getId())).thenReturn(List.of(recRegular, recVisitor));

        ReportData sessionReport = reportService.generateSessionReport(sessionGroupA.getId(), lecturerUserA.getId(), true);
        assertEquals(1, sessionReport.getExpectedCount()); // Only expected roster student
        assertEquals(1, sessionReport.getPresentCount());
        assertEquals(0, sessionReport.getAbsentCount());
        assertEquals("100.0%", sessionReport.getAttendancePercentage());
        assertEquals("1", sessionReport.getMetadata().get("Cross-Group Visitors"));
    }

    @Test
    @DisplayName("3. Cross-Group column and visitor information present in each export format (CSV, Excel, PDF)")
    void testCrossGroupColumnPresentInEachExportFormat() {
        // Prepare cross-group audit records
        AttendanceRecord crossGroupRec = AttendanceRecord.builder()
                .session(sessionGroupA)
                .student(visitingStudent)
                .homeLabGroup(groupB)
                .status(AttendanceStatus.PRESENT)
                .method(AttendanceMethod.QR_SCAN)
                .markedAt(OffsetDateTime.now())
                .isCrossGroup(true)
                .build();

        when(attendanceRecordRepository.findCrossGroupAttendanceRecords(isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(crossGroupRec));

        ReportData reportData = reportService.generateCrossGroupReport(
                null, null, null, null, null, UUID.randomUUID(), true
        );

        assertEquals(ReportType.CROSS_GROUP, reportData.getType());
        assertTrue(reportData.getHeaders().contains("Home Group"));
        assertTrue(reportData.getHeaders().contains("Session Group"));
        assertTrue(reportData.getHeaders().contains("Attended Session"));

        // Format 1: CSV Export
        byte[] csvBytes = reportService.exportReport(reportData, ReportExportFormat.CSV);
        String csvContent = new String(csvBytes, StandardCharsets.UTF_8);
        assertTrue(csvContent.contains("Home Group"));
        assertTrue(csvContent.contains("Session Group"));
        assertTrue(csvContent.contains("Group B"));
        assertTrue(csvContent.contains("Group A"));
        assertTrue(csvContent.contains("Visiting Student B"));

        // Format 2: Excel Export
        byte[] excelBytes = reportService.exportReport(reportData, ReportExportFormat.EXCEL);
        assertNotNull(excelBytes);
        assertTrue(excelBytes.length > 500, "Excel output must contain valid OpenXML workbook structure");

        // Format 3: PDF Export
        byte[] pdfBytes = reportService.exportReport(reportData, ReportExportFormat.PDF);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 100);
        String pdfHeader = new String(Arrays.copyOfRange(pdfBytes, 0, 4), StandardCharsets.US_ASCII);
        assertEquals("%PDF", pdfHeader, "PDF output must start with %PDF magic header");
    }

    @Test
    @DisplayName("4. Report totals strictly equal analytics totals for given scope")
    void testReportTotalsEqualAnalyticsTotals() {
        // Analytics overview returns 40 expected, 36 present, 4 absent, 5 visitors
        when(labSessionRepository.countSessionsByStatus(isNull(), isNull(), eq(batch.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{SessionStatus.FINALIZED, 2L}));
        when(sessionStudentRepository.countTotalExpectedFinalizedSlots(isNull(), isNull(), eq(batch.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(40L);
        when(attendanceRecordRepository.countFinalizedAttendanceSlotsByStatus(isNull(), isNull(), eq(batch.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{AttendanceStatus.PRESENT, 36L}, new Object[]{AttendanceStatus.ABSENT, 4L}));
        when(attendanceRecordRepository.countTotalCrossGroupVisitorsFinalizedSlots(isNull(), isNull(), eq(batch.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(5L);

        AnalyticsOverviewResponse analytics = analyticsService.getAdminOverview(
                null, batch.getId(), groupA.getId(), null, null, null, null, null
        );

        // Report Service batch report for the same batch and group
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));
        when(labGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));
        when(labSessionRepository.findFinalizedSessionsForReports(
                isNull(), isNull(), isNull(), isNull(), isNull(), eq(batch.getId()), eq(groupA.getId()), isNull(), isNull(), isNull()))
                .thenReturn(List.of(sessionGroupA));

        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(sessionGroupA.getId())).thenReturn(40L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(sessionGroupA.getId()), anyList())).thenReturn(36L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrue(sessionGroupA.getId())).thenReturn(5L);

        ReportData report = reportService.generateBatchReport(
                batch.getId(), null, groupA.getId(), null, null, UUID.randomUUID(), true
        );

        // Verify report totals match analytics totals exactly
        assertEquals(analytics.getTotalExpectedSlots(), (long) report.getExpectedCount());
        assertEquals(analytics.getTotalPresentSlots(), (long) report.getPresentCount());
        assertEquals(analytics.getTotalAbsentSlots(), (long) report.getAbsentCount());
        assertEquals(analytics.getOverallAttendancePercentage(), report.getAttendancePercentage());
        assertEquals(String.valueOf(analytics.getTotalCrossGroupVisitors()), report.getMetadata().get("Total Cross-Group Visitors"));
    }

    @Test
    @DisplayName("5. Lecturer permission isolation: Lecturer cannot view cross-group data for other lecturers' sessions")
    void testLecturerCannotSeeAnotherLecturersCrossGroupData() {
        when(lecturerRepository.findByUserId(lecturerUserA.getId())).thenReturn(Optional.of(lecturerA));

        // When Lecturer A requests cross-group data, repository query enforces lecturerId = lecturerA.getId()
        when(attendanceRecordRepository.findCrossGroupAttendanceRecords(eq(lecturerA.getId()), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(Collections.emptyList());

        ReportData lecturerAReport = reportService.generateCrossGroupReport(
                null, null, null, null, null, lecturerUserA.getId(), false
        );

        assertEquals(0, lecturerAReport.getRows().size());
        assertEquals("Lecturer Conducted Sessions", lecturerAReport.getMetadata().get("Scope"));

        // Verify that the repository was called with lecturerA's ID, ensuring Lecturer B's data is isolated
        verify(attendanceRecordRepository).findCrossGroupAttendanceRecords(
                eq(lecturerA.getId()), isNull(), isNull(), isNull(), isNull(), isNull()
        );
        verify(attendanceRecordRepository, never()).findCrossGroupAttendanceRecords(
                eq(lecturerB.getId()), any(), any(), any(), any(), any()
        );
    }
}
