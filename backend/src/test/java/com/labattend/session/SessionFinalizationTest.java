package com.labattend.session;

import com.labattend.dto.request.AttendanceCorrectionRequest;
import com.labattend.dto.request.AttendanceScanRequest;
import com.labattend.dto.request.SessionFinalizeRequest;
import com.labattend.dto.response.AttendanceRecordResponse;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SessionFinalizationTest {

    @Mock
    private LabSessionRepository labSessionRepository;
    @Mock
    private LecturerRepository lecturerRepository;
    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private BatchRepository batchRepository;
    @Mock
    private com.labattend.repository.LabGroupRepository labGroupRepository;
    @Mock
    private LaboratoryHallRepository laboratoryHallRepository;
    @Mock
    private LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository;
    @Mock
    private StudentRepository studentRepository;
    @Mock
    private SessionStudentRepository sessionStudentRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private com.labattend.service.QrCodeService qrCodeService;

    private LabSessionService labSessionService;
    private AttendanceService attendanceService;

    private UUID userId;
    private User lecturerUser;
    private Lecturer lecturer;
    private LabSession activeSession;
    private LabSession finalizedSession;

    @BeforeEach
    void setUp() {
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

        userId = UUID.randomUUID();
        lecturerUser = User.builder()
                .email("lecturer@test.com")
                .fullName("Dr. Alan Turing")
                .role(Role.LECTURER)
                .build();
        lecturerUser.setId(userId);

        lecturer = Lecturer.builder()
                .user(lecturerUser)
                .staffId("LEC001")
                .fullName("Dr. Alan Turing")
                .build();
        lecturer.setId(UUID.randomUUID());

        activeSession = LabSession.builder()
                .sessionCode("SES-CS101-261026-ABCD")
                .lecturer(lecturer)
                .sessionDate(LocalDate.now())
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .status(SessionStatus.ACTIVE)
                .actualStartedAt(OffsetDateTime.now())
                .build();
        activeSession.setId(UUID.randomUUID());

        finalizedSession = LabSession.builder()
                .sessionCode("SES-CS101-261026-WXYZ")
                .lecturer(lecturer)
                .sessionDate(LocalDate.now())
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .status(SessionStatus.FINALIZED)
                .actualStartedAt(OffsetDateTime.now().minusHours(2))
                .finalizedAt(OffsetDateTime.now())
                .build();
        finalizedSession.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Finalize creates correct ABSENT records for all unmarked expected students")
    void testFinalize_CreatesCorrectAbsents() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));
        when(labSessionRepository.findByIdWithPessimisticLock(activeSession.getId())).thenReturn(Optional.of(activeSession));

        // Create 40 expected students
        List<SessionStudent> sessionStudents = new ArrayList<>();
        List<AttendanceRecord> presentRecords = new ArrayList<>();

        for (int i = 1; i <= 40; i++) {
            Student s = Student.builder()
                    .studentId(String.format("STU%03d", i))
                    .fullName("Student " + i)
                    .build();
            s.setId(UUID.randomUUID());

            SessionStudent ss = SessionStudent.builder()
                    .session(activeSession)
                    .student(s)
                    .build();
            ss.setId(UUID.randomUUID());
            sessionStudents.add(ss);

            // First 35 students are marked PRESENT
            if (i <= 35) {
                AttendanceRecord ar = AttendanceRecord.builder()
                        .student(s)
                        .session(activeSession)
                        .status(AttendanceStatus.PRESENT)
                        .method(AttendanceMethod.QR_SCAN)
                        .markedAt(OffsetDateTime.now())
                        .build();
                ar.setId(UUID.randomUUID());
                presentRecords.add(ar);
            }
        }

        when(sessionStudentRepository.findBySessionId(activeSession.getId())).thenReturn(sessionStudents);
        when(attendanceRecordRepository.findBySessionId(activeSession.getId())).thenReturn(presentRecords);
        when(labSessionRepository.save(any(LabSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        when(sessionStudentRepository.countBySessionId(activeSession.getId())).thenReturn(40L);
        when(attendanceRecordRepository.countBySessionIdAndStatusIn(eq(activeSession.getId()), any())).thenReturn(35L);
        when(attendanceRecordRepository.countBySessionIdAndStatus(eq(activeSession.getId()), eq(AttendanceStatus.ABSENT))).thenReturn(5L);

        SessionFinalizeRequest request = new SessionFinalizeRequest("Class completed successfully");
        SessionSummaryResponse response = labSessionService.finalizeSession(userId, activeSession.getId(), request);

        // Verify saveAll was called with exactly 5 absent records
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AttendanceRecord>> captor = ArgumentCaptor.forClass(List.class);
        verify(attendanceRecordRepository).saveAll(captor.capture());
        List<AttendanceRecord> savedAbsents = captor.getValue();

        assertEquals(5, savedAbsents.size());
        for (AttendanceRecord ar : savedAbsents) {
            assertEquals(AttendanceStatus.ABSENT, ar.getStatus());
            assertEquals(AttendanceMethod.MANUAL, ar.getMethod());
            assertEquals("System session finalization: student was absent", ar.getJustificationNotes());
            assertFalse(ar.getIsCorrected());
        }

        assertEquals(SessionStatus.FINALIZED.name(), response.getStatus());
        assertTrue(response.isFinalized());
        assertEquals(40L, response.getExpectedStudentCount());
        assertEquals(35L, response.getPresentCount());
        assertEquals(5L, response.getAbsentCount());
        assertEquals(0L, response.getUnmarkedCount());
        assertEquals("87.5%", response.getAttendancePercentage());

        verify(auditLogService).logAction(eq("LabSession"), eq(activeSession.getId()), eq("SESSION_FINALIZED"), any(), any());
    }

    @Test
    @DisplayName("Double finalize is rejected with BadRequestException")
    void testDoubleFinalize_Rejected() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));
        when(labSessionRepository.findByIdWithPessimisticLock(finalizedSession.getId())).thenReturn(Optional.of(finalizedSession));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                labSessionService.finalizeSession(userId, finalizedSession.getId(), new SessionFinalizeRequest("Again"))
        );

        assertTrue(ex.getMessage().contains("Only ACTIVE sessions can be finalized"));
        verify(attendanceRecordRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("QR Scan after finalize is rejected with Attendance Is Closed")
    void testScanAfterFinalize_Rejected() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(finalizedSession.getId())).thenReturn(Optional.of(finalizedSession));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));

        AttendanceScanRequest request = new AttendanceScanRequest("STU001");

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                attendanceService.scanQrAttendance(userId, finalizedSession.getId(), request)
        );

        assertTrue(ex.getMessage().contains("Attendance Is Closed for This Session"));
        verify(attendanceRecordRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rollback on failure during finalize propagates exception")
    void testRollbackOnFailure() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));
        when(labSessionRepository.findByIdWithPessimisticLock(activeSession.getId())).thenReturn(Optional.of(activeSession));

        Student s = Student.builder().studentId("STU001").fullName("Student 1").build();
        s.setId(UUID.randomUUID());
        SessionStudent ss = SessionStudent.builder().session(activeSession).student(s).build();

        when(sessionStudentRepository.findBySessionId(activeSession.getId())).thenReturn(List.of(ss));
        when(attendanceRecordRepository.findBySessionId(activeSession.getId())).thenReturn(Collections.emptyList());

        // Simulate database crash on saveAll
        doThrow(new RuntimeException("Database connection terminated during saveAll"))
                .when(attendanceRecordRepository).saveAll(any());

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                labSessionService.finalizeSession(userId, activeSession.getId(), new SessionFinalizeRequest())
        );

        assertEquals("Database connection terminated during saveAll", ex.getMessage());
        // Lab session save and audit log must not have occurred
        verify(labSessionRepository, never()).save(any());
        verify(auditLogService, never()).logAction(any(), any(), eq("SESSION_FINALIZED"), any(), any());
    }

    @Test
    @DisplayName("Post-finalization correction requires mandatory reason and is audited")
    void testCorrectionRequiresReason_AndAudited() {
        Student s = Student.builder().studentId("STU001").fullName("Student 1").build();
        s.setId(UUID.randomUUID());

        AttendanceRecord record = AttendanceRecord.builder()
                .student(s)
                .session(finalizedSession)
                .status(AttendanceStatus.ABSENT)
                .method(AttendanceMethod.MANUAL)
                .markedAt(OffsetDateTime.now().minusHours(1))
                .isCorrected(false)
                .build();
        record.setId(UUID.randomUUID());

        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));
        when(labSessionRepository.findById(finalizedSession.getId())).thenReturn(Optional.of(finalizedSession));
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));

        // 1. Missing reason is rejected
        AttendanceCorrectionRequest blankReasonReq = new AttendanceCorrectionRequest(AttendanceStatus.PRESENT, "   ");
        BadRequestException exBlank = assertThrows(BadRequestException.class, () ->
                attendanceService.correctAttendanceRecord(userId, finalizedSession.getId(), record.getId(), blankReasonReq, false)
        );
        assertTrue(exBlank.getMessage().contains("justification reason is required"));

        // 2. Valid reason succeeds, sets isCorrected, and writes audit log
        when(attendanceRecordRepository.findById(record.getId())).thenReturn(Optional.of(record));
        when(attendanceRecordRepository.save(any(AttendanceRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AttendanceCorrectionRequest validReq = new AttendanceCorrectionRequest(
                AttendanceStatus.PRESENT,
                "Medical certificate verified by department"
        );
        AttendanceRecordResponse response = attendanceService.correctAttendanceRecord(
                userId, finalizedSession.getId(), record.getId(), validReq, false
        );

        assertEquals(AttendanceStatus.PRESENT.name(), response.getStatus());
        assertTrue(response.getIsCorrected());
        assertEquals(AttendanceStatus.ABSENT.name(), response.getPreviousStatus());
        assertEquals("Medical certificate verified by department", response.getJustificationNotes());
        assertNotNull(response.getCorrectedAt());

        verify(auditLogService).logAction(
                eq("AttendanceRecord"),
                eq(record.getId()),
                eq("ATTENDANCE_CORRECTION"),
                any(),
                any()
        );
    }

    @Test
    @DisplayName("Percentage calculation correctly yields 35/40 = 87.5%")
    void testAttendancePercentageCalculation() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(finalizedSession.getId())).thenReturn(Optional.of(finalizedSession));
        when(sessionStudentRepository.countBySessionId(finalizedSession.getId())).thenReturn(40L);
        when(attendanceRecordRepository.countBySessionIdAndStatusIn(eq(finalizedSession.getId()), any())).thenReturn(35L);
        when(attendanceRecordRepository.countBySessionIdAndStatus(eq(finalizedSession.getId()), eq(AttendanceStatus.ABSENT))).thenReturn(5L);

        SessionSummaryResponse summary = labSessionService.getSessionSummary(userId, finalizedSession.getId(), false);

        assertEquals(40L, summary.getExpectedStudentCount());
        assertEquals(35L, summary.getPresentCount());
        assertEquals(5L, summary.getAbsentCount());
        assertEquals("87.5%", summary.getAttendancePercentage());
    }

    @Test
    @DisplayName("Zero expected students correctly yields N/A")
    void testZeroExpected_GivesNA() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(finalizedSession.getId())).thenReturn(Optional.of(finalizedSession));
        when(sessionStudentRepository.countBySessionId(finalizedSession.getId())).thenReturn(0L);
        when(attendanceRecordRepository.countBySessionIdAndStatusIn(eq(finalizedSession.getId()), any())).thenReturn(0L);
        when(attendanceRecordRepository.countBySessionIdAndStatus(eq(finalizedSession.getId()), eq(AttendanceStatus.ABSENT))).thenReturn(0L);

        SessionSummaryResponse summary = labSessionService.getSessionSummary(userId, finalizedSession.getId(), false);

        assertEquals(0L, summary.getExpectedStudentCount());
        assertEquals(0L, summary.getPresentCount());
        assertEquals(0L, summary.getAbsentCount());
        assertEquals("N/A", summary.getAttendancePercentage());
    }
}
