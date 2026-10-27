package com.labattend.attendance;

import com.labattend.dto.request.AttendanceScanRequest;
import com.labattend.dto.response.AttendanceScanResponse;
import com.labattend.entity.*;
import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
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
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ConcurrentAttendanceScanTest {

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
    private LabSession activeSession;
    private Student eligibleStudent;
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

        activeSession = LabSession.builder()
                .sessionCode("SES-IT1010-261026-A1B2")
                .lecturer(lecturer)
                .status(SessionStatus.ACTIVE)
                .sessionDate(LocalDate.now())
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .build();
        activeSession.setId(sessionId);

        eligibleStudent = Student.builder()
                .studentId("IT21001234")
                .fullName("Kasun Jayawardena")
                .email("it21001234@my.sliit.lk")
                .qrTokenHash(HashUtils.sha256Hex("QR-TOKEN-1234"))
                .isActive(true)
                .build();
        eligibleStudent.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Concurrent Duplicate Scans: 10 threads scanning same student simultaneously -> Exactly 1 SUCCESS and 9 ALREADY_MARKED")
    void testConcurrentDuplicateScans_ThreadSafety() throws Exception {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(activeSession));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));
        when(studentRepository.findByQrTokenHash(any())).thenReturn(Optional.of(eligibleStudent));
        when(sessionStudentRepository.existsBySessionIdAndStudentId(sessionId, eligibleStudent.getId())).thenReturn(true);
        when(sessionStudentRepository.countBySessionId(sessionId)).thenReturn(40L);
        when(attendanceRecordRepository.countBySessionIdAndStatusIn(eq(sessionId), any())).thenReturn(1L);

        // Atomic flag simulating the winning database insert
        AtomicBoolean savedFirst = new AtomicBoolean(false);
        AttendanceRecord committedRecord = AttendanceRecord.builder()
                .session(activeSession)
                .student(eligibleStudent)
                .status(AttendanceStatus.PRESENT)
                .method(AttendanceMethod.QR_SCAN)
                .markedAt(OffsetDateTime.now())
                .build();
        committedRecord.setId(UUID.randomUUID());

        when(attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, eligibleStudent.getId()))
                .thenAnswer(inv -> savedFirst.get() ? Optional.of(committedRecord) : Optional.empty());

        when(attendanceRecordRepository.saveAndFlush(any())).thenAnswer(inv -> {
            if (savedFirst.compareAndSet(false, true)) {
                return committedRecord;
            } else {
                throw new DataIntegrityViolationException("duplicate key value violates unique constraint 'uq_attendance_records_session_student'");
            }
        });

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        List<AttendanceScanResponse> responses = new CopyOnWriteArrayList<>();
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger alreadyMarkedCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await(); // ensure simultaneous execution
                    AttendanceScanRequest req = new AttendanceScanRequest("QR-TOKEN-1234");
                    AttendanceScanResponse resp = attendanceService.scanQrAttendance(userId, sessionId, req);
                    responses.add(resp);

                    if ("SUCCESS".equals(resp.getResult())) {
                        successCount.incrementAndGet();
                    } else if ("ALREADY_MARKED".equals(resp.getResult())) {
                        alreadyMarkedCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    errorCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown(); // fire all threads at once!
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS), "All concurrent threads must finish within timeout");
        executor.shutdown();

        assertEquals(0, errorCount.get(), "Zero exceptions should be thrown to callers");
        assertEquals(threadCount, responses.size(), "All threads must receive a valid response");
        assertEquals(1, successCount.get(), "Exactly ONE thread must successfully insert PRESENT");
        assertEquals(9, alreadyMarkedCount.get(), "The other 9 concurrent threads must receive ALREADY_MARKED");
    }
}
