package com.labattend.e2e;

import com.labattend.dto.report.ReportData;
import com.labattend.dto.report.ReportExportFormat;
import com.labattend.dto.request.AttendanceScanRequest;
import com.labattend.dto.request.SessionFinalizeRequest;
import com.labattend.dto.response.AttendanceScanResponse;
import com.labattend.dto.response.SessionSummaryResponse;
import com.labattend.dto.response.analytics.GroupAnalyticsResponse;
import com.labattend.entity.*;
import com.labattend.entity.Module;
import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.repository.*;
import com.labattend.service.AnalyticsService;
import com.labattend.service.AttendanceService;
import com.labattend.service.AuditLogService;
import com.labattend.service.LabSessionService;
import com.labattend.service.QrCodeService;
import com.labattend.service.report.CsvReportGenerator;
import com.labattend.service.report.ExcelReportGenerator;
import com.labattend.service.report.PdfReportGenerator;
import com.labattend.service.report.ReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

/**
 * End-to-End Automated Benchmark Test for Step 16:
 * Batch 24.1 has 100 students split into Groups A, B, and C.
 * Admin generates QR codes for all and downloads the bulk ZIP.
 * Lecturer 1 runs a Group A session, Lecturer 2 runs a Group B session.
 * One Group A student is scanned in the Group B session -> flagged cross-group.
 * A student from another batch is rejected.
 * Both sessions are finalized.
 * Verifies expected, present, visitors, absent, percentage across session summary, analytics, and exports.
 */
@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
public class GroupAwareEndToEndBenchmarkTest {

    @Mock
    private StudentRepository studentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private BatchRepository batchRepository;
    @Mock
    private DegreeProgrammeRepository degreeProgrammeRepository;
    @Mock
    private LabGroupRepository labGroupRepository;
    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private LaboratoryHallRepository laboratoryHallRepository;
    @Mock
    private LecturerRepository lecturerRepository;
    @Mock
    private LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository;
    @Mock
    private LabSessionRepository labSessionRepository;
    @Mock
    private SessionStudentRepository sessionStudentRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;

    private QrCodeService qrCodeService;
    private AttendanceService attendanceService;
    private LabSessionService labSessionService;
    private AnalyticsService analyticsService;
    private ReportService reportService;

    private final String hmacSecret = "super_secure_entropy_key_for_testing_group_aware_scenarios_2026";

    // Entities
    private Batch batch241;
    private Batch otherBatch232;
    private LabGroup groupA;
    private LabGroup groupB;
    private LabGroup groupC;
    private Module moduleCS;
    private LaboratoryHall hallA;
    private LaboratoryHall hallB;

    private User lecturer1User;
    private Lecturer lecturer1;
    private User lecturer2User;
    private Lecturer lecturer2;

    private LabSession sessionGroupA;
    private LabSession sessionGroupB;

    private List<Student> groupAStudents;
    private List<Student> groupBStudents;
    private List<Student> groupCStudents;
    private List<Student> all100Students;
    private Student foreignBatchStudent;

    private Map<String, Student> tokenHashToStudent;
    private Map<UUID, List<AttendanceRecord>> recordsBySession;
    private Map<UUID, List<SessionStudent>> sessionStudentsBySession;

    @BeforeEach
    void setUp() {
        // 1. Initialize real QrCodeService
        qrCodeService = new QrCodeService(studentRepository, userRepository, auditLogService);
        ReflectionTestUtils.setField(qrCodeService, "hmacSecret", hmacSecret);
        ReflectionTestUtils.setField(qrCodeService, "bulkMaxStudents", 500);
        ReflectionTestUtils.setField(qrCodeService, "bulkRateLimitPerMinute", 60);

        // 2. Initialize AttendanceService
        attendanceService = new AttendanceService(
                attendanceRecordRepository,
                sessionStudentRepository,
                labSessionRepository,
                studentRepository,
                lecturerRepository,
                userRepository,
                auditLogService,
                qrCodeService
        );

        // 3. Initialize LabSessionService
        labSessionService = new LabSessionService(
                labSessionRepository,
                lecturerRepository,
                moduleRepository,
                batchRepository,
                labGroupRepository,
                laboratoryHallRepository,
                lecturerModuleAssignmentRepository,
                studentRepository,
                sessionStudentRepository,
                attendanceRecordRepository,
                userRepository,
                auditLogService
        );

        // 4. Initialize AnalyticsService
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

        // 5. Initialize ReportService
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
                new CsvReportGenerator(),
                new ExcelReportGenerator(),
                new PdfReportGenerator()
        );

