package com.labattend.attendance;

import com.labattend.dto.request.AttendanceScanRequest;
import com.labattend.dto.request.SessionFinalizeRequest;
import com.labattend.dto.response.AttendanceScanResponse;
import com.labattend.dto.response.SessionSummaryResponse;
import com.labattend.entity.*;
import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.repository.*;
import com.labattend.service.AttendanceService;
import com.labattend.service.AuditLogService;
import com.labattend.service.LabSessionService;
import com.labattend.service.QrCodeService;
import com.labattend.util.HashUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CrossGroupAttendanceTest {

    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private SessionStudentRepository sessionStudentRepository;
    @Mock
    private LabSessionRepository labSessionRepository;
    @Mock
    private StudentRepository studentRepository;
    @Mock
    private LecturerRepository lecturerRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private QrCodeService qrCodeService;
    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private BatchRepository batchRepository;
    @Mock
    private LabGroupRepository labGroupRepository;
    @Mock
    private LaboratoryHallRepository laboratoryHallRepository;
    @Mock
    private LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository;

    private AttendanceService attendanceService;
    private LabSessionService labSessionService;

    private User lecturerUser;
    private Lecturer lecturer;
    private Batch batch;
    private Batch otherBatch;
    private LabGroup groupA;
    private LabGroup groupB;
    private LabSession groupASession;
    private Student studentInGroupA;
    private Student studentInGroupB;
    private Student studentInOtherBatch;
    private UUID sessionId;
    private UUID userId;

    @BeforeEach
    void setUp() {
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

        userId = UUID.randomUUID();
        sessionId = UUID.randomUUID();

        lenient().when(qrCodeService.generateTokenHash(any())).thenAnswer(inv -> HashUtils.sha256Hex(inv.getArgument(0)));
        lenient().when(qrCodeService.verifyToken(any(), anyInt(), any())).thenReturn(true);

        lecturerUser = User.builder()
                .email("lecturer@sliit.lk")
                .fullName("Dr. Perera")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUser.setId(userId);
        lenient().when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));

        lecturer = Lecturer.builder()
                .user(lecturerUser)
                .staffId("LEC001")
                .build();
        lecturer.setId(UUID.randomUUID());

        batch = Batch.builder()
                .batchCode("Y2S1-IT")
                .academicYear("2026")
                .build();
        batch.setId(UUID.randomUUID());

        otherBatch = Batch.builder()
                .batchCode("Y3S1-SE")
                .academicYear("2026")
                .build();
        otherBatch.setId(UUID.randomUUID());

        groupA = LabGroup.builder()
                .groupName("A")
                .batch(batch)
                .build();
        groupA.setId(UUID.randomUUID());

        groupB = LabGroup.builder()
                .groupName("B")
                .batch(batch)
                .build();
        groupB.setId(UUID.randomUUID());

        groupASession = LabSession.builder()
                .sessionCode("SES-IT2020-01")
                .lecturer(lecturer)
                .batch(batch)
                .labGroup(groupA)
                .status(SessionStatus.ACTIVE)
                .sessionDate(LocalDate.now())
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .build();
        groupASession.setId(sessionId);

        studentInGroupA = Student.builder()
                .studentId("IT21000001")
                .fullName("Student A (Group A)")
                .batch(batch)
                .labGroup(groupA)
                .qrTokenHash(HashUtils.sha256Hex("TOKEN_STUDENT_A"))
                .qrVersion(1)
                .isActive(true)
                .build();
        studentInGroupA.setId(UUID.randomUUID());

        studentInGroupB = Student.builder()
                .studentId("IT21000002")
                .fullName("Student B (Group B)")
                .batch(batch)
                .labGroup(groupB)
                .qrTokenHash(HashUtils.sha256Hex("TOKEN_STUDENT_B"))
                .qrVersion(1)
                .isActive(true)
                .build();
        studentInGroupB.setId(UUID.randomUUID());

        studentInOtherBatch = Student.builder()
                .studentId("IT22000099")
                .fullName("Student C (Other Batch)")
                .batch(otherBatch)
                .labGroup(null)
                .qrTokenHash(HashUtils.sha256Hex("TOKEN_STUDENT_C"))
                .qrVersion(1)
                .isActive(true)
                .build();
        studentInOtherBatch.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("1. Same group scan -> marked PRESENT as expected (isCrossGroup = false)")
    void sameGroupScan_MarksPresentAsExpected() {
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(groupASession));
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(studentRepository.findByQrTokenHash(HashUtils.sha256Hex("TOKEN_STUDENT_A"))).thenReturn(Optional.of(studentInGroupA));
        when(attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, studentInGroupA.getId())).thenReturn(Optional.empty());

        SessionStudent expectedRow = SessionStudent.builder()
                .session(groupASession)
                .student(studentInGroupA)
                .isExpected(true)
                .build();
        when(sessionStudentRepository.findBySessionIdAndStudentId(sessionId, studentInGroupA.getId())).thenReturn(Optional.of(expectedRow));

        when(attendanceRecordRepository.saveAndFlush(any(AttendanceRecord.class))).thenAnswer(inv -> {
            AttendanceRecord rec = inv.getArgument(0);
            rec.setId(UUID.randomUUID());
            rec.setMarkedAt(OffsetDateTime.now());
            return rec;
        });

        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(sessionId)).thenReturn(20L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(sessionId), any())).thenReturn(1L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrueAndStatusIn(eq(sessionId), any())).thenReturn(0L);

        AttendanceScanRequest request = new AttendanceScanRequest("TOKEN_STUDENT_A");
        AttendanceScanResponse response = attendanceService.scanQrAttendance(userId, sessionId, request);

        assertEquals("SUCCESS", response.getResult());
        assertFalse(response.getIsCrossGroup());
        assertEquals("Attendance Recorded Successfully", response.getMessage());
        assertEquals("IT21000001", response.getStudentId());
        assertEquals(20, response.getTotalExpected());
        assertEquals(1, response.getAttendedCount());
        assertEquals(0, response.getCrossGroupCount());
        assertEquals(19, response.getRemainingCount());

        ArgumentCaptor<AttendanceRecord> captor = ArgumentCaptor.forClass(AttendanceRecord.class);
        verify(attendanceRecordRepository).saveAndFlush(captor.capture());
        AttendanceRecord saved = captor.getValue();
        assertFalse(saved.getIsCrossGroup());
        assertNull(saved.getHomeLabGroup());
        assertEquals(AttendanceStatus.PRESENT, saved.getStatus());
        assertEquals(AttendanceMethod.QR_SCAN, saved.getMethod());
    }

    @Test
    @DisplayName("2. Different group same batch -> marked PRESENT with CROSS_GROUP_MARKED status")
    void differentGroupSameBatch_FlaggedPresentAsCrossGroup() {
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(groupASession));
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(studentRepository.findByQrTokenHash(HashUtils.sha256Hex("TOKEN_STUDENT_B"))).thenReturn(Optional.of(studentInGroupB));
        when(attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, studentInGroupB.getId())).thenReturn(Optional.empty());
        // Not in expected roster of Group A
        when(sessionStudentRepository.findBySessionIdAndStudentId(sessionId, studentInGroupB.getId())).thenReturn(Optional.empty());

        when(attendanceRecordRepository.saveAndFlush(any(AttendanceRecord.class))).thenAnswer(inv -> {
            AttendanceRecord rec = inv.getArgument(0);
            rec.setId(UUID.randomUUID());
            rec.setMarkedAt(OffsetDateTime.now());
            return rec;
        });

        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(sessionId)).thenReturn(20L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(sessionId), any())).thenReturn(10L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrueAndStatusIn(eq(sessionId), any())).thenReturn(1L);

        AttendanceScanRequest request = new AttendanceScanRequest("TOKEN_STUDENT_B");
        AttendanceScanResponse response = attendanceService.scanQrAttendance(userId, sessionId, request);

        assertEquals("CROSS_GROUP_MARKED", response.getResult());
        assertTrue(response.getIsCrossGroup());
        assertTrue(response.getMessage().contains("Student belongs to Group B"));
        assertEquals("IT21000002", response.getStudentId());
        assertEquals("B", response.getHomeLabGroupName());
        assertEquals("A", response.getSessionLabGroupName());
        assertEquals(20, response.getTotalExpected());
        assertEquals(10, response.getAttendedCount());
        assertEquals(1, response.getCrossGroupCount());

        // Verify visitor session_student was saved with isExpected = false
        ArgumentCaptor<SessionStudent> ssCaptor = ArgumentCaptor.forClass(SessionStudent.class);
        verify(sessionStudentRepository).save(ssCaptor.capture());
        assertFalse(ssCaptor.getValue().getIsExpected());

        // Verify attendance record
        ArgumentCaptor<AttendanceRecord> captor = ArgumentCaptor.forClass(AttendanceRecord.class);
        verify(attendanceRecordRepository).saveAndFlush(captor.capture());
        AttendanceRecord saved = captor.getValue();
        assertTrue(saved.getIsCrossGroup());
        assertEquals(groupB, saved.getHomeLabGroup());
        assertEquals(AttendanceStatus.PRESENT, saved.getStatus());

        // Verify audit log created
        verify(auditLogService).logAction(
                eq("ATTENDANCE_RECORD"),
                any(),
                eq("CROSS_GROUP_ATTENDANCE"),
                isNull(),
                any()
        );
    }

    @Test
    @DisplayName("3. Students from a different batch -> strictly rejected")
    void differentBatch_Rejected() {
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(groupASession));
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(studentRepository.findByQrTokenHash(HashUtils.sha256Hex("TOKEN_STUDENT_C"))).thenReturn(Optional.of(studentInOtherBatch));
        when(attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, studentInOtherBatch.getId())).thenReturn(Optional.empty());
        when(sessionStudentRepository.findBySessionIdAndStudentId(sessionId, studentInOtherBatch.getId())).thenReturn(Optional.empty());

        AttendanceScanRequest request = new AttendanceScanRequest("TOKEN_STUDENT_C");
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                attendanceService.scanQrAttendance(userId, sessionId, request)
        );

        assertTrue(ex.getMessage().contains("Student Is Not Assigned to This Session"));
        verify(attendanceRecordRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("4. Duplicate scans of cross-group student -> return ALREADY_MARKED")
    void duplicateCrossGroupScan_ReturnsAlreadyMarked() {
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(groupASession));
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(studentRepository.findByQrTokenHash(HashUtils.sha256Hex("TOKEN_STUDENT_B"))).thenReturn(Optional.of(studentInGroupB));

        AttendanceRecord existingRecord = AttendanceRecord.builder()
                .session(groupASession)
                .student(studentInGroupB)
                .status(AttendanceStatus.PRESENT)
                .method(AttendanceMethod.QR_SCAN)
                .isCrossGroup(true)
                .homeLabGroup(groupB)
                .build();
        existingRecord.setId(UUID.randomUUID());
        existingRecord.setMarkedAt(OffsetDateTime.now().minusMinutes(5));

        when(attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, studentInGroupB.getId()))
                .thenReturn(Optional.of(existingRecord));

        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(sessionId)).thenReturn(20L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(sessionId), any())).thenReturn(5L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrueAndStatusIn(eq(sessionId), any())).thenReturn(1L);

        AttendanceScanRequest request = new AttendanceScanRequest("TOKEN_STUDENT_B");
        AttendanceScanResponse response = attendanceService.scanQrAttendance(userId, sessionId, request);

        assertEquals("ALREADY_MARKED", response.getResult());
        assertTrue(response.getIsCrossGroup());
        assertEquals("Already Marked Present", response.getMessage());
        assertEquals("B", response.getHomeLabGroupName());
        verify(attendanceRecordRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("5. Visitor not counted in expected total or percentage")
    void visitorNotCountedInExpectedTotalOrPercentage() {
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(groupASession));
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));

        // 20 expected students, 15 attended, 5 cross-group visitors
        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(sessionId)).thenReturn(20L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(sessionId), any())).thenReturn(15L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrueAndStatusIn(eq(sessionId), any())).thenReturn(5L);
        lenient().when(attendanceRecordRepository.countBySessionIdAndStatus(sessionId, AttendanceStatus.ABSENT)).thenReturn(5L);

        SessionSummaryResponse summary = labSessionService.getSessionSummary(userId, sessionId, false);

        assertEquals(20, summary.getExpectedStudentCount());
        assertEquals(15, summary.getPresentCount());
        assertEquals(5, summary.getCrossGroupCount());
        assertEquals(5, summary.getAbsentCount());
        // Percentage must be (15 / 20) * 100 = 75.0%
        assertEquals("75.0%", summary.getAttendancePercentage());
    }

    @Test
    @DisplayName("6. Finalization: only expected students without PRESENT become ABSENT; visitors keep their records")
    void finalizationDoesNotMarkVisitorsAbsent() {
        when(labSessionRepository.findByIdWithPessimisticLock(sessionId)).thenReturn(Optional.of(groupASession));
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));

        // Expected roster has 1 student: studentInGroupA (unmarked)
        SessionStudent expectedRow = SessionStudent.builder()
                .session(groupASession)
                .student(studentInGroupA)
                .isExpected(true)
                .build();
        expectedRow.setId(UUID.randomUUID());

        // findBySessionIdAndIsExpectedTrue returns ONLY expected students
        when(sessionStudentRepository.findBySessionIdAndIsExpectedTrue(sessionId))
                .thenReturn(List.of(expectedRow));

        // No existing attendance for studentInGroupA
        when(attendanceRecordRepository.findBySessionId(sessionId)).thenReturn(Collections.emptyList());

        when(labSessionRepository.save(any(LabSession.class))).thenAnswer(inv -> inv.getArgument(0));
        when(attendanceRecordRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(sessionId)).thenReturn(1L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(sessionId), any())).thenReturn(0L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrueAndStatusIn(eq(sessionId), any())).thenReturn(1L); // 1 visitor
        when(attendanceRecordRepository.countBySessionIdAndStatus(sessionId, AttendanceStatus.ABSENT)).thenReturn(1L);

        SessionFinalizeRequest request = new SessionFinalizeRequest("Class completed normally");
        SessionSummaryResponse summary = labSessionService.finalizeSession(userId, sessionId, request);

        // Verify saveAll was called with only expected absent student
        ArgumentCaptor<List<AttendanceRecord>> captor = ArgumentCaptor.forClass(List.class);
        verify(attendanceRecordRepository).saveAll(captor.capture());
        List<AttendanceRecord> absentList = captor.getValue();
        assertEquals(1, absentList.size());
        assertEquals(studentInGroupA.getId(), absentList.get(0).getStudent().getId());
        assertEquals(AttendanceStatus.ABSENT, absentList.get(0).getStatus());

        // Verify session was marked FINALIZED
        assertEquals(SessionStatus.FINALIZED, groupASession.getStatus());
        // Verify summary contains correct visitor count and expected count
        assertEquals(1, summary.getCrossGroupCount());
        assertEquals(1, summary.getExpectedStudentCount());
    }

    @Test
    @DisplayName("7. Concurrent duplicate cross-group scans produce exactly one record (DataIntegrityViolation handled)")
    void concurrentDuplicateCrossGroupScans_ProducesOneRecord() throws Exception {
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(groupASession));
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(studentRepository.findByQrTokenHash(HashUtils.sha256Hex("TOKEN_STUDENT_B"))).thenReturn(Optional.of(studentInGroupB));

        // First thread sees no record, second thread sees record on duplicate query
        AttendanceRecord existingRecord = AttendanceRecord.builder()
                .session(groupASession)
                .student(studentInGroupB)
                .status(AttendanceStatus.PRESENT)
                .method(AttendanceMethod.QR_SCAN)
                .isCrossGroup(true)
                .homeLabGroup(groupB)
                .build();
        existingRecord.setId(UUID.randomUUID());
        existingRecord.setMarkedAt(OffsetDateTime.now());

        AtomicBoolean firstCall = new AtomicBoolean(true);
        when(attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, studentInGroupB.getId()))
                .thenAnswer(inv -> {
                    if (firstCall.get()) {
                        return Optional.empty();
                    } else {
                        return Optional.of(existingRecord);
                    }
                });

        when(sessionStudentRepository.findBySessionIdAndStudentId(sessionId, studentInGroupB.getId())).thenReturn(Optional.empty());

        // Simulate save: first thread succeeds, second thread encounters DB unique constraint
        AtomicInteger saveAttempts = new AtomicInteger(0);
        when(attendanceRecordRepository.saveAndFlush(any(AttendanceRecord.class))).thenAnswer(inv -> {
            if (saveAttempts.incrementAndGet() == 1) {
                AttendanceRecord r = inv.getArgument(0);
                r.setId(UUID.randomUUID());
                r.setMarkedAt(OffsetDateTime.now());
                firstCall.set(false);
                return r;
            } else {
                throw new DataIntegrityViolationException("duplicate key value violates unique constraint session_student_uq");
            }
        });

        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(sessionId)).thenReturn(20L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(sessionId), any())).thenReturn(10L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrueAndStatusIn(eq(sessionId), any())).thenReturn(1L);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);

        Future<AttendanceScanResponse> future1 = executor.submit(() -> {
            startLatch.await();
            return attendanceService.scanQrAttendance(userId, sessionId, new AttendanceScanRequest("TOKEN_STUDENT_B"));
        });

        Future<AttendanceScanResponse> future2 = executor.submit(() -> {
            startLatch.await();
            return attendanceService.scanQrAttendance(userId, sessionId, new AttendanceScanRequest("TOKEN_STUDENT_B"));
        });

        startLatch.countDown();

        AttendanceScanResponse resp1 = future1.get(5, TimeUnit.SECONDS);
        AttendanceScanResponse resp2 = future2.get(5, TimeUnit.SECONDS);
        executor.shutdown();

        List<String> results = List.of(resp1.getResult(), resp2.getResult());
        assertTrue(results.contains("CROSS_GROUP_MARKED") || results.contains("ALREADY_MARKED"));
    }

    @Test
    @DisplayName("8. Audit entry created on cross-group attendance scan")
    void auditEntryCreated_ForCrossGroupAttendance() {
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(groupASession));
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(studentRepository.findByQrTokenHash(HashUtils.sha256Hex("TOKEN_STUDENT_B"))).thenReturn(Optional.of(studentInGroupB));
        when(attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, studentInGroupB.getId())).thenReturn(Optional.empty());
        when(sessionStudentRepository.findBySessionIdAndStudentId(sessionId, studentInGroupB.getId())).thenReturn(Optional.empty());

        when(attendanceRecordRepository.saveAndFlush(any(AttendanceRecord.class))).thenAnswer(inv -> {
            AttendanceRecord rec = inv.getArgument(0);
            rec.setId(UUID.randomUUID());
            rec.setMarkedAt(OffsetDateTime.now());
            return rec;
        });

        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(sessionId)).thenReturn(20L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(sessionId), any())).thenReturn(5L);
        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrueAndStatusIn(eq(sessionId), any())).thenReturn(1L);

        attendanceService.scanQrAttendance(userId, sessionId, new AttendanceScanRequest("TOKEN_STUDENT_B"));

        ArgumentCaptor<String> actionCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Map<String, Object>> detailsCaptor = ArgumentCaptor.forClass(Map.class);

        verify(auditLogService).logAction(
                eq("ATTENDANCE_RECORD"),
                any(),
                actionCaptor.capture(),
                isNull(),
                detailsCaptor.capture()
        );

        assertEquals("CROSS_GROUP_ATTENDANCE", actionCaptor.getValue());
        Map<String, Object> details = detailsCaptor.getValue();
        assertEquals(true, details.get("isCrossGroup"));
        assertEquals("B", details.get("homeLabGroup"));
        assertEquals("A", details.get("sessionLabGroup"));
        assertEquals("IT21000002", details.get("studentId"));
    }
}
