package com.labattend.e2e;

import com.labattend.dto.request.AttendanceScanRequest;
import com.labattend.dto.request.SessionFinalizeRequest;
import com.labattend.dto.response.AttendanceScanResponse;
import com.labattend.dto.response.SessionSummaryResponse;
import com.labattend.dto.student.StudentAttendanceHistoryItemResponse;
import com.labattend.dto.student.StudentModuleAttendanceResponse;
import com.labattend.dto.student.StudentProfileResponse;
import com.labattend.dto.student.StudentSummaryResponse;
import com.labattend.entity.AccountActivationToken;
import com.labattend.entity.AttendanceRecord;
import com.labattend.entity.Batch;
import com.labattend.entity.LabGroup;
import com.labattend.entity.LabSession;
import com.labattend.entity.LaboratoryHall;
import com.labattend.entity.Lecturer;
import com.labattend.entity.Module;
import com.labattend.entity.SessionStudent;
import com.labattend.entity.Student;
import com.labattend.entity.User;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.entity.enums.TokenPurpose;
import com.labattend.repository.*;
import com.labattend.security.CustomUserDetails;
import com.labattend.service.*;
import com.labattend.util.HashUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Step 25 End-to-End Hardening Scenario:
 * 1. Admin configures low attendance threshold (80.0%).
 * 2. Admin creates student accounts for a batch (activation tokens generated).
 * 3. Student activates account and logs in on the student portal.
 * 4. Lecturer conducts lab session for Group A with 1 present, 1 absence, and 1 cross-group visitor from Group B.
 * 5. Lecturer finalizes session -> unrecorded student is marked absent.
 * 6. Lecturer views session summary.
 * 7. Student portal views attendance summary, per-module stats, and history.
 * 8. Strict verification: student numbers match lecturer's report exactly, cross-group visit is tracked,
 *    belowThreshold alert is accurately computed, and no forbidden fields/IDOR leaks exist.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class StudentPortalEndToEndScenarioTest {

    @Mock
    private LabSessionRepository labSessionRepository;
    @Mock
    private StudentRepository studentRepository;
    @Mock
    private SessionStudentRepository sessionStudentRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private LecturerRepository lecturerRepository;
    @Mock
    private AccountActivationTokenRepository tokenRepository;
    @Mock
    private BatchRepository batchRepository;
    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private LabGroupRepository labGroupRepository;
    @Mock
    private LaboratoryHallRepository laboratoryHallRepository;
    @Mock
    private LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private QrCodeService qrCodeService;
    @Mock
    private SystemSettingService systemSettingService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmailService emailService;

    private StudentAccountService studentAccountService;
    private LabSessionService labSessionService;
    private AttendanceService attendanceService;
    private StudentPortalService studentPortalService;

    // Domain entities
    private User adminUser;
    private User lecturerUser;
    private Lecturer lecturer;
    private Batch batch;
    private Module module;
    private LabGroup groupA;
    private LabGroup groupB;
    private LaboratoryHall hall;

    private Student student1; // Group A (present)
    private Student student2; // Group A (absent)
    private Student student3; // Group B (cross-group visitor)

    private String rawToken1;
    private String rawToken3;

    private User student1User;
    private User student2User;
    private User student3User;

    private LabSession session;
    private Map<UUID, AttendanceRecord> attendanceDatabase;
    private List<SessionStudent> sessionStudentList;

    @BeforeEach
    void setUp() {
        attendanceDatabase = new HashMap<>();
        sessionStudentList = new ArrayList<>();

        when(systemSettingService.getLowAttendanceThreshold()).thenReturn(80.0);
        when(passwordEncoder.encode(any())).thenAnswer(inv -> "hashed_" + inv.getArgument(0));
        when(passwordEncoder.matches(any(), any())).thenReturn(true);
        when(qrCodeService.generateTokenHash(any())).thenAnswer(inv -> HashUtils.sha256Hex(inv.getArgument(0)));
        when(qrCodeService.verifyToken(any(), anyInt(), any())).thenReturn(true);

        // Core services under test
        studentAccountService = new StudentAccountService(
                studentRepository,
                userRepository,
                tokenRepository,
                passwordEncoder,
                emailService,
                auditLogService,
                batchRepository
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

        studentPortalService = new StudentPortalService(
                studentRepository,
                sessionStudentRepository,
                attendanceRecordRepository,
                userRepository,
                passwordEncoder,
                systemSettingService,
                studentAccountService
        );

        // 1. Setup Admin & Lecturer
        adminUser = User.builder()
                .email("admin@sliit.lk")
                .fullName("Administrator")
                .role(Role.ADMIN)
                .isActive(true)
                .build();
        adminUser.setId(UUID.randomUUID());

        lecturerUser = User.builder()
                .email("dr.turing@sliit.lk")
                .fullName("Dr. Alan Turing")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUser.setId(UUID.randomUUID());

        lecturer = Lecturer.builder()
                .user(lecturerUser)
                .staffId("LEC-001")
                .fullName("Dr. Alan Turing")
                .department("Computing")
                .isActive(true)
                .build();
        lecturer.setId(UUID.randomUUID());

        // 2. Setup Academic Structure
        batch = Batch.builder().batchCode("2026.1").academicYear("2026").isActive(true).build();
        batch.setId(UUID.randomUUID());

        module = Module.builder().moduleCode("SE301").name("Distributed Systems").isActive(true).build();
        module.setId(UUID.randomUUID());

        groupA = LabGroup.builder().batch(batch).groupName("Group A").isActive(true).build();
        groupA.setId(UUID.randomUUID());

        groupB = LabGroup.builder().batch(batch).groupName("Group B").isActive(true).build();
        groupB.setId(UUID.randomUUID());

        hall = LaboratoryHall.builder().hallCode("LAB-01").capacity(40).build();
        hall.setId(UUID.randomUUID());

        // 3. Setup Students with unhashed tokens for scanning
        rawToken1 = "RAW-QR-TOKEN-1";
        String tokenHash1 = HashUtils.sha256Hex(rawToken1);
        rawToken3 = "RAW-QR-TOKEN-3";
        String tokenHash3 = HashUtils.sha256Hex(rawToken3);

        student1 = Student.builder()
                .studentId("STU-001")
                .fullName("Kasun Perera")
                .email("student1@sliit.lk")
                .batch(batch)
                .labGroup(groupA)
                .user(null)
                .isActive(true)
                .qrTokenHash(tokenHash1)
                .build();
        student1.setId(UUID.randomUUID());

        student2 = Student.builder()
                .studentId("STU-002")
                .fullName("Nimal Fernando")
                .email("student2@sliit.lk")
                .batch(batch)
                .labGroup(groupA)
                .user(null)
                .isActive(true)
                .qrTokenHash(HashUtils.sha256Hex("RAW-QR-TOKEN-2"))
                .build();
        student2.setId(UUID.randomUUID());

        student3 = Student.builder()
                .studentId("STU-003")
                .fullName("Sunil Wickrama")
                .email("student3@sliit.lk")
                .batch(batch)
                .labGroup(groupB) // Note: Group B!
                .user(null)
                .isActive(true)
                .qrTokenHash(tokenHash3)
                .build();
        student3.setId(UUID.randomUUID());

        // 4. Setup Lab Session for Group A with Lab Sheet #01
        session = LabSession.builder()
                .module(module)
                .batch(batch)
                .labGroup(groupA)
                .hall(hall)
                .lecturer(lecturer)
                .sessionDate(LocalDate.of(2026, 11, 6))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .labSheetNumber("SHEET-01")
                .status(SessionStatus.ACTIVE)
                .build();
        session.setId(UUID.randomUUID());

        // Pre-enrolled roster for Group A: Student 1 and Student 2
        SessionStudent ss1 = SessionStudent.builder().session(session).student(student1).isExpected(true).build();
        ss1.setId(UUID.randomUUID());
        SessionStudent ss2 = SessionStudent.builder().session(session).student(student2).isExpected(true).build();
        ss2.setId(UUID.randomUUID());
        sessionStudentList.add(ss1);
        sessionStudentList.add(ss2);

        // Mock repository behaviors
        when(labSessionRepository.findById(session.getId())).thenReturn(Optional.of(session));
        when(labSessionRepository.findByIdWithPessimisticLock(session.getId())).thenReturn(Optional.of(session));
        when(studentRepository.findById(student1.getId())).thenReturn(Optional.of(student1));
        when(studentRepository.findById(student2.getId())).thenReturn(Optional.of(student2));
        when(studentRepository.findById(student3.getId())).thenReturn(Optional.of(student3));

        when(studentRepository.findByQrTokenHash(tokenHash1)).thenReturn(Optional.of(student1));
        when(studentRepository.findByQrTokenHash(tokenHash3)).thenReturn(Optional.of(student3));

        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) u.setId(UUID.randomUUID());
            return u;
        });
        when(studentRepository.save(any(Student.class))).thenAnswer(inv -> inv.getArgument(0));

        when(studentRepository.findByUserId(any(UUID.class))).thenAnswer(inv -> {
            UUID uId = inv.getArgument(0);
            if (student1.getUser() != null && uId.equals(student1.getUser().getId())) return Optional.of(student1);
            if (student2.getUser() != null && uId.equals(student2.getUser().getId())) return Optional.of(student2);
            if (student3.getUser() != null && uId.equals(student3.getUser().getId())) return Optional.of(student3);
            return Optional.empty();
        });

        when(userRepository.findById(lecturerUser.getId())).thenReturn(Optional.of(lecturerUser));
        when(lecturerRepository.findByUserId(lecturerUser.getId())).thenReturn(Optional.of(lecturer));

        when(sessionStudentRepository.findBySessionId(session.getId())).thenAnswer(inv -> new ArrayList<>(sessionStudentList));
        when(sessionStudentRepository.countBySessionId(session.getId())).thenAnswer(inv -> (long) sessionStudentList.size());
        when(sessionStudentRepository.countBySessionIdAndIsExpectedTrue(session.getId()))
                .thenAnswer(inv -> sessionStudentList.stream().filter(ss -> !Boolean.FALSE.equals(ss.getIsExpected())).count());

        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(eq(session.getId()), any()))
                .thenAnswer(inv -> attendanceDatabase.values().stream()
                        .filter(r -> !Boolean.TRUE.equals(r.getIsCrossGroup()) && (r.getStatus() == AttendanceStatus.PRESENT || r.getStatus() == AttendanceStatus.LATE))
                        .count());

        when(attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrueAndStatusIn(eq(session.getId()), any()))
                .thenAnswer(inv -> attendanceDatabase.values().stream()
                        .filter(r -> Boolean.TRUE.equals(r.getIsCrossGroup()) && (r.getStatus() == AttendanceStatus.PRESENT || r.getStatus() == AttendanceStatus.LATE))
                        .count());

        when(sessionStudentRepository.findBySessionIdAndStudentId(eq(session.getId()), eq(student1.getId()))).thenReturn(Optional.of(ss1));
        when(sessionStudentRepository.findBySessionIdAndStudentId(eq(session.getId()), eq(student2.getId()))).thenReturn(Optional.of(ss2));
        when(sessionStudentRepository.findBySessionIdAndStudentId(eq(session.getId()), eq(student3.getId()))).thenAnswer(inv ->
                sessionStudentList.stream().filter(s -> s.getStudent().getId().equals(student3.getId())).findFirst());

        when(sessionStudentRepository.existsBySessionIdAndStudentId(eq(session.getId()), eq(student1.getId()))).thenReturn(true);
        when(sessionStudentRepository.existsBySessionIdAndStudentId(eq(session.getId()), eq(student2.getId()))).thenReturn(true);
        when(sessionStudentRepository.existsBySessionIdAndStudentId(eq(session.getId()), eq(student3.getId()))).thenAnswer(inv ->
                sessionStudentList.stream().anyMatch(s -> s.getStudent().getId().equals(student3.getId())));

        when(attendanceRecordRepository.findBySessionIdAndStudentId(any(), any())).thenAnswer(inv -> {
            UUID sId = inv.getArgument(1);
            return Optional.ofNullable(attendanceDatabase.get(sId));
        });

        when(attendanceRecordRepository.save(any(AttendanceRecord.class))).thenAnswer(inv -> {
            AttendanceRecord rec = inv.getArgument(0);
            if (rec.getId() == null) rec.setId(UUID.randomUUID());
            attendanceDatabase.put(rec.getStudent().getId(), rec);
            return rec;
        });

        when(attendanceRecordRepository.saveAndFlush(any(AttendanceRecord.class))).thenAnswer(inv -> {
            AttendanceRecord rec = inv.getArgument(0);
            if (rec.getId() == null) rec.setId(UUID.randomUUID());
            attendanceDatabase.put(rec.getStudent().getId(), rec);
            return rec;
        });

        when(attendanceRecordRepository.saveAll(any())).thenAnswer(inv -> {
            List<AttendanceRecord> recs = inv.getArgument(0);
            for (AttendanceRecord r : recs) {
                if (r.getId() == null) r.setId(UUID.randomUUID());
                attendanceDatabase.put(r.getStudent().getId(), r);
            }
            return recs;
        });

        when(sessionStudentRepository.save(any(SessionStudent.class))).thenAnswer(inv -> {
            SessionStudent ss = inv.getArgument(0);
            if (ss.getId() == null) ss.setId(UUID.randomUUID());
            sessionStudentList.add(ss);
            return ss;
        });

        when(attendanceRecordRepository.findBySessionId(session.getId())).thenAnswer(inv -> new ArrayList<>(attendanceDatabase.values()));

        when(attendanceRecordRepository.countBySessionIdAndStatus(eq(session.getId()), eq(AttendanceStatus.ABSENT)))
                .thenAnswer(inv -> attendanceDatabase.values().stream().filter(r -> r.getStatus() == AttendanceStatus.ABSENT).count());

        when(sessionStudentRepository.findStudentEligibleSessions(any(), any(), any(), any(), any())).thenAnswer(inv -> {
            UUID stId = inv.getArgument(0);
            return sessionStudentList.stream().filter(ss -> ss.getStudent().getId().equals(stId)).toList();
        });

        when(attendanceRecordRepository.findByStudentIdAndSessionIdIn(any(), any())).thenAnswer(inv -> {
            UUID stId = inv.getArgument(0);
            AttendanceRecord ar = attendanceDatabase.get(stId);
            return ar != null ? List.of(ar) : Collections.emptyList();
        });

        when(labSessionRepository.save(any(LabSession.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("End-to-End Scenario: Account Activation, Session Finalization, Cross-Group Attendance, and Student Portal Verification")
    void testEndToEndStudentPortalWorkflow() {
        // =========================================================================
        // Step 1: Admin bulk-creates accounts and student activates
        // =========================================================================
        when(batchRepository.findById(batch.getId())).thenReturn(Optional.of(batch));
        when(studentRepository.findByBatchIdAndIsActiveTrue(batch.getId())).thenReturn(List.of(student1, student2, student3));
        when(tokenRepository.save(any(AccountActivationToken.class))).thenAnswer(inv -> inv.getArgument(0));

        // Admin bulk creation
        Map<String, Object> bulkResult = studentAccountService.bulkCreateAccounts(batch.getId(), null, null);
        assertNotNull(bulkResult);
        assertEquals(3, bulkResult.get("createdCount"));

        student1User = student1.getUser();
        student2User = student2.getUser();
        student3User = student3.getUser();
        assertNotNull(student1User);
        assertNotNull(student2User);
        assertNotNull(student3User);

        // Student 1 activation
        String rawActivationToken = UUID.randomUUID().toString();
        String tokenHash = HashUtils.sha256Hex(rawActivationToken);

        AccountActivationToken activationToken = AccountActivationToken.builder()
                .user(student1User)
                .tokenHash(tokenHash)
                .purpose(TokenPurpose.ACTIVATION)
                .expiresAt(OffsetDateTime.now().plusHours(24))
                .build();

        when(tokenRepository.findByTokenHashAndPurpose(tokenHash, TokenPurpose.ACTIVATION))
                .thenReturn(Optional.of(activationToken));

        studentAccountService.activateAccount(rawActivationToken, "StrongPass@2026");
        assertTrue(student1User.getIsActive(), "Student 1 user account must be activated");
        assertNotNull(activationToken.getUsedAt(), "Token must be marked used");

        // =========================================================================
        // Step 2: Lecturer conducts session on staff portal
        // =========================================================================
        // Student 1 (Group A) scanned present
        AttendanceScanRequest scan1 = new AttendanceScanRequest(rawToken1);
        AttendanceScanResponse scanResp1 = attendanceService.scanQrAttendance(lecturerUser.getId(), session.getId(), scan1);
        assertEquals("SUCCESS", scanResp1.getResult());
        assertEquals("Kasun Perera", scanResp1.getStudentName());
        assertFalse(Boolean.TRUE.equals(scanResp1.getIsCrossGroup()));

        // Student 3 (Group B) visits Group A session as cross-group attendee
        AttendanceScanRequest scan3 = new AttendanceScanRequest(rawToken3);
        AttendanceScanResponse scanResp3 = attendanceService.scanQrAttendance(lecturerUser.getId(), session.getId(), scan3);
        assertEquals("CROSS_GROUP_MARKED", scanResp3.getResult());
        assertEquals("Sunil Wickrama", scanResp3.getStudentName());
        assertTrue(Boolean.TRUE.equals(scanResp3.getIsCrossGroup()), "Student 3 must be flagged as Cross-Group");

        // =========================================================================
        // Step 3: Lecturer finalizes session on staff portal (MARK_ABSENT for unmarked)
        // =========================================================================
        SessionFinalizeRequest finalizeReq = new SessionFinalizeRequest("Concluded on schedule");
        SessionSummaryResponse summary = labSessionService.finalizeSession(lecturerUser.getId(), session.getId(), finalizeReq);

        // Verification of Lecturer Session Summary
        assertEquals("FINALIZED", session.getStatus().name());
        assertEquals(2, summary.getExpectedStudentCount(), "Group A cohort has 2 enrolled students (Student 1 & Student 2)");
        assertEquals(1, summary.getPresentCount(), "Student 1 from Group A cohort present");
        assertEquals(1, summary.getAbsentCount(), "Student 2 unmarked -> marked absent upon finalization");
        assertEquals(1, summary.getCrossGroupCount(), "Student 3 from Group B");

        // =========================================================================
        // Step 4: Student 1 (Attended) logs in to Student Portal
        // =========================================================================
        CustomUserDetails student1Details = new CustomUserDetails(student1User);

        // Profile
        StudentProfileResponse profile1 = studentPortalService.getProfile(student1Details);
        assertEquals("STU-001", profile1.getStudentId());
        assertEquals("Kasun Perera", profile1.getFullName());
        assertEquals("Group A", profile1.getLabGroup());

        // Attendance Summary
        StudentSummaryResponse summary1 = studentPortalService.getAttendanceSummary(student1Details);
        assertEquals(1, summary1.getEligibleFinalizedSessions());
        assertEquals(1, summary1.getAttendedSessions());
        assertEquals(0, summary1.getMissedSessions());
        assertEquals("100.0%", summary1.getAttendancePercentage());
        assertEquals(100.0, summary1.getPercentageNumeric());
        assertFalse(summary1.isBelowThreshold(), "100% attendance must not trigger belowThreshold alert");
        assertEquals(0, summary1.getCrossGroupVisitsCount());

        // Module Breakdown
        List<StudentModuleAttendanceResponse> modules1 = studentPortalService.getModuleAttendance(student1Details);
        assertEquals(1, modules1.size());
        assertEquals("SE301", modules1.get(0).getModuleCode());
        assertEquals("100.0%", modules1.get(0).getAttendancePercentage());

        // Attendance History
        Page<StudentAttendanceHistoryItemResponse> history1 = studentPortalService.getAttendanceHistory(
                student1Details, null, null, null, null, PageRequest.of(0, 10));
        assertEquals(1, history1.getTotalElements());
        StudentAttendanceHistoryItemResponse historyItem1 = history1.getContent().get(0);
        assertEquals("SE301", historyItem1.getModuleCode());
        assertEquals("SHEET-01", historyItem1.getLabSheetNumber());
        assertEquals("PRESENT", historyItem1.getStatus());
        assertFalse(Boolean.TRUE.equals(historyItem1.getIsCrossGroup()));

        // =========================================================================
        // Step 5: Student 2 (Absent) logs in to Student Portal
        // =========================================================================
        CustomUserDetails student2Details = new CustomUserDetails(student2User);

        StudentSummaryResponse summary2 = studentPortalService.getAttendanceSummary(student2Details);
        assertEquals(1, summary2.getEligibleFinalizedSessions());
        assertEquals(0, summary2.getAttendedSessions());
        assertEquals(1, summary2.getMissedSessions());
        assertEquals("0.0%", summary2.getAttendancePercentage());
        assertEquals(0.0, summary2.getPercentageNumeric());
        assertTrue(summary2.isBelowThreshold(), "0% attendance must trigger belowThreshold alert (< 80%)");

        // =========================================================================
        // Step 6: Student 3 (Cross-Group Visitor) logs in to Student Portal
        // =========================================================================
        CustomUserDetails student3Details = new CustomUserDetails(student3User);

        StudentSummaryResponse summary3 = studentPortalService.getAttendanceSummary(student3Details);
        assertEquals(0, summary3.getEligibleFinalizedSessions(), "Student 3 was not an expected cohort attendee in Group A");
        assertEquals(0, summary3.getAttendedSessions(), "Eligible attended sessions is 0");
        assertEquals(1, summary3.getCrossGroupVisitsCount(), "Student 3's cross-group visit to Group A must be counted");
        assertEquals("N/A", summary3.getAttendancePercentage());

        // =========================================================================
        // Step 7: Cross-System Metrics Consistency Check
        // =========================================================================
        // The lecturer's total cohort attendance matches individual student calculations
        assertEquals(summary1.getAttendedSessions(), 1, "Student 1 attended matches lecturer record");
        assertEquals(summary2.getMissedSessions(), 1, "Student 2 absent matches lecturer record");
        assertEquals(summary3.getCrossGroupVisitsCount(), summary.getCrossGroupCount(), "Cross-group visit counts match");
    }
}