        // Academic Master Data
        DegreeProgramme seProgramme = DegreeProgramme.builder()
                .code("SE")
                .name("Software Engineering")
                .build();
        seProgramme.setId(UUID.randomUUID());

        batch241 = Batch.builder()
                .batchCode("Batch 24.1")
                .degreeProgramme(seProgramme)
                .build();
        batch241.setId(UUID.randomUUID());

        otherBatch232 = Batch.builder()
                .batchCode("Batch 23.2")
                .degreeProgramme(seProgramme)
                .build();
        otherBatch232.setId(UUID.randomUUID());

        groupA = LabGroup.builder().groupName("Group A").batch(batch241).isActive(true).build();
        groupA.setId(UUID.randomUUID());

        groupB = LabGroup.builder().groupName("Group B").batch(batch241).isActive(true).build();
        groupB.setId(UUID.randomUUID());

        groupC = LabGroup.builder().groupName("Group C").batch(batch241).isActive(true).build();
        groupC.setId(UUID.randomUUID());

        moduleCS = Module.builder().moduleCode("SE2010").name("Data Structures & Algorithms").build();
        moduleCS.setId(UUID.randomUUID());

        hallA = LaboratoryHall.builder().hallCode("LAB-01").name("Main Computer Lab").capacity(60).isActive(true).build();
        hallA.setId(UUID.randomUUID());

        hallB = LaboratoryHall.builder().hallCode("LAB-02").name("Advanced Systems Lab").capacity(60).isActive(true).build();
        hallB.setId(UUID.randomUUID());

        // Lecturers
        lecturer1User = User.builder().email("lecturer1@labattend.com").fullName("Dr. Lecturer One").role(Role.LECTURER).isActive(true).build();
        lecturer1User.setId(UUID.randomUUID());
        lecturer1 = Lecturer.builder().user(lecturer1User).staffId("LEC001").fullName("Dr. Lecturer One").build();
        lecturer1.setId(UUID.randomUUID());

        lecturer2User = User.builder().email("lecturer2@labattend.com").fullName("Prof. Lecturer Two").role(Role.LECTURER).isActive(true).build();
        lecturer2User.setId(UUID.randomUUID());
        lecturer2 = Lecturer.builder().user(lecturer2User).staffId("LEC002").fullName("Prof. Lecturer Two").build();
        lecturer2.setId(UUID.randomUUID());

        // Create 100 students for Batch 24.1:
        // Group A: 34 students (indices 1..34)
        // Group B: 33 students (indices 35..67)
        // Group C: 33 students (indices 68..100)
        groupAStudents = new ArrayList<>();
        groupBStudents = new ArrayList<>();
        groupCStudents = new ArrayList<>();
        all100Students = new ArrayList<>();
        tokenHashToStudent = new HashMap<>();

        for (int i = 1; i <= 100; i++) {
            LabGroup targetGroup;
            if (i <= 34) {
                targetGroup = groupA;
            } else if (i <= 67) {
                targetGroup = groupB;
            } else {
                targetGroup = groupC;
            }

            Student s = Student.builder()
                    .studentId(String.format("STU%04d", i))
                    .fullName("Student " + i)
                    .email(String.format("student%04d@students.labattend.com", i))
                    .batch(batch241)
                    .degreeProgramme(seProgramme)
                    .labGroup(targetGroup)
                    .qrVersion(1)
                    .qrGeneratedAt(OffsetDateTime.now())
                    .isActive(true)
                    .build();
            s.setId(UUID.randomUUID());

            String token = qrCodeService.generateToken(s.getId(), 1);
            String hash = qrCodeService.generateTokenHash(token);
            s.setQrTokenHash(hash);

            tokenHashToStudent.put(hash, s);
            all100Students.add(s);

            if (targetGroup == groupA) groupAStudents.add(s);
            else if (targetGroup == groupB) groupBStudents.add(s);
            else groupCStudents.add(s);
        }

