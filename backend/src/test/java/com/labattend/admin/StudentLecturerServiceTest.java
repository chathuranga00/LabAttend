package com.labattend.admin;

import com.labattend.dto.request.LecturerCreateRequest;
import com.labattend.dto.request.LoginRequest;
import com.labattend.dto.request.StudentRequest;
import com.labattend.dto.response.LecturerResponse;
import com.labattend.dto.response.StudentCsvImportResponse;
import com.labattend.dto.response.StudentResponse;
import com.labattend.entity.*;
import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.repository.*;
import com.labattend.security.JwtService;
import com.labattend.service.AuditLogService;
import com.labattend.service.AuthService;
import com.labattend.service.LecturerService;
import com.labattend.service.StudentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StudentLecturerServiceTest {

    @Mock
    private StudentRepository studentRepository;
    @Mock
    private DegreeProgrammeRepository degreeProgrammeRepository;
    @Mock
    private BatchRepository batchRepository;
    @Mock
    private com.labattend.repository.LabGroupRepository labGroupRepository;
    @Mock
    private SessionStudentRepository sessionStudentRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private AuditLogService auditLogService;

    @Mock
    private LecturerRepository lecturerRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;

    private StudentService studentService;
    private LecturerService lecturerService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        studentService = new StudentService(
                studentRepository,
                degreeProgrammeRepository,
                batchRepository,
                labGroupRepository,
                sessionStudentRepository,
                attendanceRecordRepository,
                auditLogService
        );

        lecturerService = new LecturerService(
                lecturerRepository,
                userRepository,
                passwordEncoder,
                auditLogService
        );

        authService = new AuthService(
                userRepository,
                lecturerRepository,
                passwordEncoder,
                jwtService
        );
    }

    @Test
    @DisplayName("Batch Change Preserves History -> Moving student to new batch leaves historical session_students untouched")
    void testBatchChangePreservesHistoricalSessionsAndAttendance() {
        // Arrange
        UUID studentId = UUID.randomUUID();
        UUID programmeId = UUID.randomUUID();
        UUID batchAId = UUID.randomUUID();
        UUID batchBId = UUID.randomUUID();
        UUID pastSessionId = UUID.randomUUID();

        DegreeProgramme programme = DegreeProgramme.builder()
                .code("SE")
                .name("Software Engineering")
                .build();
        programme.setId(programmeId);

        Batch batchA = Batch.builder()
                .batchCode("BATCH-2024")
                .degreeProgramme(programme)
                .build();
        batchA.setId(batchAId);

        Batch batchB = Batch.builder()
                .batchCode("BATCH-2025")
                .degreeProgramme(programme)
                .build();
        batchB.setId(batchBId);

        Student student = Student.builder()
                .studentId("STU100")
                .fullName("Original Name")
                .email("original@uni.ac.lk")
                .degreeProgramme(programme)
                .batch(batchA)
                .isActive(true)
                .build();
        student.setId(studentId);

        // Past session that is CLOSED
        LabSession pastSession = LabSession.builder()
                .sessionCode("SES-001")
                .status(SessionStatus.CLOSED)
                .sessionDate(LocalDate.now().minusDays(10))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .build();
        pastSession.setId(pastSessionId);

        SessionStudent historicalSessionStudent = SessionStudent.builder()
                .session(pastSession)
                .student(student)
                .build();
        historicalSessionStudent.setId(UUID.randomUUID());

        AttendanceRecord historicalAttendanceRecord = AttendanceRecord.builder()
                .session(pastSession)
                .student(student)
                .status(AttendanceStatus.PRESENT)
                .method(AttendanceMethod.QR_SCAN)
                .markedAt(OffsetDateTime.now().minusDays(10))
                .build();
        historicalAttendanceRecord.setId(UUID.randomUUID());

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(degreeProgrammeRepository.findById(programmeId)).thenReturn(Optional.of(programme));
        when(batchRepository.findById(batchBId)).thenReturn(Optional.of(batchB));
        when(studentRepository.save(any(Student.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act: Update student to move to Batch B
        StudentRequest updateRequest = StudentRequest.builder()
                .studentId("STU100")
                .fullName("Original Name")
                .email("original@uni.ac.lk")
                .degreeProgrammeId(programmeId)
                .batchId(batchBId)
                .build();

        StudentResponse response = studentService.updateStudent(studentId, updateRequest);

        // Assert
        assertEquals("BATCH-2025", response.getBatchCode());
        assertEquals(batchBId, response.getBatchId());

        // CRITICAL INVARIANT: sessionStudentRepository and attendanceRecordRepository were NEVER modified or deleted
        verify(sessionStudentRepository, never()).delete(any());
        verify(sessionStudentRepository, never()).deleteAll(any());
        verify(sessionStudentRepository, never()).deleteById(any());
        verify(sessionStudentRepository, never()).save(any());

        verify(attendanceRecordRepository, never()).delete(any());
        verify(attendanceRecordRepository, never()).deleteAll(any());
        verify(attendanceRecordRepository, never()).deleteById(any());
        verify(attendanceRecordRepository, never()).save(any());

        // Historical enrollment and attendance record remain intact
        assertEquals(student, historicalSessionStudent.getStudent());
        assertEquals(pastSession, historicalSessionStudent.getSession());
        assertEquals(AttendanceStatus.PRESENT, historicalAttendanceRecord.getStatus());
    }

    @Test
    @DisplayName("Deactivated Lecturer Cannot Log In -> When lecturer is deactivated, login fails with BadCredentialsException")
    void testDeactivatedLecturerCannotLogin() {
        // Arrange
        UUID lecturerId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        User lecturerUser = User.builder()
                .email("lecturer.active@uni.ac.lk")
                .fullName("Dr. Bob")
                .passwordHash("encodedPassword")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUser.setId(userId);

        Lecturer lecturer = Lecturer.builder()
                .user(lecturerUser)
                .staffId("LEC-500")
                .fullName("Dr. Bob")
                .department("Computing")
                .isActive(true)
                .build();
        lecturer.setId(lecturerId);

        when(lecturerRepository.findById(lecturerId)).thenReturn(Optional.of(lecturer));
        when(lecturerRepository.save(any(Lecturer.class))).thenAnswer(i -> i.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        // Act 1: Deactivate the lecturer via LecturerService
        LecturerResponse toggleResult = lecturerService.toggleStatus(lecturerId);
        assertFalse(toggleResult.getIsActive(), "Lecturer status should be inactive");
        assertFalse(lecturerUser.getIsActive(), "User entity isActive must cascade to false");

        // Act 2: Attempt login with the deactivated user account
        when(userRepository.findByEmail("lecturer.active@uni.ac.lk")).thenReturn(Optional.of(lecturerUser));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("lecturer.active@uni.ac.lk")
                .password("CorrectPassword123!")
                .build();

        // Assert: Login fails because user is deactivated
        BadCredentialsException exception = assertThrows(
                BadCredentialsException.class,
                () -> authService.login(loginRequest)
        );
        assertEquals("Email or password is incorrect.", exception.getMessage());
    }

    @Test
    @DisplayName("CSV Bulk Import -> Imports valid students and reports detailed per-row errors")
    void testCsvBulkImportValidation() {
        // Arrange
        UUID progId = UUID.randomUUID();
        DegreeProgramme prog = DegreeProgramme.builder()
                .code("SE")
                .name("Software Engineering")
                .build();
        prog.setId(progId);

        Batch batch = Batch.builder()
                .batchCode("Y2026-B1")
                .degreeProgramme(prog)
                .build();
        batch.setId(UUID.randomUUID());

        when(degreeProgrammeRepository.findByCode("SE")).thenReturn(Optional.of(prog));
        when(batchRepository.findByBatchCode("Y2026-B1")).thenReturn(Optional.of(batch));

        when(studentRepository.existsByStudentId("STU001")).thenReturn(false);
        when(studentRepository.existsByEmail("alice@uni.ac.lk")).thenReturn(false);

        when(studentRepository.existsByStudentId("STU002")).thenReturn(true); // duplicate
        when(studentRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));

        String csvContent = "student_id,full_name,email,degree_programme_code,batch_code,qr_token\n"
                + "STU001,Alice Smith,alice@uni.ac.lk,SE,Y2026-B1,QR-TOKEN-ALICE\n"
                + "STU002,Bob Jones,bob@uni.ac.lk,SE,Y2026-B1,QR-TOKEN-BOB\n" // duplicate student ID
                + ",Invalid Name,invalid@uni.ac.lk,SE,Y2026-B1,\n"; // missing student ID

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "students.csv",
                "text/csv",
                csvContent.getBytes(StandardCharsets.UTF_8)
        );

        // Act
        StudentCsvImportResponse result = studentService.importStudentsFromCsv(file);

        // Assert
        assertEquals(3, result.getTotalRows());
        assertEquals(1, result.getSuccessCount());
        assertEquals(2, result.getFailureCount());
        assertEquals(2, result.getErrors().size());

        // Check error row 2 (duplicate student ID)
        assertTrue(result.getErrors().stream().anyMatch(e -> e.getRowNumber() == 2 && e.getError().contains("already exists")));

        // Check error row 3 (missing student ID)
        assertTrue(result.getErrors().stream().anyMatch(e -> e.getRowNumber() == 3 && e.getError().contains("Missing student ID")));

        // Verify saveAll was called with the 1 successful student
        verify(studentRepository, times(1)).saveAll(argThat(list -> ((List<?>) list).size() == 1));
    }
}
