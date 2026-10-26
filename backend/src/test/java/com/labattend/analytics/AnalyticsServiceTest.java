package com.labattend.analytics;

import com.labattend.dto.response.analytics.*;
import com.labattend.entity.*;
import com.labattend.entity.Module;
import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.repository.*;
import com.labattend.service.AnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AnalyticsServiceTest {

    @Mock
    private LabSessionRepository labSessionRepository;

    @Mock
    private SessionStudentRepository sessionStudentRepository;

    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;

    @Mock
    private LecturerRepository lecturerRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private ModuleRepository moduleRepository;

    @Mock
    private BatchRepository batchRepository;

    @Mock
    private DegreeProgrammeRepository degreeProgrammeRepository;

    @Mock
    private LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository;

    @InjectMocks
    private AnalyticsService analyticsService;

    private User lecturerUser;
    private Lecturer lecturer;
    private DegreeProgramme programme;
    private Batch batchA;
    private Batch batchB;
    private Module module;
    private Student student;
    private LabSession finalizedSession;
    private LabSession activeSession;
    private LabSession cancelledSession;

    @BeforeEach
    void setUp() {
        lecturerUser = User.builder()
                .fullName("Dr. Perera")
                .email("perera@labattend.edu")
                .build();
        lecturerUser.setId(UUID.randomUUID());

        lecturer = Lecturer.builder()
                .user(lecturerUser)
                .staffId("LEC001")
                .department("Computing")
                .build();
        lecturer.setId(UUID.randomUUID());

        programme = DegreeProgramme.builder()
                .code("SE")
                .name("Software Engineering")
                .build();
        programme.setId(UUID.randomUUID());

        batchA = Batch.builder()
                .batchCode("Y2S1-2026")
                .academicYear("2026")
                .degreeProgramme(programme)
                .build();
        batchA.setId(UUID.randomUUID());

        batchB = Batch.builder()
                .batchCode("Y2S2-2026")
                .academicYear("2026")
                .degreeProgramme(programme)
                .build();
        batchB.setId(UUID.randomUUID());

        module = Module.builder()
                .moduleCode("CS201")
                .name("Data Structures & Algorithms")
                .degreeProgramme(programme)
                .semester("Semester 1")
                .academicYear("2026")
                .build();
        module.setId(UUID.randomUUID());

        student = Student.builder()
                .studentId("IT21001234")
                .fullName("Kasun Silva")
                .email("kasun@student.labattend.edu")
                .degreeProgramme(programme)
                .batch(batchA)
                .isActive(true)
                .build();
        student.setId(UUID.randomUUID());

        LaboratoryHall hall = LaboratoryHall.builder()
                .hallCode("LAB-A")
                .name("Main Computing Lab")
                .build();
        hall.setId(UUID.randomUUID());

        finalizedSession = LabSession.builder()
                .sessionCode("SES-1001")
                .module(module)
                .batch(batchA)
                .lecturer(lecturer)
                .hall(hall)
                .sessionDate(LocalDate.now().minusDays(5))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .status(SessionStatus.FINALIZED)
                .build();
        finalizedSession.setId(UUID.randomUUID());

        activeSession = LabSession.builder()
                .sessionCode("SES-1002")
                .module(module)
                .batch(batchA)
                .lecturer(lecturer)
                .hall(hall)
                .sessionDate(LocalDate.now())
                .startTime(LocalTime.of(14, 0))
                .endTime(LocalTime.of(16, 0))
                .status(SessionStatus.ACTIVE)
                .build();
        activeSession.setId(UUID.randomUUID());

        cancelledSession = LabSession.builder()
                .sessionCode("SES-1003")
                .module(module)
                .batch(batchA)
                .lecturer(lecturer)
                .hall(hall)
                .sessionDate(LocalDate.now().minusDays(10))
                .startTime(LocalTime.of(11, 0))
                .endTime(LocalTime.of(13, 0))
                .status(SessionStatus.CANCELLED)
                .build();
        cancelledSession.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Should correctly compute present, absent and attendance percentage")
    void testCorrectAttendancePercentageCalculation() {
        when(lecturerRepository.findByUserId(lecturerUser.getId())).thenReturn(Optional.of(lecturer));

        // 1 Finalized session status count
        List<Object[]> statusCounts = Collections.singletonList(
                new Object[]{SessionStatus.FINALIZED, 1L}
        );
        when(labSessionRepository.countSessionsByStatus(eq(lecturer.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(statusCounts);

        // 40 expected student slots
        when(sessionStudentRepository.countTotalExpectedFinalizedSlots(eq(lecturer.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(40L);

        // 35 present slots, 5 absent slots
        List<Object[]> slotCounts = Arrays.asList(
                new Object[]{AttendanceStatus.PRESENT, 35L},
                new Object[]{AttendanceStatus.ABSENT, 5L}
        );
        when(attendanceRecordRepository.countFinalizedAttendanceSlotsByStatus(eq(lecturer.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(slotCounts);

        AnalyticsOverviewResponse overview = analyticsService.getLecturerOverview(
                lecturerUser.getId(), null, null, null, null, null
        );

        assertNotNull(overview);
        assertEquals(1, overview.getFinalizedSessions());
        assertEquals(40, overview.getTotalExpectedSlots());
        assertEquals(35, overview.getTotalPresentSlots());
        assertEquals(5, overview.getTotalAbsentSlots());
        assertEquals("87.5%", overview.getOverallAttendancePercentage());
        assertEquals(87.5, overview.getPercentageNumeric());
    }

    @Test
    @DisplayName("Cancelled sessions must be excluded from official attendance statistics")
    void testCancelledSessionsExcluded() {
        when(lecturerRepository.findByUserId(lecturerUser.getId())).thenReturn(Optional.of(lecturer));

        // 1 Finalized, 1 Cancelled
        List<Object[]> statusCounts = Arrays.asList(
                new Object[]{SessionStatus.FINALIZED, 1L},
                new Object[]{SessionStatus.CANCELLED, 1L}
        );
        when(labSessionRepository.countSessionsByStatus(eq(lecturer.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(statusCounts);

        // Expected slots query only queries FINALIZED sessions
        when(sessionStudentRepository.countTotalExpectedFinalizedSlots(eq(lecturer.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(30L);

        List<Object[]> slotCounts = Collections.singletonList(
                new Object[]{AttendanceStatus.PRESENT, 24L}
        );
        when(attendanceRecordRepository.countFinalizedAttendanceSlotsByStatus(eq(lecturer.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(slotCounts);

        AnalyticsOverviewResponse overview = analyticsService.getLecturerOverview(
                lecturerUser.getId(), null, null, null, null, null
        );

        assertEquals(2, overview.getTotalSessions());
        assertEquals(1, overview.getFinalizedSessions());
        assertEquals(1, overview.getCancelledSessions());
        assertEquals(30, overview.getTotalExpectedSlots());
        assertEquals(24, overview.getTotalPresentSlots());
        assertEquals(6, overview.getTotalAbsentSlots()); // 30 - 24
        assertEquals("80.0%", overview.getOverallAttendancePercentage());
    }

    @Test
    @DisplayName("Unfinalized (ACTIVE/DRAFT) sessions must be excluded from official stats and labeled provisional")
    void testUnfinalizedSessionsExcludedFromOfficialStats() {
        when(lecturerRepository.findByUserId(lecturerUser.getId())).thenReturn(Optional.of(lecturer));

        // 1 Active session, 0 Finalized
        List<Object[]> statusCounts = Collections.singletonList(
                new Object[]{SessionStatus.ACTIVE, 1L}
        );
        when(labSessionRepository.countSessionsByStatus(eq(lecturer.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(statusCounts);

        when(sessionStudentRepository.countTotalExpectedFinalizedSlots(eq(lecturer.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(0L);

        when(attendanceRecordRepository.countFinalizedAttendanceSlotsByStatus(eq(lecturer.getId()), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(Collections.emptyList());

        AnalyticsOverviewResponse overview = analyticsService.getLecturerOverview(
                lecturerUser.getId(), null, null, null, null, null
        );

        assertEquals(1, overview.getTotalSessions());
        assertEquals(0, overview.getFinalizedSessions());
        assertEquals(1, overview.getActiveSessions()); // Clearly identified provisional active session
        assertEquals(0, overview.getTotalExpectedSlots());
        assertEquals("N/A", overview.getOverallAttendancePercentage());
        assertNull(overview.getPercentageNumeric());
    }

    @Test
    @DisplayName("Zero eligible sessions must be handled with 'N/A' and null numeric percentage")
    void testZeroEligibleHandled() {
        List<Object[]> eligibleRows = Collections.singletonList(
                new Object[]{student.getId(), student.getStudentId(), student.getFullName(), batchA.getBatchCode(), 0L}
        );
        when(sessionStudentRepository.countEligibleFinalizedSessionsPerStudent(
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()
        )).thenReturn(eligibleRows);

        when(attendanceRecordRepository.countAttendedSessionsPerStudent(
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()
        )).thenReturn(Collections.emptyList());

        List<StudentAttendanceSummaryResponse> summaries = analyticsService.getStudentAttendanceSummaries(
                null, null, null, null, null, null, null, null, null
        );

        assertEquals(1, summaries.size());
        StudentAttendanceSummaryResponse s = summaries.get(0);
        assertEquals(0, s.getEligibleFinalizedSessions());
        assertEquals(0, s.getAttendedSessions());
        assertEquals(0, s.getMissedSessions());
        assertEquals("N/A", s.getAttendancePercentage());
        assertNull(s.getPercentageNumeric());
        assertFalse(s.isLowAttendance());
    }

    @Test
    @DisplayName("Student history must be preserved via session_students after a batch change")
    void testStudentHistoryPreservedAfterBatchChange() {
        // Step 1: Student was enrolled in session under Batch A
        SessionStudent sessionStudent = SessionStudent.builder()
                .id(UUID.randomUUID())
                .session(finalizedSession)
                .student(student)
                .build();

        AttendanceRecord record = AttendanceRecord.builder()
                .session(finalizedSession)
                .student(student)
                .status(AttendanceStatus.PRESENT)
                .method(AttendanceMethod.QR_SCAN)
                .markedAt(OffsetDateTime.now())
                .build();

        // Step 2: Student moves to Batch B
        student.setBatch(batchB);

        when(studentRepository.findById(student.getId())).thenReturn(Optional.of(student));
        when(sessionStudentRepository.findStudentEligibleSessions(eq(student.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(Collections.singletonList(sessionStudent));
        when(attendanceRecordRepository.findByStudentIdAndSessionIdIn(eq(student.getId()), anyCollection()))
                .thenReturn(Collections.singletonList(record));

        // Call as admin
        StudentDetailedAttendanceResponse details = analyticsService.getStudentDetailedAttendance(
                UUID.randomUUID(), true, student.getId(), null, null, null
        );

        assertNotNull(details);
        assertEquals(1, details.getEligibleFinalizedSessions());
        assertEquals(1, details.getAttendedSessions());
        assertEquals(0, details.getMissedSessions());
        assertEquals("100.0%", details.getAttendancePercentage());
        assertEquals(1, details.getHistory().size());

        StudentDetailedAttendanceResponse.StudentSessionHistoryItem historyItem = details.getHistory().get(0);
        assertEquals("SES-1001", historyItem.getSessionCode());
        assertEquals("Y2S1-2026", historyItem.getBatchCode()); // Preserved historical batch
        assertEquals("PRESENT", historyItem.getAttendanceStatus());
        assertEquals("QR_SCAN", historyItem.getMethod());
    }

    @Test
    @DisplayName("Lecturer cannot access another lecturer's student data")
    void testLecturerCannotSeeAnotherLecturersData() {
        User otherLecturerUser = User.builder().build();
        otherLecturerUser.setId(UUID.randomUUID());
        Lecturer otherLecturer = Lecturer.builder().user(otherLecturerUser).build();
        otherLecturer.setId(UUID.randomUUID());

        when(studentRepository.findById(student.getId())).thenReturn(Optional.of(student));
        when(lecturerRepository.findByUserId(otherLecturerUser.getId())).thenReturn(Optional.of(otherLecturer));

        // The student has no sessions with this lecturer
        when(sessionStudentRepository.findStudentEligibleSessions(eq(student.getId()), eq(otherLecturer.getId()), isNull(), isNull(), isNull()))
                .thenReturn(Collections.emptyList());
        when(lecturerModuleAssignmentRepository.findByLecturerIdAndIsActiveTrue(otherLecturer.getId()))
                .thenReturn(Collections.emptyList());

        assertThrows(BadRequestException.class, () -> {
            analyticsService.getStudentDetailedAttendance(
                    otherLecturerUser.getId(), false, student.getId(), null, null, null
            );
        });
    }

    @Test
    @DisplayName("Low attendance threshold parameter correctly identifies flagged students")
    void testLowAttendanceThreshold() {
        UUID s1Id = UUID.randomUUID();
        UUID s2Id = UUID.randomUUID();

        List<Object[]> eligibleRows = Arrays.asList(
                new Object[]{s1Id, "IT001", "Alice", "B1", 10L},
                new Object[]{s2Id, "IT002", "Bob", "B1", 10L}
        );
        when(sessionStudentRepository.countEligibleFinalizedSessionsPerStudent(
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()
        )).thenReturn(eligibleRows);

        // Alice attended 9/10 (90%), Bob attended 6/10 (60%)
        List<Object[]> attendedRows = Arrays.asList(
                new Object[]{s1Id, 9L},
                new Object[]{s2Id, 6L}
        );
        when(attendanceRecordRepository.countAttendedSessionsPerStudent(
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()
        )).thenReturn(attendedRows);

        List<StudentAttendanceSummaryResponse> summaries = analyticsService.getStudentAttendanceSummaries(
                null, null, null, null, null, null, null, 75.0, null
        );

        assertEquals(2, summaries.size());
        StudentAttendanceSummaryResponse alice = summaries.stream().filter(s -> s.getOfficialStudentId().equals("IT001")).findFirst().orElseThrow();
        StudentAttendanceSummaryResponse bob = summaries.stream().filter(s -> s.getOfficialStudentId().equals("IT002")).findFirst().orElseThrow();

        assertEquals(90.0, alice.getPercentageNumeric());
        assertFalse(alice.isLowAttendance());

        assertEquals(60.0, bob.getPercentageNumeric());
        assertTrue(bob.isLowAttendance());
    }
}