        // Foreign student from Batch 23.2
        foreignBatchStudent = Student.builder()
                .studentId("STU9999")
                .fullName("Foreign Student")
                .email("foreign@students.labattend.com")
                .batch(otherBatch232)
                .degreeProgramme(seProgramme)
                .qrVersion(1)
                .isActive(true)
                .build();
        foreignBatchStudent.setId(UUID.randomUUID());
        String foreignToken = qrCodeService.generateToken(foreignBatchStudent.getId(), 1);
        String foreignHash = qrCodeService.generateTokenHash(foreignToken);
        foreignBatchStudent.setQrTokenHash(foreignHash);
        tokenHashToStudent.put(foreignHash, foreignBatchStudent);

        // Lab Sessions
        sessionGroupA = LabSession.builder()
                .sessionCode("SES-24.1-DSA-A")
                .batch(batch241)
                .labGroup(groupA)
                .module(moduleCS)
                .hall(hallA)
                .lecturer(lecturer1)
                .sessionDate(LocalDate.now())
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(10, 0))
                .status(SessionStatus.ACTIVE)
                .build();
        sessionGroupA.setId(UUID.randomUUID());

        sessionGroupB = LabSession.builder()
                .sessionCode("SES-24.1-DSA-B")
                .batch(batch241)
                .labGroup(groupB)
                .module(moduleCS)
                .hall(hallB)
                .lecturer(lecturer2)
                .sessionDate(LocalDate.now())
                .startTime(LocalTime.of(10, 30))
                .endTime(LocalTime.of(12, 30))
                .status(SessionStatus.ACTIVE)
                .build();
        sessionGroupB.setId(UUID.randomUUID());

        // In-memory record tracking
        recordsBySession = new HashMap<>();
        recordsBySession.put(sessionGroupA.getId(), new ArrayList<>());
        recordsBySession.put(sessionGroupB.getId(), new ArrayList<>());

        sessionStudentsBySession = new HashMap<>();
        List<SessionStudent> rosterA = new ArrayList<>();
        for (Student s : groupAStudents) {
            rosterA.add(SessionStudent.builder().session(sessionGroupA).student(s).homeLabGroup(groupA).isExpected(true).build());
        }
        sessionStudentsBySession.put(sessionGroupA.getId(), rosterA);

        List<SessionStudent> rosterB = new ArrayList<>();
        for (Student s : groupBStudents) {
            rosterB.add(SessionStudent.builder().session(sessionGroupB).student(s).homeLabGroup(groupB).isExpected(true).build());
        }
        sessionStudentsBySession.put(sessionGroupB.getId(), rosterB);

        // Wire mock repositories to memory
        when(studentRepository.findByQrTokenHash(any())).thenAnswer(inv -> {
            String hash = inv.getArgument(0);
            return Optional.ofNullable(tokenHashToStudent.get(hash));
        });

        when(labSessionRepository.findById(sessionGroupA.getId())).thenReturn(Optional.of(sessionGroupA));
        when(labSessionRepository.findById(sessionGroupB.getId())).thenReturn(Optional.of(sessionGroupB));
        when(labSessionRepository.findByIdWithPessimisticLock(sessionGroupA.getId())).thenReturn(Optional.of(sessionGroupA));
        when(labSessionRepository.findByIdWithPessimisticLock(sessionGroupB.getId())).thenReturn(Optional.of(sessionGroupB));
        when(labSessionRepository.save(any(LabSession.class))).thenAnswer(inv -> inv.getArgument(0));

        when(attendanceRecordRepository.findBySessionId(any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            return new ArrayList<>(recordsBySession.getOrDefault(sId, Collections.emptyList()));
        });

        when(attendanceRecordRepository.countBySessionIdAndStatus(any(), eq(AttendanceStatus.ABSENT))).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            List<AttendanceRecord> list = recordsBySession.getOrDefault(sId, Collections.emptyList());
            return list.stream().filter(r -> r.getStatus() == AttendanceStatus.ABSENT).count();
        });

        when(lecturerRepository.findByUserId(lecturer1User.getId())).thenReturn(Optional.of(lecturer1));
        when(lecturerRepository.findByUserId(lecturer2User.getId())).thenReturn(Optional.of(lecturer2));
        when(userRepository.findById(lecturer1User.getId())).thenReturn(Optional.of(lecturer1User));
        when(userRepository.findById(lecturer2User.getId())).thenReturn(Optional.of(lecturer2User));

        when(sessionStudentRepository.findBySessionId(any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            return new ArrayList<>(sessionStudentsBySession.getOrDefault(sId, Collections.emptyList()));
        });

        when(sessionStudentRepository.findBySessionIdAndIsExpectedTrue(any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            List<SessionStudent> list = sessionStudentsBySession.getOrDefault(sId, Collections.emptyList());
            return list.stream().filter(ss -> Boolean.TRUE.equals(ss.getIsExpected())).toList();
        });

        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            List<SessionStudent> list = sessionStudentsBySession.getOrDefault(sId, Collections.emptyList());
            return list.stream().filter(ss -> Boolean.TRUE.equals(ss.getIsExpected())).count();
        });

        when(sessionStudentRepository.findBySessionIdAndStudentId(any(), any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            UUID stuId = inv.getArgument(1);
            List<SessionStudent> list = sessionStudentsBySession.getOrDefault(sId, Collections.emptyList());
            return list.stream().filter(ss -> ss.getStudent().getId().equals(stuId)).findFirst();
        });

        when(attendanceRecordRepository.findBySessionIdAndStudentId(any(), any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            UUID stuId = inv.getArgument(1);
            List<AttendanceRecord> list = recordsBySession.getOrDefault(sId, Collections.emptyList());
            return list.stream().filter(ar -> ar.getStudent().getId().equals(stuId)).findFirst();
        });

        when(attendanceRecordRepository.saveAndFlush(any(AttendanceRecord.class))).thenAnswer(inv -> {
            AttendanceRecord rec = inv.getArgument(0);
            rec.setId(UUID.randomUUID());
            recordsBySession.get(rec.getSession().getId()).add(rec);
            return rec;
        });

        when(attendanceRecordRepository.saveAll(any())).thenAnswer(inv -> {
            List<AttendanceRecord> recs = inv.getArgument(0);
            for (AttendanceRecord r : recs) {
                r.setId(UUID.randomUUID());
                recordsBySession.get(r.getSession().getId()).add(r);
            }
            return recs;
        });

        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(any(), any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            List<AttendanceRecord> list = recordsBySession.getOrDefault(sId, Collections.emptyList());
            return list.stream().filter(r -> !Boolean.TRUE.equals(r.getIsCrossGroup()) && (r.getStatus() == AttendanceStatus.PRESENT || r.getStatus() == AttendanceStatus.LATE)).count();
        });

        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrueAndStatusIn(any(), any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(0);
            List<AttendanceRecord> list = recordsBySession.getOrDefault(sId, Collections.emptyList());
            return list.stream().filter(r -> Boolean.TRUE.equals(r.getIsCrossGroup()) && (r.getStatus() == AttendanceStatus.PRESENT || r.getStatus() == AttendanceStatus.LATE)).count();
        });

        when(sessionStudentRepository.save(any(SessionStudent.class))).thenAnswer(inv -> {
            SessionStudent ss = inv.getArgument(0);
            sessionStudentsBySession.get(ss.getSession().getId()).add(ss);
            return ss;
        });
    }

    @Test
    @DisplayName("Complete E2E Scenario: 100 students, bulk ZIP, Group A & B sessions, cross-group scan, foreign batch reject, finalization & reports")
    void runFullGroupAwareEndToEndScenario() throws IOException {
        // =====================================================================
        // STEP 1: VERIFY 100 STUDENTS SPLIT INTO GROUPS A, B, AND C
        // =====================================================================
        assertEquals(34, groupAStudents.size(), "Group A must contain 34 students");
        assertEquals(33, groupBStudents.size(), "Group B must contain 33 students");
        assertEquals(33, groupCStudents.size(), "Group C must contain 33 students");
        assertEquals(100, all100Students.size(), "Total students in Batch 24.1 must equal 100");

        // =====================================================================
        // STEP 2: ADMIN GENERATES QR CODES FOR ALL AND DOWNLOADS BULK ZIP
        // =====================================================================
        when(studentRepository.findByBatchIdAndIsActiveTrueOrderByStudentIdAsc(batch241.getId())).thenReturn(all100Students);

        byte[] bulkZipBytes = qrCodeService.generateBulkZip(batch241.getId(), null, null, false);
        assertNotNull(bulkZipBytes, "Bulk ZIP bytes must not be null");
        assertTrue(bulkZipBytes.length > 0, "Bulk ZIP must not be empty");

        Map<String, byte[]> zipEntries = new HashMap<>();
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(bulkZipBytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                zipEntries.put(entry.getName(), zis.readAllBytes());
                zis.closeEntry();
            }
        }

        assertEquals(100, zipEntries.size(), "Bulk ZIP must contain exactly 100 student QR images");

        // Verify valid PNG header [0x89, 'P', 'N', 'G'] on every generated file in the ZIP
        for (byte[] pngData : zipEntries.values()) {
            assertTrue(pngData.length > 8);
            assertEquals((byte) 0x89, pngData[0]);
            assertEquals((byte) 'P', pngData[1]);
            assertEquals((byte) 'N', pngData[2]);
            assertEquals((byte) 'G', pngData[3]);
        }

        // =====================================================================
        // STEP 3: LECTURER 1 RUNS GROUP A SESSION (Scan 30 of 34 present)
        // =====================================================================
        for (int i = 0; i < 30; i++) {
            Student s = groupAStudents.get(i);
            String token = qrCodeService.generateToken(s.getId(), 1);
            AttendanceScanResponse resp = attendanceService.scanQrAttendance(lecturer1User.getId(), sessionGroupA.getId(), new AttendanceScanRequest(token));

            assertEquals("SUCCESS", resp.getResult());
            assertFalse(resp.getIsCrossGroup(), "Home group student must not be flagged cross-group");
            assertEquals("Attendance Recorded Successfully", resp.getMessage());
            assertEquals(s.getStudentId(), resp.getStudentId());
        }

        // 4 students in Group A remain unrecorded (students 31..34)
        assertEquals(30, recordsBySession.get(sessionGroupA.getId()).size());

        // =====================================================================
        // STEP 4: LECTURER 2 RUNS GROUP B SESSION
        // - 28 regular students from Group B scanned present
        // - 1 Group A student (Student 1) scanned -> flagged as Cross-Group
        // - 1 Foreign Batch Student scanned -> rejected
        // =====================================================================
        for (int i = 0; i < 28; i++) {
            Student s = groupBStudents.get(i);
            String token = qrCodeService.generateToken(s.getId(), 1);
            AttendanceScanResponse resp = attendanceService.scanQrAttendance(lecturer2User.getId(), sessionGroupB.getId(), new AttendanceScanRequest(token));

            assertEquals("SUCCESS", resp.getResult());
            assertFalse(resp.getIsCrossGroup(), "Group B student in Group B session must not be flagged cross-group");
            assertEquals(s.getStudentId(), resp.getStudentId());
        }

        // Cross-Group Scan: Student 1 (from Group A) scans into Group B's session!
        Student groupAVisitor = groupAStudents.get(0); // Student 1
        String visitorToken = qrCodeService.generateToken(groupAVisitor.getId(), 1);

        AttendanceScanResponse crossGroupResp = attendanceService.scanQrAttendance(
                lecturer2User.getId(),
                sessionGroupB.getId(),
                new AttendanceScanRequest(visitorToken)
        );

        assertEquals("CROSS_GROUP_MARKED", crossGroupResp.getResult());
        assertTrue(crossGroupResp.getIsCrossGroup(), "Group A student in Group B session MUST be flagged cross-group");
        assertEquals("Group A", crossGroupResp.getLabGroupName(), "Home group must accurately display Group A");
        assertEquals("STU0001", crossGroupResp.getStudentId());

        // Foreign Batch Scan: Student from Batch 23.2 scans into Group B's session -> Must be REJECTED
        String foreignToken = qrCodeService.generateToken(foreignBatchStudent.getId(), 1);
        BadRequestException foreignEx = assertThrows(BadRequestException.class, () ->
                attendanceService.scanQrAttendance(lecturer2User.getId(), sessionGroupB.getId(), new AttendanceScanRequest(foreignToken))
        );
        assertTrue(foreignEx.getMessage().contains("Student Is Not Assigned to This Session"),
                "Student from different batch must be rejected with Section 25 copy");

        // Verify Session B records before finalization: 28 regular + 1 cross-group visitor = 29 present
        assertEquals(29, recordsBySession.get(sessionGroupB.getId()).size());

        // =====================================================================
        // STEP 5: FINALIZE BOTH SESSIONS & CHECK SUMMARY METRICS
        // =====================================================================
        SessionSummaryResponse summaryA = labSessionService.finalizeSession(
                lecturer1User.getId(),
                sessionGroupA.getId(),
                new SessionFinalizeRequest("Group A Session completed normally")
        );

        assertEquals(SessionStatus.FINALIZED, sessionGroupA.getStatus());
        assertEquals(34, summaryA.getExpectedStudentCount(), "Session A expected must equal 34");
        assertEquals(30, summaryA.getPresentCount(), "Session A present must equal 30");
        assertEquals(4, summaryA.getAbsentCount(), "Session A absent must equal 4 (34 - 30)");
        assertEquals(0, summaryA.getCrossGroupCount(), "Session A visitors must equal 0");
        assertEquals("88.2%", summaryA.getAttendancePercentage(), "Session A turnout must equal 88.2% (30 / 34)");

        SessionSummaryResponse summaryB = labSessionService.finalizeSession(
                lecturer2User.getId(),
                sessionGroupB.getId(),
                new SessionFinalizeRequest("Group B Session completed with cross-group attendance")
        );

        assertEquals(SessionStatus.FINALIZED, sessionGroupB.getStatus());
        assertEquals(33, summaryB.getExpectedStudentCount(), "Session B expected must equal 33 (regular roster)");
        assertEquals(28, summaryB.getPresentCount(), "Session B present regular must equal 28");
        assertEquals(1, summaryB.getCrossGroupCount(), "Session B visitors must equal exactly 1");
        assertEquals(5, summaryB.getAbsentCount(), "Session B absent must equal 5 (33 expected - 28 regular present)");
        assertEquals("84.8%", summaryB.getAttendancePercentage(), "Session B turnout must equal 84.8% (28 / 33), visitors excluded");

        // =====================================================================
        // STEP 6: ANALYTICS VERIFICATION (Group Attendance Breakdown)
        // =====================================================================
        when(labGroupRepository.findByBatchIdOrderByGroupNameAsc(batch241.getId()))
                .thenReturn(List.of(groupA, groupB, groupC));

        // Group A: 1 finalized session, 34 expected slots, 30 present, 4 absent, 0 visitors received, 1 outgoing visit
        when(labSessionRepository.countSessionsByStatus(isNull(), isNull(), eq(batch241.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{SessionStatus.FINALIZED, 1L}));
        when(sessionStudentRepository.countTotalExpectedFinalizedSlots(isNull(), isNull(), eq(batch241.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(34L);
        when(attendanceRecordRepository.countFinalizedAttendanceSlotsByStatus(isNull(), isNull(), eq(batch241.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{AttendanceStatus.PRESENT, 30L}, new Object[]{AttendanceStatus.ABSENT, 4L}));
        when(attendanceRecordRepository.countTotalCrossGroupVisitorsFinalizedSlots(isNull(), isNull(), eq(batch241.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(0L);
        when(attendanceRecordRepository.countOutgoingCrossGroupVisitsPerStudent(isNull(), isNull(), eq(batch241.getId()), eq(groupA.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{groupAStudents.get(0).getId(), 1L}));

        // Group B: 1 finalized session, 33 expected slots, 28 present, 5 absent, 1 visitor received, 0 outgoing visits
        when(labSessionRepository.countSessionsByStatus(isNull(), isNull(), eq(batch241.getId()), eq(groupB.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{SessionStatus.FINALIZED, 1L}));
        when(sessionStudentRepository.countTotalExpectedFinalizedSlots(isNull(), isNull(), eq(batch241.getId()), eq(groupB.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(33L);
        when(attendanceRecordRepository.countFinalizedAttendanceSlotsByStatus(isNull(), isNull(), eq(batch241.getId()), eq(groupB.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.<Object[]>of(new Object[]{AttendanceStatus.PRESENT, 28L}, new Object[]{AttendanceStatus.ABSENT, 5L}));
        when(attendanceRecordRepository.countTotalCrossGroupVisitorsFinalizedSlots(isNull(), isNull(), eq(batch241.getId()), eq(groupB.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(1L);
        when(attendanceRecordRepository.countOutgoingCrossGroupVisitsPerStudent(isNull(), isNull(), eq(batch241.getId()), eq(groupB.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(Collections.emptyList());

        // Group C: 0 sessions
        when(labSessionRepository.countSessionsByStatus(isNull(), isNull(), eq(batch241.getId()), eq(groupC.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(Collections.emptyList());
        when(sessionStudentRepository.countTotalExpectedFinalizedSlots(isNull(), isNull(), eq(batch241.getId()), eq(groupC.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(0L);
        when(attendanceRecordRepository.countFinalizedAttendanceSlotsByStatus(isNull(), isNull(), eq(batch241.getId()), eq(groupC.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(Collections.emptyList());
        when(attendanceRecordRepository.countTotalCrossGroupVisitorsFinalizedSlots(isNull(), isNull(), eq(batch241.getId()), eq(groupC.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(0L);
        when(attendanceRecordRepository.countOutgoingCrossGroupVisitsPerStudent(isNull(), isNull(), eq(batch241.getId()), eq(groupC.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(Collections.emptyList());

        List<GroupAnalyticsResponse> groupStats = analyticsService.getGroupAttendanceAnalytics(
                null, null, batch241.getId(), null, null, null, null, null
        );
        assertEquals(3, groupStats.size());

        // Group A analytics check
        GroupAnalyticsResponse statA = groupStats.stream().filter(g -> g.getGroupId().equals(groupA.getId())).findFirst().orElseThrow();
        assertEquals("Group A", statA.getGroupName());
        assertEquals(34, statA.getTotalExpected());
        assertEquals(30, statA.getTotalPresent());
        assertEquals(4, statA.getTotalAbsent());
        assertEquals("88.2%", statA.getAttendancePercentage());
        assertEquals(0, statA.getVisitorsReceived());
        assertEquals(1, statA.getOutgoingVisits(), "Group A must record 1 outgoing visit for Student 1 who attended Group B");

        // Group B analytics check
        GroupAnalyticsResponse statB = groupStats.stream().filter(g -> g.getGroupId().equals(groupB.getId())).findFirst().orElseThrow();
        assertEquals("Group B", statB.getGroupName());
        assertEquals(33, statB.getTotalExpected());
        assertEquals(28, statB.getTotalPresent());
        assertEquals(5, statB.getTotalAbsent());
        assertEquals("84.8%", statB.getAttendancePercentage());
        assertEquals(1, statB.getVisitorsReceived(), "Group B must record 1 visitor received");
        assertEquals(0, statB.getOutgoingVisits());

        // Group C analytics check
        GroupAnalyticsResponse statC = groupStats.stream().filter(g -> g.getGroupId().equals(groupC.getId())).findFirst().orElseThrow();
        assertEquals("Group C", statC.getGroupName());
        assertEquals(0, statC.getTotalSessions());
        assertEquals("N/A", statC.getAttendancePercentage());

        // =====================================================================
        // STEP 7: EXPORTS VERIFICATION (Cross-Group Audit Report)
        // =====================================================================
        AttendanceRecord crossGroupRecord = recordsBySession.get(sessionGroupB.getId()).stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsCrossGroup()))
                .findFirst()
                .orElseThrow();

        when(attendanceRecordRepository.findCrossGroupAttendanceRecords(
                isNull(), isNull(), eq(batch241.getId()), isNull(), isNull(), isNull()
        )).thenReturn(List.of(crossGroupRecord));

        ReportData crossGroupReportData = reportService.generateCrossGroupReport(
                batch241.getId(), null, null, null, null, null, true
        );
        assertNotNull(crossGroupReportData);
        assertEquals(1, crossGroupReportData.getRows().size(), "Cross-Group report must contain 1 audited row");

        byte[] crossGroupCsvBytes = reportService.exportReport(crossGroupReportData, ReportExportFormat.CSV);
        assertNotNull(crossGroupCsvBytes);
        String csvContent = new String(crossGroupCsvBytes);

        // Verify CSV header and content
        assertTrue(csvContent.contains("Student ID"), "CSV must include Student ID header");
        assertTrue(csvContent.contains("Home Group"), "CSV must include Home Group header");
        assertTrue(csvContent.contains("Session Group"), "CSV must include Session Group header");
        assertTrue(csvContent.contains("STU0001"), "CSV must include Student 1 ID");
        assertTrue(csvContent.contains("Group A"), "CSV must include Student 1 Home Group A");
        assertTrue(csvContent.contains("Group B"), "CSV must include Session Group B");
    }
}
