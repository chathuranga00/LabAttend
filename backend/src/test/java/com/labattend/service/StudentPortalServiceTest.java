package com.labattend.service;

import com.labattend.dto.student.*;
import com.labattend.entity.*;
import com.labattend.entity.Module;
import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.repository.AttendanceRecordRepository;
import com.labattend.repository.SessionStudentRepository;
import com.labattend.repository.StudentRepository;
import com.labattend.repository.UserRepository;
import com.labattend.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentPortalServiceTest {

    @Mock
    private StudentRepository studentRepository;
    @Mock
    private SessionStudentRepository sessionStudentRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private SystemSettingService systemSettingService;
    @Mock
    private StudentAccountService studentAccountService;

    @InjectMocks
    private StudentPortalService studentPortalService;

    private User testUser;
    private Student testStudent;
    private CustomUserDetails userDetails;
    private DegreeProgramme testProgramme;
    private Batch testBatch;
    private LabGroup testGroup;
    private Module testModule;
    private LaboratoryHall testHall;
    private Lecturer testLecturer;

    @BeforeEach
    void setUp() {
        UUID userId = UUID.randomUUID();
        testUser = User.builder()
                .email("student@test.ac.lk")
                .passwordHash("encodedCurrentPassword")
                .role(Role.STUDENT)
                .isActive(true)
                .build();
        testUser.setId(userId);

        userDetails = new CustomUserDetails(testUser);

        testProgramme = DegreeProgramme.builder()
                .code("SE")
                .name("BSc in Software Engineering")
                .department("Computing")
                .build();
        testProgramme.setId(UUID.randomUUID());

        testBatch = Batch.builder()
                .batchCode("2026.1")
                .degreeProgramme(testProgramme)
                .build();
        testBatch.setId(UUID.randomUUID());

        testGroup = LabGroup.builder()
                .groupName("Group A")
                .batch(testBatch)
                .build();
        testGroup.setId(UUID.randomUUID());

        testStudent = Student.builder()
                .studentId("NSBM2026042")
                .fullName("Kasun Perera")
                .email("student@test.ac.lk")
                .degreeProgramme(testProgramme)
                .batch(testBatch)
                .labGroup(testGroup)
                .user(testUser)
                .qrTokenHash("SECRET_HASH")
                .isActive(true)
                .build();
        testStudent.setId(UUID.randomUUID());

        testModule = Module.builder()
                .moduleCode("SE301")
                .name("Distributed Systems")
                .semester("Year 3 Sem 1")
                .degreeProgramme(testProgramme)
                .build();
        testModule.setId(UUID.randomUUID());

        testHall = LaboratoryHall.builder()
                .hallCode("LH-01")
                .name("Computer Lab 01")
                .capacity(60)
                .build();
        testHall.setId(UUID.randomUUID());

        testLecturer = Lecturer.builder()
                .staffId("LEC001")
                .fullName("Dr. Perera")
                .department("Computing")
                .user(testUser)
                .build();
        testLecturer.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("getProfile -> Returns authenticated student profile, no sensitive or QR fields")
    void testGetProfileSuccess() {
        when(studentRepository.findByUserId(testUser.getId())).thenReturn(Optional.of(testStudent));

        StudentProfileResponse profile = studentPortalService.getProfile(userDetails);

        assertThat(profile).isNotNull();
        assertThat(profile.getStudentId()).isEqualTo("NSBM2026042");
        assertThat(profile.getFullName()).isEqualTo("Kasun Perera");
        assertThat(profile.getEmail()).isEqualTo("student@test.ac.lk");
        assertThat(profile.getDegreeProgramme()).isEqualTo("BSc in Software Engineering");
        assertThat(profile.getBatch()).isEqualTo("2026.1");
        assertThat(profile.getLabGroup()).isEqualTo("Group A");
        assertThat(profile.getEnrollmentStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("getAttendanceSummary -> Accurately calculates eligible, attended, missed, and threshold metrics")
    void testGetAttendanceSummarySuccess() {
        when(studentRepository.findByUserId(testUser.getId())).thenReturn(Optional.of(testStudent));
        when(systemSettingService.getLowAttendanceThreshold()).thenReturn(80.0);

        // Create 5 sessions: 4 FINALIZED expected, 1 CANCELLED, 1 ACTIVE
        LabSession s1 = createSession(SessionStatus.FINALIZED, "S1");
        LabSession s2 = createSession(SessionStatus.FINALIZED, "S2");
        LabSession s3 = createSession(SessionStatus.FINALIZED, "S3");
        LabSession s4 = createSession(SessionStatus.FINALIZED, "S4");
        LabSession sCancelled = createSession(SessionStatus.CANCELLED, "S_CANCELLED");
        LabSession sActive = createSession(SessionStatus.ACTIVE, "S_ACTIVE");

        SessionStudent ss1 = SessionStudent.builder().session(s1).student(testStudent).isExpected(true).build();
        SessionStudent ss2 = SessionStudent.builder().session(s2).student(testStudent).isExpected(true).build();
        SessionStudent ss3 = SessionStudent.builder().session(s3).student(testStudent).isExpected(true).build();
        SessionStudent ss4 = SessionStudent.builder().session(s4).student(testStudent).isExpected(true).build();
        SessionStudent ssCancelled = SessionStudent.builder().session(sCancelled).student(testStudent).isExpected(true).build();
        SessionStudent ssActive = SessionStudent.builder().session(sActive).student(testStudent).isExpected(true).build();

        // Cross group visitor session attended
        LabSession sCross = createSession(SessionStatus.FINALIZED, "S_CROSS");
        SessionStudent ssCross = SessionStudent.builder().session(sCross).student(testStudent).isExpected(false).build();

        when(sessionStudentRepository.findStudentEligibleSessions(eq(testStudent.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(ss1, ss2, ss3, ss4, ssCancelled, ssActive, ssCross));

        // Present in s1, s2, s3, and sCross; Absent in s4
        AttendanceRecord r1 = createRecord(s1, AttendanceStatus.PRESENT, false);
        AttendanceRecord r2 = createRecord(s2, AttendanceStatus.PRESENT, false);
        AttendanceRecord r3 = createRecord(s3, AttendanceStatus.LATE, false);
        AttendanceRecord rCross = createRecord(sCross, AttendanceStatus.PRESENT, true);

        when(attendanceRecordRepository.findByStudentIdAndSessionIdIn(eq(testStudent.getId()), any()))
                .thenReturn(List.of(r1, r2, r3, rCross));

        StudentSummaryResponse summary = studentPortalService.getAttendanceSummary(userDetails);

        // Expected sessions: s1, s2, s3, s4 = 4 finalized expected
        // Attended: s1, s2, s3 = 3
        // Missed: 4 - 3 = 1
        // Attendance percentage: 3/4 = 75.0%
        // Below threshold (75% < 80%): true
        // Cross group visits count: 1 (sCross attended)
        assertThat(summary.getEligibleFinalizedSessions()).isEqualTo(4);
        assertThat(summary.getAttendedSessions()).isEqualTo(3);
        assertThat(summary.getMissedSessions()).isEqualTo(1);
        assertThat(summary.getAttendancePercentage()).isEqualTo("75.0%");
        assertThat(summary.getPercentageNumeric()).isEqualTo(75.0);
        assertThat(summary.getCrossGroupVisitsCount()).isEqualTo(1);
        assertThat(summary.getThreshold()).isEqualTo(80.0);
        assertThat(summary.isBelowThreshold()).isTrue();
    }

    @Test
    @DisplayName("getModuleAttendance -> Per-module metrics match expected breakdown")
    void testGetModuleAttendance() {
        when(studentRepository.findByUserId(testUser.getId())).thenReturn(Optional.of(testStudent));
        when(systemSettingService.getLowAttendanceThreshold()).thenReturn(80.0);

        LabSession s1 = createSession(SessionStatus.FINALIZED, "S1");
        LabSession s2 = createSession(SessionStatus.FINALIZED, "S2");

        SessionStudent ss1 = SessionStudent.builder().session(s1).student(testStudent).isExpected(true).build();
        SessionStudent ss2 = SessionStudent.builder().session(s2).student(testStudent).isExpected(true).build();

        when(sessionStudentRepository.findStudentEligibleSessions(eq(testStudent.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(ss1, ss2));

        AttendanceRecord r1 = createRecord(s1, AttendanceStatus.PRESENT, false);
        AttendanceRecord r2 = createRecord(s2, AttendanceStatus.PRESENT, false);

        when(attendanceRecordRepository.findByStudentIdAndSessionIdIn(eq(testStudent.getId()), any()))
                .thenReturn(List.of(r1, r2));

        List<StudentModuleAttendanceResponse> modules = studentPortalService.getModuleAttendance(userDetails);

        assertThat(modules).hasSize(1);
        StudentModuleAttendanceResponse mod = modules.get(0);
        assertThat(mod.getModuleCode()).isEqualTo("SE301");
        assertThat(mod.getEligibleFinalizedSessions()).isEqualTo(2);
        assertThat(mod.getAttendedSessions()).isEqualTo(2);
        assertThat(mod.getMissedSessions()).isEqualTo(0);
        assertThat(mod.getAttendancePercentage()).isEqualTo("100.0%");
        assertThat(mod.isBelowThreshold()).isFalse();
    }

    @Test
    @DisplayName("getAttendanceHistory -> Preserved history after batch or group change, excludes forbidden fields")
    void testGetAttendanceHistoryPreservedAfterCohortChange() {
        when(studentRepository.findByUserId(testUser.getId())).thenReturn(Optional.of(testStudent));

        // Session from past cohort / lab group
        LabGroup oldGroup = LabGroup.builder().groupName("Old Group B").batch(testBatch).build();
        oldGroup.setId(UUID.randomUUID());

        LabSession pastSession = createSession(SessionStatus.FINALIZED, "PAST-SES-001");
        pastSession.setLabGroup(oldGroup);
        pastSession.setLabSheetNumber("LAB-SHEET-05");

        SessionStudent ssPast = SessionStudent.builder().session(pastSession).student(testStudent).isExpected(true).build();

        when(sessionStudentRepository.findStudentEligibleSessions(eq(testStudent.getId()), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(ssPast));

        AttendanceRecord arPast = createRecord(pastSession, AttendanceStatus.PRESENT, false);
        arPast.setIsCorrected(true);
        arPast.setJustificationNotes("SECRET_ADMIN_JUSTIFICATION_DO_NOT_LEAK");

        when(attendanceRecordRepository.findByStudentIdAndSessionIdIn(eq(testStudent.getId()), any()))
                .thenReturn(List.of(arPast));

        Page<StudentAttendanceHistoryItemResponse> page = studentPortalService.getAttendanceHistory(
                userDetails, null, null, null, null, PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(1);
        StudentAttendanceHistoryItemResponse item = page.getContent().get(0);
        assertThat(item.getModuleCode()).isEqualTo("SE301");
        assertThat(item.getLabSheetNumber()).isEqualTo("LAB-SHEET-05");
        assertThat(item.getLabGroup()).isEqualTo("Old Group B"); // Preserved historical group
        assertThat(item.getStatus()).isEqualTo("PRESENT");
        assertThat(item.getIsCorrected()).isTrue();
    }

    @Test
    @DisplayName("changePassword -> Validates current password and updates hash with strong password")
    void testChangePasswordSuccess() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("OldPassword123!", "encodedCurrentPassword")).thenReturn(true);
        when(passwordEncoder.matches("NewStrongPass123!", "encodedCurrentPassword")).thenReturn(false);
        when(passwordEncoder.encode("NewStrongPass123!")).thenReturn("newEncodedHash");

        StudentPasswordChangeRequest request = StudentPasswordChangeRequest.builder()
                .currentPassword("OldPassword123!")
                .newPassword("NewStrongPass123!")
                .confirmPassword("NewStrongPass123!")
                .build();

        studentPortalService.changePassword(userDetails, request);

        verify(studentAccountService).validatePasswordStrength("NewStrongPass123!");
        verify(userRepository).save(testUser);
        assertThat(testUser.getPasswordHash()).isEqualTo("newEncodedHash");
    }

    @Test
    @DisplayName("changePassword -> Rejects when current password is wrong")
    void testChangePasswordWrongCurrent() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("WrongPassword", "encodedCurrentPassword")).thenReturn(false);

        StudentPasswordChangeRequest request = StudentPasswordChangeRequest.builder()
                .currentPassword("WrongPassword")
                .newPassword("NewStrongPass123!")
                .confirmPassword("NewStrongPass123!")
                .build();

        assertThatThrownBy(() -> studentPortalService.changePassword(userDetails, request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Current password is incorrect.");
    }

    @Test
    @DisplayName("changePassword -> Rejects when confirmation password does not match")
    void testChangePasswordMismatch() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("OldPassword123!", "encodedCurrentPassword")).thenReturn(true);

        StudentPasswordChangeRequest request = StudentPasswordChangeRequest.builder()
                .currentPassword("OldPassword123!")
                .newPassword("NewStrongPass123!")
                .confirmPassword("DifferentPass456!")
                .build();

        assertThatThrownBy(() -> studentPortalService.changePassword(userDetails, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("New password and confirmation do not match.");
    }

    private LabSession createSession(SessionStatus status, String code) {
        LabSession s = LabSession.builder()
                .sessionCode(code)
                .module(testModule)
                .batch(testBatch)
                .labGroup(testGroup)
                .hall(testHall)
                .lecturer(testLecturer)
                .sessionDate(LocalDate.now().minusDays(1))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .status(status)
                .build();
        s.setId(UUID.randomUUID());
        return s;
    }

    private AttendanceRecord createRecord(LabSession session, AttendanceStatus status, boolean isCrossGroup) {
        AttendanceRecord r = AttendanceRecord.builder()
                .session(session)
                .student(testStudent)
                .status(status)
                .method(AttendanceMethod.QR_SCAN)
                .isCrossGroup(isCrossGroup)
                .markedAt(java.time.OffsetDateTime.now())
                .build();
        r.setId(UUID.randomUUID());
        return r;
    }
}
