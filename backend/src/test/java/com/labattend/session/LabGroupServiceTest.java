package com.labattend.session;

import com.labattend.dto.request.BulkAssignGroupRequest;
import com.labattend.dto.request.LabGroupRequest;
import com.labattend.dto.request.LabSessionCreateRequest;
import com.labattend.dto.request.StudentRequest;
import com.labattend.entity.*;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.repository.*;
import com.labattend.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class LabGroupServiceTest {

    @Mock
    private LabGroupRepository labGroupRepository;
    @Mock
    private BatchRepository batchRepository;
    @Mock
    private StudentRepository studentRepository;
    @Mock
    private DegreeProgrammeRepository degreeProgrammeRepository;
    @Mock
    private LecturerRepository lecturerRepository;
    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private LaboratoryHallRepository laboratoryHallRepository;
    @Mock
    private LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository;
    @Mock
    private LabSessionRepository labSessionRepository;
    @Mock
    private SessionStudentRepository sessionStudentRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditLogService auditLogService;

    private LabGroupService labGroupService;
    private StudentService studentService;
    private LabSessionService labSessionService;

    private Batch batch1;
    private Batch batch2;
    private LabGroup groupA;
    private LabGroup groupBFromOtherBatch;
    private Lecturer lecturer;
    private com.labattend.entity.Module module;
    private LaboratoryHall hall;
    private UUID userId;

    @BeforeEach
    void setUp() {
        labGroupService = new LabGroupService(
                labGroupRepository,
                batchRepository,
                studentRepository,
                auditLogService
        );

        studentService = new StudentService(
                studentRepository,
                degreeProgrammeRepository,
                batchRepository,
                labGroupRepository,
                sessionStudentRepository,
                attendanceRecordRepository,
                auditLogService
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

        DegreeProgramme prog = DegreeProgramme.builder()
                .code("SE")
                .name("Software Engineering")
                .build();
        prog.setId(UUID.randomUUID());

        batch1 = Batch.builder()
                .batchCode("2024-SE")
                .degreeProgramme(prog)
                .build();
        batch1.setId(UUID.randomUUID());

        batch2 = Batch.builder()
                .batchCode("2024-CS")
                .degreeProgramme(prog)
                .build();
        batch2.setId(UUID.randomUUID());

        groupA = LabGroup.builder()
                .groupName("Group A")
                .batch(batch1)
                .isActive(true)
                .build();
        groupA.setId(UUID.randomUUID());

        groupBFromOtherBatch = LabGroup.builder()
                .groupName("Group B")
                .batch(batch2)
                .isActive(true)
                .build();
        groupBFromOtherBatch.setId(UUID.randomUUID());

        userId = UUID.randomUUID();
        User user = User.builder().email("dr.perera@labattend.com").role(Role.LECTURER).build();
        user.setId(userId);

        lecturer = Lecturer.builder()
                .user(user)
                .fullName("Dr. Perera")
                .staffId("LEC001")
                .build();
        lecturer.setId(UUID.randomUUID());

        module = com.labattend.entity.Module.builder()
                .moduleCode("CS301")
                .name("Database Systems")
                .build();
        module.setId(UUID.randomUUID());

        hall = LaboratoryHall.builder()
                .hallCode("LAB-1")
                .name("Main Lab")
                .capacity(60)
                .isActive(true)
                .build();
        hall.setId(UUID.randomUUID());
    }

    // =========================================================================
    // TEST 1: Unique group name per batch
    // =========================================================================
    @Test
    @DisplayName("Create Group: Duplicate group name within same batch -> Throws BadRequestException")
    void testUniqueGroupNamePerBatch() {
        when(batchRepository.findById(batch1.getId())).thenReturn(Optional.of(batch1));
        when(labGroupRepository.existsByBatchIdAndGroupNameIgnoreCase(batch1.getId(), "Group A")).thenReturn(true);

        LabGroupRequest request = LabGroupRequest.builder()
                .groupName("Group A")
                .isActive(true)
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                labGroupService.createGroup(batch1.getId(), request)
        );

        assertTrue(ex.getMessage().contains("already exists for batch"));
        verify(labGroupRepository, never()).save(any());
    }

    // =========================================================================
    // TEST 2: Group must belong to student's batch
    // =========================================================================
    @Test
    @DisplayName("Student Creation: Assigning group from different batch -> Throws BadRequestException")
    void testGroupMustBelongToBatchOnStudentCreation() {
        when(degreeProgrammeRepository.findById(any())).thenReturn(Optional.of(batch1.getDegreeProgramme()));
        when(batchRepository.findById(batch1.getId())).thenReturn(Optional.of(batch1));
        when(labGroupRepository.findById(groupBFromOtherBatch.getId())).thenReturn(Optional.of(groupBFromOtherBatch));

        StudentRequest request = StudentRequest.builder()
                .studentId("IT210001")
                .fullName("Kamal Silva")
                .email("kamal@students.labattend.com")
                .degreeProgrammeId(batch1.getDegreeProgramme().getId())
                .batchId(batch1.getId())
                .labGroupId(groupBFromOtherBatch.getId()) // group belongs to batch2, student is in batch1!
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                studentService.createStudent(request)
        );

        assertTrue(ex.getMessage().contains("does not belong to the selected batch"));
        verify(studentRepository, never()).save(any());
    }

    // =========================================================================
    // TEST 3: Lecturer cannot create a session for an unassigned group
    // =========================================================================
    @Test
    @DisplayName("Session Creation: Lecturer assigned only to Group A cannot create session for Group B -> Throws BadRequestException")
    void testLecturerCannotCreateSessionForUnassignedGroup() {
        LabGroup groupB = LabGroup.builder()
                .groupName("Group B")
                .batch(batch1)
                .isActive(true)
                .build();
        groupB.setId(UUID.randomUUID());

        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(moduleRepository.findById(module.getId())).thenReturn(Optional.of(module));
        when(batchRepository.findById(batch1.getId())).thenReturn(Optional.of(batch1));
        when(laboratoryHallRepository.findById(hall.getId())).thenReturn(Optional.of(hall));
        when(labGroupRepository.findById(groupB.getId())).thenReturn(Optional.of(groupB));

        // Lecturer is NOT assigned to groupB
        when(lecturerModuleAssignmentRepository.isLecturerAssignedToModuleBatchAndGroup(
                lecturer.getId(), module.getId(), batch1.getId(), groupB.getId()
        )).thenReturn(false);

        LabSessionCreateRequest request = LabSessionCreateRequest.builder()
                .moduleId(module.getId())
                .batchId(batch1.getId())
                .labGroupId(groupB.getId())
                .hallId(hall.getId())
                .sessionDate(LocalDate.now(LabSessionService.COLOMBO_ZONE).plusDays(1))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                labSessionService.createSession(userId, request)
        );

        assertTrue(ex.getMessage().contains("not assigned to conduct sessions"));
        verify(labSessionRepository, never()).save(any());
    }

    // =========================================================================
    // TEST 4: Expected list contains ONLY active students in that group
    // =========================================================================
    @Test
    @DisplayName("Session Creation: When lab_group_id is set, expected list contains only active students in that group")
    void testExpectedListContainsOnlyGroupStudents() {
        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(moduleRepository.findById(module.getId())).thenReturn(Optional.of(module));
        when(batchRepository.findById(batch1.getId())).thenReturn(Optional.of(batch1));
        when(laboratoryHallRepository.findById(hall.getId())).thenReturn(Optional.of(hall));
        when(labGroupRepository.findById(groupA.getId())).thenReturn(Optional.of(groupA));

        when(lecturerModuleAssignmentRepository.isLecturerAssignedToModuleBatchAndGroup(
                lecturer.getId(), module.getId(), batch1.getId(), groupA.getId()
        )).thenReturn(true);

        when(labSessionRepository.findConflictingHallSessions(any(), any(), any(), any(), any())).thenReturn(Collections.emptyList());
        when(labSessionRepository.findConflictingLecturerSessions(any(), any(), any(), any(), any())).thenReturn(Collections.emptyList());
        when(labSessionRepository.findConflictingBatchOrGroupSessions(any(), any(), any(), any(), any(), any())).thenReturn(Collections.emptyList());

        LabSession savedSessionMock = LabSession.builder()
                .sessionCode("SES-CS301-261027-A1B2")
                .module(module)
                .batch(batch1)
                .labGroup(groupA)
                .lecturer(lecturer)
                .hall(hall)
                .status(SessionStatus.DRAFT)
                .build();
        savedSessionMock.setId(UUID.randomUUID());
        when(labSessionRepository.save(any(LabSession.class))).thenReturn(savedSessionMock);

        // Group A has 2 students
        Student s1 = Student.builder().studentId("IT210001").fullName("Student 1").batch(batch1).labGroup(groupA).isActive(true).build();
        s1.setId(UUID.randomUUID());
        Student s2 = Student.builder().studentId("IT210002").fullName("Student 2").batch(batch1).labGroup(groupA).isActive(true).build();
        s2.setId(UUID.randomUUID());
        when(studentRepository.findByBatchIdAndLabGroupIdAndIsActiveTrue(batch1.getId(), groupA.getId()))
                .thenReturn(List.of(s1, s2));

        LabSessionCreateRequest request = LabSessionCreateRequest.builder()
                .moduleId(module.getId())
                .batchId(batch1.getId())
                .labGroupId(groupA.getId())
                .hallId(hall.getId())
                .sessionDate(LocalDate.now(LabSessionService.COLOMBO_ZONE).plusDays(1))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .build();

        labSessionService.createSession(userId, request);

        // Verify only Group A students were passed to session_students
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<SessionStudent>> captor = ArgumentCaptor.forClass(List.class);
        verify(sessionStudentRepository).saveAll(captor.capture());

        List<SessionStudent> savedList = captor.getValue();
        assertEquals(2, savedList.size());
        assertEquals(s1.getId(), savedList.get(0).getStudent().getId());
        assertEquals(groupA.getId(), savedList.get(0).getHomeLabGroup().getId());
        assertEquals(s2.getId(), savedList.get(1).getStudent().getId());
        assertEquals(groupA.getId(), savedList.get(1).getHomeLabGroup().getId());
    }

    // =========================================================================
    // TEST 5: Changing a student's group preserves history
    // =========================================================================
    @Test
    @DisplayName("History Preservation: Changing a student's group does NOT alter existing session_students rows")
    void testGroupChangePreservesHistory() {
        Student existingStudent = Student.builder()
                .studentId("IT210001")
                .fullName("Nimal Perera")
                .email("nimal@students.labattend.com")
                .degreeProgramme(batch1.getDegreeProgramme())
                .batch(batch1)
                .labGroup(groupA)
                .isActive(true)
                .build();
        existingStudent.setId(UUID.randomUUID());

        LabGroup groupB = LabGroup.builder()
                .groupName("Group B")
                .batch(batch1)
                .isActive(true)
                .build();
        groupB.setId(UUID.randomUUID());

        when(studentRepository.findById(existingStudent.getId())).thenReturn(Optional.of(existingStudent));
        when(degreeProgrammeRepository.findById(batch1.getDegreeProgramme().getId())).thenReturn(Optional.of(batch1.getDegreeProgramme()));
        when(batchRepository.findById(batch1.getId())).thenReturn(Optional.of(batch1));
        when(labGroupRepository.findById(groupB.getId())).thenReturn(Optional.of(groupB));
        when(studentRepository.save(any(Student.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Update student to groupB
        StudentRequest updateRequest = StudentRequest.builder()
                .studentId("IT210001")
                .fullName("Nimal Perera")
                .email("nimal@students.labattend.com")
                .degreeProgrammeId(batch1.getDegreeProgramme().getId())
                .batchId(batch1.getId())
                .labGroupId(groupB.getId())
                .build();

        studentService.updateStudent(existingStudent.getId(), updateRequest);

        // Verify student record updated
        assertEquals(groupB.getId(), existingStudent.getLabGroup().getId());

        // CRITICAL: Verify NO changes were made to existing session_students or attendance_records
        verify(sessionStudentRepository, never()).save(any());
        verify(sessionStudentRepository, never()).saveAll(any());
        verify(sessionStudentRepository, never()).delete(any());
        verify(sessionStudentRepository, never()).deleteAll(any());
        verify(attendanceRecordRepository, never()).save(any());
        verify(attendanceRecordRepository, never()).delete(any());
    }
}
