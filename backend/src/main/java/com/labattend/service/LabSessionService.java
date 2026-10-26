package com.labattend.service;

import com.labattend.dto.request.LabSessionCancelRequest;
import com.labattend.dto.request.LabSessionCreateRequest;
import com.labattend.dto.request.SessionFinalizeRequest;
import com.labattend.dto.response.LabSessionResponse;
import com.labattend.dto.response.LecturerDashboardResponse;
import com.labattend.dto.response.LecturerSessionOptionsResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.dto.response.SessionSummaryResponse;
import com.labattend.entity.*;
import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class LabSessionService {

    public static final ZoneId COLOMBO_ZONE = ZoneId.of("Asia/Colombo");

    private final LabSessionRepository labSessionRepository;
    private final LecturerRepository lecturerRepository;
    private final ModuleRepository moduleRepository;
    private final BatchRepository batchRepository;
    private final LaboratoryHallRepository laboratoryHallRepository;
    private final LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository;
    private final StudentRepository studentRepository;
    private final SessionStudentRepository sessionStudentRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private final SecureRandom random = new SecureRandom();

    public LabSessionService(LabSessionRepository labSessionRepository,
                             LecturerRepository lecturerRepository,
                             ModuleRepository moduleRepository,
                             BatchRepository batchRepository,
                             LaboratoryHallRepository laboratoryHallRepository,
                             LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository,
                             StudentRepository studentRepository,
                             SessionStudentRepository sessionStudentRepository,
                             AttendanceRecordRepository attendanceRecordRepository,
                             UserRepository userRepository,
                             AuditLogService auditLogService) {
        this.labSessionRepository = labSessionRepository;
        this.lecturerRepository = lecturerRepository;
        this.moduleRepository = moduleRepository;
        this.batchRepository = batchRepository;
        this.laboratoryHallRepository = laboratoryHallRepository;
        this.lecturerModuleAssignmentRepository = lecturerModuleAssignmentRepository;
        this.studentRepository = studentRepository;
        this.sessionStudentRepository = sessionStudentRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    // =========================================================================
    // 1. CREATE LAB SESSION (Lecturer only)
    // =========================================================================
    public LabSessionResponse createSession(UUID userId, LabSessionCreateRequest request) {
        Lecturer lecturer = getLecturerByUserId(userId);

        com.labattend.entity.Module module = moduleRepository.findById(request.getModuleId())
                .orElseThrow(() -> new ResourceNotFoundException("Module", "id", request.getModuleId()));

        Batch batch = batchRepository.findById(request.getBatchId())
                .orElseThrow(() -> new ResourceNotFoundException("Batch", "id", request.getBatchId()));

        LaboratoryHall hall = laboratoryHallRepository.findById(request.getHallId())
                .orElseThrow(() -> new ResourceNotFoundException("LaboratoryHall", "id", request.getHallId()));

        // 1. Validate hall is active
        if (!Boolean.TRUE.equals(hall.getIsActive())) {
            throw new BadRequestException("Selected laboratory hall is inactive: " + hall.getHallCode());
        }

        // 2. Validate module and batch are assigned to THIS lecturer
        boolean isAssigned = lecturerModuleAssignmentRepository.isLecturerAssignedToModuleAndBatch(
                lecturer.getId(), module.getId(), batch.getId()
        );
        if (!isAssigned) {
            throw new BadRequestException(String.format(
                    "Module '%s' and Batch '%s' are not assigned to this lecturer",
                    module.getModuleCode(), batch.getBatchCode()
            ));
        }

        // 3. Time zone and time validation (Asia/Colombo)
        LocalDate todayColombo = LocalDate.now(COLOMBO_ZONE);
        if (request.getSessionDate().isBefore(todayColombo)) {
            throw new BadRequestException("Session date cannot be in the past (" + request.getSessionDate() + ")");
        }

        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new BadRequestException("End time must be strictly after start time");
        }

        // 4. Conflicting session checks (same hall overlap OR same lecturer overlap)
        List<LabSession> hallConflicts = labSessionRepository.findConflictingHallSessions(
                hall.getId(), request.getSessionDate(), request.getStartTime(), request.getEndTime(), null
        );
        if (!hallConflicts.isEmpty()) {
            LabSession conflict = hallConflicts.get(0);
            throw new BadRequestException(String.format(
                    "Hall conflict: '%s' is already occupied by session '%s' (%s - %s)",
                    hall.getHallCode(), conflict.getSessionCode(), conflict.getStartTime(), conflict.getEndTime()
            ));
        }

        List<LabSession> lecturerConflicts = labSessionRepository.findConflictingLecturerSessions(
                lecturer.getId(), request.getSessionDate(), request.getStartTime(), request.getEndTime(), null
        );
        if (!lecturerConflicts.isEmpty()) {
            LabSession conflict = lecturerConflicts.get(0);
            throw new BadRequestException(String.format(
                    "Lecturer schedule conflict: You already have session '%s' scheduled from %s to %s",
                    conflict.getSessionCode(), conflict.getStartTime(), conflict.getEndTime()
            ));
        }

        // 5. Generate unique session_code
        String sessionCode = generateUniqueSessionCode(module.getModuleCode(), request.getSessionDate());

        // 6. Create session in DRAFT state
        LabSession session = LabSession.builder()
                .sessionCode(sessionCode)
                .module(module)
                .batch(batch)
                .lecturer(lecturer)
                .hall(hall)
                .sessionDate(request.getSessionDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(SessionStatus.DRAFT)
                .build();

        LabSession savedSession = labSessionRepository.save(session);

        // 7. Build session_students expected list from selected batch's active enrolled students
        List<Student> enrolledStudents = studentRepository.findByBatchIdAndIsActiveTrue(batch.getId());
        List<SessionStudent> sessionStudentList = new ArrayList<>();
        for (Student student : enrolledStudents) {
            sessionStudentList.add(SessionStudent.builder()
                    .session(savedSession)
                    .student(student)
                    .build());
        }
        sessionStudentRepository.saveAll(sessionStudentList);

        int expectedCount = enrolledStudents.size();
        LabSessionResponse response = mapToResponse(savedSession, expectedCount, 0);

        auditLogService.logAction("LabSession", savedSession.getId(), "CREATE", null, response);

        return response;
    }

    // =========================================================================
    // 2. LECTURER SESSIONS LIST & DETAILS
    // =========================================================================
    @Transactional(readOnly = true)
    public PageResponse<LabSessionResponse> getLecturerSessions(
            UUID userId, SessionStatus status, UUID moduleId, UUID batchId,
            LocalDate startDate, LocalDate endDate, String search,
            int page, int size, String sortBy, String sortDir
    ) {
        Lecturer lecturer = getLecturerByUserId(userId);

        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<LabSession> sessionPage = labSessionRepository.searchSessions(
                lecturer.getId(), moduleId, batchId, null, status, startDate, endDate,
                search != null && !search.isBlank() ? search.trim() : null,
                pageable
        );

        return PageResponse.of(sessionPage.map(this::enrichSessionResponse));
    }

    @Transactional(readOnly = true)
    public LabSessionResponse getLecturerSessionById(UUID userId, UUID sessionId) {
        Lecturer lecturer = getLecturerByUserId(userId);
        LabSession session = labSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("LabSession", "id", sessionId));

        if (!session.getLecturer().getId().equals(lecturer.getId())) {
            throw new BadRequestException("Access denied. You can only view your own lab sessions.");
        }

        return enrichSessionResponse(session);
    }

    // =========================================================================
    // 3. START LAB SESSION (DRAFT -> ACTIVE only)
    // =========================================================================
    public LabSessionResponse startSession(UUID userId, UUID sessionId) {
        Lecturer lecturer = getLecturerByUserId(userId);
        LabSession session = labSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("LabSession", "id", sessionId));

        if (!session.getLecturer().getId().equals(lecturer.getId())) {
            throw new BadRequestException("Access denied. You can only start your own lab sessions.");
        }

        // State Machine validation: only DRAFT (or SCHEDULED) -> ACTIVE
        if (session.getStatus() != SessionStatus.DRAFT && session.getStatus() != SessionStatus.SCHEDULED) {
            throw new BadRequestException(String.format(
                    "Invalid state transition: Cannot start session in '%s' state. Only DRAFT sessions can be started.",
                    session.getStatus()
            ));
        }

        String previousStatus = session.getStatus().name();
        session.setStatus(SessionStatus.ACTIVE);
        session.setActualStartedAt(OffsetDateTime.now(COLOMBO_ZONE));

        LabSession updated = labSessionRepository.save(session);
        LabSessionResponse response = enrichSessionResponse(updated);

        auditLogService.logAction("LabSession", sessionId, "START_SESSION", previousStatus, "ACTIVE");

        return response;
    }

    // =========================================================================
    // 4. CANCEL LAB SESSION (DRAFT/ACTIVE -> CANCELLED only)
    // =========================================================================
    public LabSessionResponse cancelSession(UUID userId, UUID sessionId, LabSessionCancelRequest request) {
        Lecturer lecturer = getLecturerByUserId(userId);
        LabSession session = labSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("LabSession", "id", sessionId));

        if (!session.getLecturer().getId().equals(lecturer.getId())) {
            throw new BadRequestException("Access denied. You can only cancel your own lab sessions.");
        }

        // State Machine validation: only DRAFT / SCHEDULED or ACTIVE -> CANCELLED
        if (session.getStatus() == SessionStatus.FINALIZED || session.getStatus() == SessionStatus.CLOSED) {
            throw new BadRequestException("Invalid state transition: Cannot cancel a finalized / closed session.");
        }
        if (session.getStatus() == SessionStatus.CANCELLED) {
            throw new BadRequestException("Invalid state transition: Session is already cancelled.");
        }

        String previousStatus = session.getStatus().name();
        session.setStatus(SessionStatus.CANCELLED);
        session.setCancellationReason(request.getCancellationReason().trim());
        session.setCancelledAt(OffsetDateTime.now(COLOMBO_ZONE));

        LabSession updated = labSessionRepository.save(session);
        LabSessionResponse response = enrichSessionResponse(updated);

        auditLogService.logAction("LabSession", sessionId, "CANCEL_SESSION", previousStatus,
                "CANCELLED: " + request.getCancellationReason().trim());

        return response;
    }

    // =========================================================================
    // 4b. FINALIZE LAB SESSION (ACTIVE -> FINALIZED with Pessimistic Lock)
    // =========================================================================
    public SessionSummaryResponse finalizeSession(UUID userId, UUID sessionId, SessionFinalizeRequest request) {
        Lecturer lecturer = getLecturerByUserId(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Acquire pessimistic write lock so concurrent scans block until commit
        LabSession session = labSessionRepository.findByIdWithPessimisticLock(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("LabSession", "id", sessionId));

        if (!session.getLecturer().getId().equals(lecturer.getId())) {
            throw new BadRequestException("Access denied. You can only finalize your own lab sessions.");
        }

        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new BadRequestException("Invalid state transition: Only ACTIVE sessions can be finalized. Current status: " + session.getStatus());
        }

        OffsetDateTime now = OffsetDateTime.now(COLOMBO_ZONE);

        // Fetch expected students
        List<SessionStudent> sessionStudents = sessionStudentRepository.findBySessionId(sessionId);

        // Fetch existing attendance records
        List<AttendanceRecord> existingRecords = attendanceRecordRepository.findBySessionId(sessionId);
        Set<UUID> studentsWithExistingAttendance = existingRecords.stream()
                .map(r -> r.getStudent().getId())
                .collect(Collectors.toSet());

        // Create ABSENT records for every expected student without an attendance record
        List<AttendanceRecord> absentRecordsToCreate = new ArrayList<>();
        for (SessionStudent ss : sessionStudents) {
            if (!studentsWithExistingAttendance.contains(ss.getStudent().getId())) {
                AttendanceRecord absentRecord = AttendanceRecord.builder()
                        .student(ss.getStudent())
                        .session(session)
                        .status(AttendanceStatus.ABSENT)
                        .method(AttendanceMethod.MANUAL)
                        .markedAt(now)
                        .markedBy(user)
                        .justificationNotes("System session finalization: student was absent")
                        .isCorrected(false)
                        .build();
                absentRecordsToCreate.add(absentRecord);
            }
        }

        if (!absentRecordsToCreate.isEmpty()) {
            attendanceRecordRepository.saveAll(absentRecordsToCreate);
        }

        // Transition session to FINALIZED
        session.setStatus(SessionStatus.FINALIZED);
        session.setFinalizedAt(now);
        session.setActualEndedAt(now);
        if (request != null && request.getNotes() != null && !request.getNotes().isBlank()) {
            session.setFinalizationNotes(request.getNotes().trim());
        }

        LabSession finalizedSession = labSessionRepository.save(session);

        // Compute final statistics
        long expected = sessionStudents.size();
        long present = attendanceRecordRepository.countBySessionIdAndStatusIn(
                sessionId,
                Arrays.asList(AttendanceStatus.PRESENT, AttendanceStatus.LATE)
        );
        long absent = attendanceRecordRepository.countBySessionIdAndStatus(sessionId, AttendanceStatus.ABSENT);

        // Audit log
        Map<String, Object> previousState = new HashMap<>();
        previousState.put("status", SessionStatus.ACTIVE.name());

        Map<String, Object> newState = new HashMap<>();
        newState.put("status", SessionStatus.FINALIZED.name());
        newState.put("finalizedAt", now.toString());
        newState.put("expected", expected);
        newState.put("present", present);
        newState.put("absent", absent);
        if (request != null && request.getNotes() != null) {
            newState.put("notes", request.getNotes());
        }

        auditLogService.logAction("LabSession", session.getId(), "SESSION_FINALIZED", previousState, newState);

        return buildSessionSummaryResponse(finalizedSession);
    }

    // =========================================================================
    // 4c. SESSION SUMMARY & CONFIRMATION PREVIEW
    // =========================================================================
    @Transactional(readOnly = true)
    public SessionSummaryResponse getSessionSummary(UUID userId, UUID sessionId, boolean isAdmin) {
        LabSession session = labSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("LabSession", "id", sessionId));

        if (!isAdmin) {
            Lecturer lecturer = getLecturerByUserId(userId);
            if (!session.getLecturer().getId().equals(lecturer.getId())) {
                throw new BadRequestException("Access denied. You can only view summaries for your own lab sessions.");
            }
        }

        return buildSessionSummaryResponse(session);
    }

    private SessionSummaryResponse buildSessionSummaryResponse(LabSession session) {
        long expected = sessionStudentRepository.countBySessionId(session.getId());
        long present = attendanceRecordRepository.countBySessionIdAndStatusIn(
                session.getId(),
                Arrays.asList(AttendanceStatus.PRESENT, AttendanceStatus.LATE)
        );

        long absent;
        long unmarked;
        if (session.getStatus() == SessionStatus.FINALIZED) {
            absent = attendanceRecordRepository.countBySessionIdAndStatus(session.getId(), AttendanceStatus.ABSENT);
            unmarked = 0;
        } else {
            // Provisional preview
            unmarked = Math.max(0, expected - present);
            absent = unmarked;
        }

        String percentageStr = (expected == 0)
                ? "N/A"
                : String.format(Locale.US, "%.1f%%", (present * 100.0) / expected);

        return SessionSummaryResponse.builder()
                .sessionId(session.getId())
                .sessionCode(session.getSessionCode())
                .moduleCode(session.getModule() != null ? session.getModule().getModuleCode() : null)
                .moduleName(session.getModule() != null ? session.getModule().getName() : null)
                .batchName(session.getBatch() != null ? session.getBatch().getBatchCode() : null)
                .hallName(session.getHall() != null ? session.getHall().getName() : null)
                .hallCode(session.getHall() != null ? session.getHall().getHallCode() : null)
                .lecturerName(session.getLecturer() != null ? session.getLecturer().getFullName() : null)
                .sessionDate(session.getSessionDate())
                .startTime(session.getStartTime())
                .endTime(session.getEndTime())
                .actualStartedAt(session.getActualStartedAt())
                .actualEndedAt(session.getActualEndedAt())
                .finalizedAt(session.getFinalizedAt())
                .status(session.getStatus().name())
                .isFinalized(session.getStatus() == SessionStatus.FINALIZED)
                .expectedStudentCount(expected)
                .presentCount(present)
                .absentCount(absent)
                .unmarkedCount(unmarked)
                .attendancePercentage(percentageStr)
                .finalizationNotes(session.getFinalizationNotes())
                .build();
    }

    // =========================================================================
    // 5. LECTURER AUTHORIZED OPTIONS (For Create Form Dropdowns)
    // =========================================================================
    @Transactional(readOnly = true)
    public LecturerSessionOptionsResponse getLecturerFormOptions(UUID userId) {
        Lecturer lecturer = getLecturerByUserId(userId);

        List<LecturerModuleAssignment> assignments =
                lecturerModuleAssignmentRepository.findByLecturerIdAndIsActiveTrue(lecturer.getId());

        // Group assignments by module
        Map<UUID, List<LecturerModuleAssignment>> byModule = assignments.stream()
                .collect(Collectors.groupingBy(a -> a.getModule().getId()));

        List<LecturerSessionOptionsResponse.AuthorizedModuleOption> moduleOptions = new ArrayList<>();

        for (Map.Entry<UUID, List<LecturerModuleAssignment>> entry : byModule.entrySet()) {
            com.labattend.entity.Module module = entry.getValue().get(0).getModule();

            List<LecturerSessionOptionsResponse.AuthorizedBatchOption> batchOptions = new ArrayList<>();
            Set<UUID> addedBatchIds = new HashSet<>();

            for (LecturerModuleAssignment lma : entry.getValue()) {
                if (lma.getBatch() != null && addedBatchIds.add(lma.getBatch().getId())) {
                    long count = studentRepository.countByBatchIdAndIsActiveTrue(lma.getBatch().getId());
                    batchOptions.add(LecturerSessionOptionsResponse.AuthorizedBatchOption.builder()
                            .batchId(lma.getBatch().getId())
                            .batchCode(lma.getBatch().getBatchCode())
                            .academicYear(lma.getBatch().getAcademicYear())
                            .enrolledStudentCount(count)
                            .build());
                }
            }

            moduleOptions.add(LecturerSessionOptionsResponse.AuthorizedModuleOption.builder()
                    .moduleId(module.getId())
                    .moduleCode(module.getModuleCode())
                    .moduleName(module.getName())
                    .batches(batchOptions)
                    .build());
        }

        List<LaboratoryHall> halls = laboratoryHallRepository.findByIsActiveTrue();
        List<LecturerSessionOptionsResponse.ActiveHallOption> hallOptions = halls.stream()
                .map(h -> LecturerSessionOptionsResponse.ActiveHallOption.builder()
                        .hallId(h.getId())
                        .hallCode(h.getHallCode())
                        .name(h.getName())
                        .capacity(h.getCapacity())
                        .location(h.getLocation())
                        .build())
                .collect(Collectors.toList());

        return LecturerSessionOptionsResponse.builder()
                .modules(moduleOptions)
                .halls(hallOptions)
                .build();
    }

    // =========================================================================
    // 6. LECTURER DASHBOARD (Real data metrics and session rosters)
    // =========================================================================
    @Transactional(readOnly = true)
    public LecturerDashboardResponse getLecturerDashboard(UUID userId) {
        Lecturer lecturer = getLecturerByUserId(userId);
        LocalDate today = LocalDate.now(COLOMBO_ZONE);

        List<LabSession> todaySessions = labSessionRepository.findLecturerSessionsOnDate(lecturer.getId(), today);
        List<LabSession> upcomingSessions = labSessionRepository.findLecturerUpcomingSessions(lecturer.getId(), today);

        List<LecturerModuleAssignment> assignments =
                lecturerModuleAssignmentRepository.findByLecturerIdAndIsActiveTrue(lecturer.getId());

        long assignedModulesCount = assignments.stream().map(a -> a.getModule().getId()).distinct().count();
        long assignedBatchesCount = assignments.stream()
                .filter(a -> a.getBatch() != null)
                .map(a -> a.getBatch().getId()).distinct().count();

        long completedSessionsCount = labSessionRepository.countByLecturerIdAndStatusIn(
                lecturer.getId(), Arrays.asList(SessionStatus.FINALIZED, SessionStatus.CLOSED)
        );

        // Average attendance percentage across completed sessions
        List<LabSession> allSessions = labSessionRepository.findByLecturerId(lecturer.getId());
        List<LabSession> finalizedSessions = allSessions.stream()
                .filter(s -> s.getStatus() == SessionStatus.FINALIZED || s.getStatus() == SessionStatus.CLOSED)
                .collect(Collectors.toList());

        Double averageAttendance = null;
        if (!finalizedSessions.isEmpty()) {
            double totalPercentages = 0.0;
            int validSessions = 0;

            for (LabSession s : finalizedSessions) {
                long total = sessionStudentRepository.countBySessionId(s.getId());
                if (total > 0) {
                    long attended = attendanceRecordRepository.countBySessionIdAndStatusIn(
                            s.getId(), Arrays.asList(AttendanceStatus.PRESENT, AttendanceStatus.LATE)
                    );
                    totalPercentages += ((double) attended / total) * 100.0;
                    validSessions++;
                }
            }

            if (validSessions > 0) {
                averageAttendance = Math.round((totalPercentages / validSessions) * 10.0) / 10.0;
            }
        }

        return LecturerDashboardResponse.builder()
                .todaySessions(todaySessions.stream().map(this::enrichSessionResponse).collect(Collectors.toList()))
                .upcomingSessions(upcomingSessions.stream().map(this::enrichSessionResponse).collect(Collectors.toList()))
                .totalAssignedModules(assignedModulesCount)
                .totalAssignedBatches(assignedBatchesCount)
                .totalCompletedSessions(completedSessionsCount)
                .averageAttendancePercentage(averageAttendance)
                .build();
    }

    // =========================================================================
    // 7. ADMIN READ-ONLY ENDPOINTS
    // =========================================================================
    @Transactional(readOnly = true)
    public PageResponse<LabSessionResponse> getAllSessionsForAdmin(
            UUID lecturerId, UUID moduleId, UUID batchId, UUID hallId,
            SessionStatus status, LocalDate startDate, LocalDate endDate,
            String search, int page, int size, String sortBy, String sortDir
    ) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<LabSession> sessionPage = labSessionRepository.searchSessions(
                lecturerId, moduleId, batchId, hallId, status, startDate, endDate,
                search != null && !search.isBlank() ? search.trim() : null,
                pageable
        );

        return PageResponse.of(sessionPage.map(this::enrichSessionResponse));
    }

    @Transactional(readOnly = true)
    public LabSessionResponse getSessionByIdForAdmin(UUID id) {
        LabSession session = labSessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LabSession", "id", id));
        return enrichSessionResponse(session);
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================
    private Lecturer getLecturerByUserId(UUID userId) {
        return lecturerRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("Authenticated user has no associated lecturer faculty profile"));
    }

    private LabSessionResponse enrichSessionResponse(LabSession s) {
        int expected = (int) sessionStudentRepository.countBySessionId(s.getId());
        int attended = (int) attendanceRecordRepository.countBySessionIdAndStatusIn(
                s.getId(), Arrays.asList(AttendanceStatus.PRESENT, AttendanceStatus.LATE)
        );
        return mapToResponse(s, expected, attended);
    }

    private LabSessionResponse mapToResponse(LabSession s, int expectedCount, int attendedCount) {
        return LabSessionResponse.builder()
                .id(s.getId())
                .sessionCode(s.getSessionCode())
                .moduleId(s.getModule() != null ? s.getModule().getId() : null)
                .moduleCode(s.getModule() != null ? s.getModule().getModuleCode() : null)
                .moduleName(s.getModule() != null ? s.getModule().getName() : null)
                .batchId(s.getBatch() != null ? s.getBatch().getId() : null)
                .batchCode(s.getBatch() != null ? s.getBatch().getBatchCode() : null)
                .batchAcademicYear(s.getBatch() != null ? s.getBatch().getAcademicYear() : null)
                .lecturerId(s.getLecturer() != null ? s.getLecturer().getId() : null)
                .lecturerName(s.getLecturer() != null ? s.getLecturer().getFullName() : null)
                .lecturerStaffId(s.getLecturer() != null ? s.getLecturer().getStaffId() : null)
                .hallId(s.getHall() != null ? s.getHall().getId() : null)
                .hallCode(s.getHall() != null ? s.getHall().getHallCode() : null)
                .hallName(s.getHall() != null ? s.getHall().getName() : null)
                .hallCapacity(s.getHall() != null ? s.getHall().getCapacity() : null)
                .sessionDate(s.getSessionDate())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .status(s.getStatus().name())
                .expectedStudentCount(expectedCount)
                .attendedCount(attendedCount)
                .actualStartedAt(s.getActualStartedAt())
                .cancelledAt(s.getCancelledAt())
                .cancellationReason(s.getCancellationReason())
                .finalizationNotes(s.getFinalizationNotes())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }

    private String generateUniqueSessionCode(String moduleCode, LocalDate date) {
        String cleanModule = moduleCode.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        String datePart = date.format(DateTimeFormatter.ofPattern("yyMMdd"));

        for (int i = 0; i < 20; i++) {
            StringBuilder suffix = new StringBuilder(4);
            for (int j = 0; j < 4; j++) {
                suffix.append(CODE_CHARS.charAt(random.nextInt(CODE_CHARS.length())));
            }
            String candidate = "SES-" + cleanModule + "-" + datePart + "-" + suffix;
            if (!labSessionRepository.existsBySessionCode(candidate)) {
                return candidate;
            }
        }

        return "SES-" + cleanModule + "-" + System.currentTimeMillis();
    }
}
