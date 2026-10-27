package com.labattend.session;

import com.labattend.dto.request.LabSessionCancelRequest;
import com.labattend.dto.request.LabSessionCreateRequest;
import com.labattend.dto.response.LabSessionResponse;
import com.labattend.entity.*;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.repository.*;
import com.labattend.service.AuditLogService;
import com.labattend.service.LabSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class LabSessionServiceTest {

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

    private LabSessionService labSessionService;

    private UUID userId;
    private UUID lecturerId;
    private Lecturer lecturer;
    private com.labattend.entity.Module module;
    private Batch batch;
    private LaboratoryHall hall;

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

        userId = UUID.randomUUID();
        lecturerId = UUID.randomUUID();

        User user = User.builder()
                .email("lecturer@test.com")
                .fullName("Dr. Bob")
                .role(Role.LECTURER)
                .build();
        user.setId(userId);

        lecturer = Lecturer.builder()
                .user(user)
                .staffId("LEC-001")
                .fullName("Dr. Bob")
                .department("Computing")
                .isActive(true)
                .build();
        lecturer.setId(lecturerId);

        module = com.labattend.entity.Module.builder()
                .moduleCode("CS301")
                .name("Database Systems")
                .isActive(true)
                .build();
        module.setId(UUID.randomUUID());

        batch = Batch.builder()
                .batchCode("Y2026-B1")
                .academicYear("2026")
                .isActive(true)
                .build();
        batch.setId(UUID.randomUUID());

        hall = LaboratoryHall.builder()
                .hallCode("LH-A")
                .name("Lab Hall Alpha")
                .capacity(60)
                .isActive(true)
                .build();
        hall.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Create Session -> Builds session_students from batch's active enrolled students and returns expectedStudentCount")
    void testCreateSessionBuildsExpectedStudentRoster() {
        // Arrange
        LocalDate date = LocalDate.now(LabSessionService.COLOMBO_ZONE).plusDays(2);
        LocalTime start = LocalTime.of(10, 0);
        LocalTime end = LocalTime.of(13, 0);

        LabSessionCreateRequest request = LabSessionCreateRequest.builder()
                .moduleId(module.getId())
                .batchId(batch.getId())
                .hallId(hall.getId())
                .sessionDate(date)
                .startTime(start)
                .endTime(end)
                .build();

        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(moduleRepository.findById(module.getId())).thenReturn(Optional.of(module));
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));
        when(laboratoryHallRepository.findById(hall.getId())).thenReturn(Optional.of(hall));

        when(lecturerModuleAssignmentRepository.isLecturerAssignedToModuleBatchAndGroup(lecturerId, module.getId(), batch.getId(), null))
                .thenReturn(true);

        when(labSessionRepository.findConflictingHallSessions(hall.getId(), date, start, end, null))
                .thenReturn(Collections.emptyList());
        when(labSessionRepository.findConflictingLecturerSessions(lecturerId, date, start, end, null))
                .thenReturn(Collections.emptyList());

        // 3 active enrolled students in this batch
        Student s1 = Student.builder().studentId("STU01").build();
        s1.setId(UUID.randomUUID());
        Student s2 = Student.builder().studentId("STU02").build();
        s2.setId(UUID.randomUUID());
        Student s3 = Student.builder().studentId("STU03").build();
        s3.setId(UUID.randomUUID());

        when(studentRepository.findByBatchIdAndIsActiveTrue(batch.getId()))
                .thenReturn(List.of(s1, s2, s3));

        when(labSessionRepository.save(any(LabSession.class))).thenAnswer(i -> {
            LabSession s = i.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });

        // Act
        LabSessionResponse response = labSessionService.createSession(userId, request);

        // Assert
        assertNotNull(response);
        assertEquals("DRAFT", response.getStatus());
        assertEquals(3, response.getExpectedStudentCount());
        assertTrue(response.getSessionCode().startsWith("SES-CS301-"));

        // Verify sessionStudentRepository saved all 3 students
        verify(sessionStudentRepository, times(1)).saveAll(argThat(list -> ((List<?>) list).size() == 3));
    }

    @Test
    @DisplayName("Create Session with Conflicting Hall Schedule -> Throws BadRequestException")
    void testCreateSessionThrowsOnHallConflict() {
        LocalDate date = LocalDate.now(LabSessionService.COLOMBO_ZONE).plusDays(1);
        LocalTime start = LocalTime.of(9, 0);
        LocalTime end = LocalTime.of(12, 0);

        LabSessionCreateRequest request = LabSessionCreateRequest.builder()
                .moduleId(module.getId())
                .batchId(batch.getId())
                .hallId(hall.getId())
                .sessionDate(date)
                .startTime(start)
                .endTime(end)
                .build();

        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(moduleRepository.findById(module.getId())).thenReturn(Optional.of(module));
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));
        when(laboratoryHallRepository.findById(hall.getId())).thenReturn(Optional.of(hall));

        when(lecturerModuleAssignmentRepository.isLecturerAssignedToModuleBatchAndGroup(lecturerId, module.getId(), batch.getId(), null))
                .thenReturn(true);

        LabSession conflictingSession = LabSession.builder()
                .sessionCode("SES-EXISTING-01")
                .hall(hall)
                .sessionDate(date)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 30))
                .build();

        when(labSessionRepository.findConflictingHallSessions(hall.getId(), date, start, end, null))
                .thenReturn(List.of(conflictingSession));

        BadRequestException ex = assertThrows(
                BadRequestException.class,
                () -> labSessionService.createSession(userId, request)
        );
        assertTrue(ex.getMessage().contains("Hall conflict"));
    }

    @Test
    @DisplayName("Start Session -> Changes state from DRAFT to ACTIVE and sets actualStartedAt")
    void testStartSessionSuccess() {
        UUID sessionId = UUID.randomUUID();
        LabSession session = LabSession.builder()
                .sessionCode("SES-CS301-101")
                .lecturer(lecturer)
                .status(SessionStatus.DRAFT)
                .build();
        session.setId(sessionId);

        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(labSessionRepository.save(any(LabSession.class))).thenAnswer(i -> i.getArgument(0));

        LabSessionResponse response = labSessionService.startSession(userId, sessionId);

        assertEquals("ACTIVE", response.getStatus());
        assertNotNull(session.getActualStartedAt());
    }

    @Test
    @DisplayName("Cancel Session -> Changes state from ACTIVE to CANCELLED with reason and timestamp")
    void testCancelSessionSuccess() {
        UUID sessionId = UUID.randomUUID();
        LabSession session = LabSession.builder()
                .sessionCode("SES-CS301-102")
                .lecturer(lecturer)
                .status(SessionStatus.ACTIVE)
                .build();
        session.setId(sessionId);

        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(labSessionRepository.save(any(LabSession.class))).thenAnswer(i -> i.getArgument(0));

        LabSessionCancelRequest cancelRequest = LabSessionCancelRequest.builder()
                .cancellationReason("Power failure in campus laboratory")
                .build();

        LabSessionResponse response = labSessionService.cancelSession(userId, sessionId, cancelRequest);

        assertEquals("CANCELLED", response.getStatus());
        assertEquals("Power failure in campus laboratory", session.getCancellationReason());
        assertNotNull(session.getCancelledAt());
    }

    @Test
    @DisplayName("Cancel Finalized Session -> Rejects with BadRequestException (Invalid Transition)")
    void testCancelFinalizedSessionRejection() {
        UUID sessionId = UUID.randomUUID();
        LabSession session = LabSession.builder()
                .sessionCode("SES-CS301-103")
                .lecturer(lecturer)
                .status(SessionStatus.FINALIZED)
                .build();
        session.setId(sessionId);

        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        LabSessionCancelRequest cancelRequest = LabSessionCancelRequest.builder()
                .cancellationReason("Attempting to cancel closed lab")
                .build();

        BadRequestException ex = assertThrows(
                BadRequestException.class,
                () -> labSessionService.cancelSession(userId, sessionId, cancelRequest)
        );
        assertTrue(ex.getMessage().contains("Cannot cancel a finalized"));
    }
}
