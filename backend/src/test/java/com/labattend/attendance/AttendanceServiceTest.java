package com.labattend.attendance;

import com.labattend.dto.request.AttendanceScanRequest;
import com.labattend.dto.request.ManualAttendanceRequest;
import com.labattend.dto.response.AttendanceScanResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.dto.response.SessionExpectedStudentResponse;
import com.labattend.entity.*;
import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.*;
import com.labattend.service.AttendanceService;
import com.labattend.service.AuditLogService;
import com.labattend.util.HashUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AttendanceServiceTest {

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
    private com.labattend.service.QrCodeService qrCodeService;

    @InjectMocks
    private AttendanceService attendanceService;

    private User lecturerUser;
    private Lecturer lecturer;
    private User otherLecturerUser;
    private Lecturer otherLecturer;
    private LabSession activeSession;
    private LabSession draftSession;
    private LabSession finalizedSession;
    private Student eligibleStudent;
    private Student ineligibleStudent;
    private UUID sessionId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        lenient().when(qrCodeService.generateTokenHash(any())).thenAnswer(inv -> HashUtils.sha256Hex(inv.getArgument(0)));
        lenient().when(qrCodeService.verifyToken(any(), anyInt(), any())).thenReturn(true);

        userId = UUID.randomUUID();
        sessionId = UUID.randomUUID();

        lecturerUser = User.builder()
                .email("lecturer@sliit.lk")
                .fullName("Dr. Perera")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUser.setId(userId);

        lecturer = Lecturer.builder()
                .user(lecturerUser)
                .staffId("LEC001")
                .build();
        lecturer.setId(UUID.randomUUID());

        UUID otherUserId = UUID.randomUUID();
        otherLecturerUser = User.builder()
                .email("other@sliit.lk")
                .fullName("Dr. Silva")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        otherLecturerUser.setId(otherUserId);

        otherLecturer = Lecturer.builder()
                .user(otherLecturerUser)
                .staffId("LEC002")
                .build();
        otherLecturer.setId(UUID.randomUUID());

        activeSession = LabSession.builder()
                .sessionCode("SES-IT1010-261026-A1B2")
                .lecturer(lecturer)
                .status(SessionStatus.ACTIVE)
                .sessionDate(LocalDate.now())
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .build();
        activeSession.setId(sessionId);

        draftSession = LabSession.builder()
                .sessionCode("SES-IT1010-261026-DRAFT")
                .lecturer(lecturer)
                .status(SessionStatus.DRAFT)
                .sessionDate(LocalDate.now())
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .build();
        draftSession.setId(UUID.randomUUID());

        finalizedSession = LabSession.builder()
                .sessionCode("SES-IT1010-261026-FINAL")
                .lecturer(lecturer)
                .status(SessionStatus.FINALIZED)
                .sessionDate(LocalDate.now())
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .build();
        finalizedSession.setId(UUID.randomUUID());

        eligibleStudent = Student.builder()
                .studentId("IT21001234")
                .fullName("Kasun Jayawardena")
                .email("it21001234@my.sliit.lk")
                .qrTokenHash(HashUtils.sha256Hex("QR-TOKEN-1234"))
                .isActive(true)
                .build();
        eligibleStudent.setId(UUID.randomUUID());

        ineligibleStudent = Student.builder()
                .studentId("IT21999999")
                .fullName("Unknown Student")
                .email("it21999999@my.sliit.lk")
                .qrTokenHash(HashUtils.sha256Hex("QR-TOKEN-9999"))
                .isActive(true)
                .build();
        ineligibleStudent.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Valid QR Scan: marks student present and returns updated counts")
    void testValidQrScan_Success() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(activeSession));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));
        when(studentRepository.findByQrTokenHash(HashUtils.sha256Hex("QR-TOKEN-1234"))).thenReturn(Optional.of(eligibleStudent));
        when(sessionStudentRepository.existsBySessionIdAndStudentId(sessionId, eligibleStudent.getId())).thenReturn(true);
        when(attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, eligibleStudent.getId())).thenReturn(Optional.empty());
        when(sessionStudentRepository.countBySessionId(sessionId)).thenReturn(30L);
        when(attendanceRecordRepository.countBySessionIdAndStatusIn(eq(sessionId), any())).thenReturn(1L);

        AttendanceScanRequest req = new AttendanceScanRequest("QR-TOKEN-1234");
        AttendanceScanResponse response = attendanceService.scanQrAttendance(userId, sessionId, req);

        assertNotNull(response);
        assertEquals("SUCCESS", response.getResult());
        assertEquals("Attendance Recorded Successfully", response.getMessage());
        assertEquals("IT21001234", response.getStudentId());
        assertEquals("Kasun Jayawardena", response.getStudentName());
        assertEquals(30L, response.getTotalExpected());
        assertEquals(1L, response.getAttendedCount());
        assertEquals(29L, response.getRemainingCount());
        verify(attendanceRecordRepository, times(1)).saveAndFlush(any(AttendanceRecord.class));
    }

    @Test
    @DisplayName("Unknown QR Token: returns Invalid QR Code error and creates no record")
    void testUnknownQr_ThrowsBadRequest() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(activeSession));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));
        when(studentRepository.findByQrTokenHash(any())).thenReturn(Optional.empty());

        AttendanceScanRequest req = new AttendanceScanRequest("UNKNOWN_BADGE");
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                attendanceService.scanQrAttendance(userId, sessionId, req));

        assertTrue(ex.getMessage().contains("Invalid QR Code — Student Not Found"));
        verify(attendanceRecordRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Duplicate Scan: returns Already Marked Present without creating duplicate record")
    void testDuplicateScan_ReturnsAlreadyMarked() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(activeSession));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));
        when(studentRepository.findByQrTokenHash(any())).thenReturn(Optional.of(eligibleStudent));
        lenient().when(sessionStudentRepository.existsBySessionIdAndStudentId(sessionId, eligibleStudent.getId())).thenReturn(true);

        OffsetDateTime firstScanTime = OffsetDateTime.now().minusMinutes(5);
        AttendanceRecord existing = AttendanceRecord.builder()
                .session(activeSession)
                .student(eligibleStudent)
                .status(AttendanceStatus.PRESENT)
                .method(AttendanceMethod.QR_SCAN)
                .markedAt(firstScanTime)
                .build();
        when(attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, eligibleStudent.getId())).thenReturn(Optional.of(existing));
        when(sessionStudentRepository.countBySessionId(sessionId)).thenReturn(30L);
        when(attendanceRecordRepository.countBySessionIdAndStatusIn(eq(sessionId), any())).thenReturn(1L);

        AttendanceScanRequest req = new AttendanceScanRequest("QR-TOKEN-1234");
        AttendanceScanResponse response = attendanceService.scanQrAttendance(userId, sessionId, req);

        assertNotNull(response);
        assertEquals("ALREADY_MARKED", response.getResult());
        assertEquals("Already Marked Present", response.getMessage());
        assertEquals("IT21001234", response.getStudentId());
        assertEquals(firstScanTime, response.getScannedAt());
        verify(attendanceRecordRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Ineligible Student: student not in session_students returns error")
    void testIneligibleStudent_ThrowsBadRequest() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(activeSession));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));
        when(studentRepository.findByQrTokenHash(any())).thenReturn(Optional.of(ineligibleStudent));
        when(sessionStudentRepository.existsBySessionIdAndStudentId(sessionId, ineligibleStudent.getId())).thenReturn(false);

        AttendanceScanRequest req = new AttendanceScanRequest("QR-TOKEN-9999");
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                attendanceService.scanQrAttendance(userId, sessionId, req));

        assertTrue(ex.getMessage().contains("Student Is Not Assigned to This Session"));
        verify(attendanceRecordRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Scan on DRAFT session: rejected with Attendance Is Closed")
    void testScanOnDraftSession_ThrowsBadRequest() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(draftSession.getId())).thenReturn(Optional.of(draftSession));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));

        AttendanceScanRequest req = new AttendanceScanRequest("IT21001234");
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                attendanceService.scanQrAttendance(userId, draftSession.getId(), req));

        assertTrue(ex.getMessage().contains("Attendance Is Closed for This Session"));
        verify(attendanceRecordRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Scan on FINALIZED session: rejected with Attendance Is Closed")
    void testScanOnFinalizedSession_ThrowsBadRequest() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(finalizedSession.getId())).thenReturn(Optional.of(finalizedSession));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));

        AttendanceScanRequest req = new AttendanceScanRequest("IT21001234");
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                attendanceService.scanQrAttendance(userId, finalizedSession.getId(), req));

        assertTrue(ex.getMessage().contains("Attendance Is Closed for This Session"));
        verify(attendanceRecordRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Another Lecturer's Session: unauthorized access rejected")
    void testAnotherLecturersSession_ThrowsBadRequest() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(otherLecturer));
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(activeSession));

        AttendanceScanRequest req = new AttendanceScanRequest("IT21001234");
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                attendanceService.scanQrAttendance(userId, sessionId, req));

        assertTrue(ex.getMessage().contains("not authorized to conduct or scan attendance"));
        verify(attendanceRecordRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Concurrent Duplicate Requests: constraint violation returns Already Marked Present")
    void testConcurrentDuplicateScan_ConstraintViolationReturnsAlreadyMarked() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(activeSession));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));
        when(studentRepository.findByQrTokenHash(any())).thenReturn(Optional.of(eligibleStudent));
        when(sessionStudentRepository.existsBySessionIdAndStudentId(sessionId, eligibleStudent.getId())).thenReturn(true);
        when(attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, eligibleStudent.getId()))
                .thenReturn(Optional.empty()) // Initial check says not present
                .thenReturn(Optional.of(AttendanceRecord.builder()
                        .session(activeSession)
                        .student(eligibleStudent)
                        .status(AttendanceStatus.PRESENT)
                        .method(AttendanceMethod.QR_SCAN)
                        .markedAt(OffsetDateTime.now())
                        .build())); // After conflict, returns row committed by winner
        when(attendanceRecordRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uq_attendance_records violation"));
        when(sessionStudentRepository.countBySessionId(sessionId)).thenReturn(30L);
        when(attendanceRecordRepository.countBySessionIdAndStatusIn(eq(sessionId), any())).thenReturn(1L);

        AttendanceScanRequest req = new AttendanceScanRequest("QR-TOKEN-1234");
        AttendanceScanResponse response = attendanceService.scanQrAttendance(userId, sessionId, req);

        assertNotNull(response);
        assertEquals("ALREADY_MARKED", response.getResult());
        assertEquals("Already Marked Present", response.getMessage());
        assertEquals("IT21001234", response.getStudentId());
    }

    @Test
    @DisplayName("Manual Attendance: requires mandatory justification reason")
    void testManualAttendance_RequiresReason() {
        ManualAttendanceRequest reqWithoutReason = new ManualAttendanceRequest(eligibleStudent.getId(), null, "   ");
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                attendanceService.recordManualAttendance(userId, sessionId, reqWithoutReason));

        assertTrue(ex.getMessage().contains("A justification reason is required"));
    }

    @Test
    @DisplayName("Manual Attendance: records PRESENT with method MANUAL and logs audit")
    void testManualAttendance_Success() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(activeSession));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));
        when(studentRepository.findById(eligibleStudent.getId())).thenReturn(Optional.of(eligibleStudent));
        when(sessionStudentRepository.existsBySessionIdAndStudentId(sessionId, eligibleStudent.getId())).thenReturn(true);
        when(attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, eligibleStudent.getId())).thenReturn(Optional.empty());
        when(attendanceRecordRepository.saveAndFlush(any())).thenAnswer(inv -> {
            AttendanceRecord r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });
        when(sessionStudentRepository.countBySessionId(sessionId)).thenReturn(30L);
        when(attendanceRecordRepository.countBySessionIdAndStatusIn(eq(sessionId), any())).thenReturn(1L);

        ManualAttendanceRequest req = new ManualAttendanceRequest(
                eligibleStudent.getId(), null, "Student physical card damaged, verified via institutional portal"
        );
        AttendanceScanResponse response = attendanceService.recordManualAttendance(userId, sessionId, req);

        assertNotNull(response);
        assertEquals("SUCCESS", response.getResult());
        assertEquals("MANUAL", response.getMethod());
        verify(attendanceRecordRepository, times(1)).saveAndFlush(any(AttendanceRecord.class));
        verify(auditLogService, times(1)).logAction(eq("ATTENDANCE_RECORD"), any(), eq("MANUAL_ATTENDANCE"), isNull(), any());
    }
}
