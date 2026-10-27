package com.labattend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.dto.request.AttendanceCorrectionRequest;
import com.labattend.dto.request.AttendanceScanRequest;
import com.labattend.dto.request.ManualAttendanceRequest;
import com.labattend.dto.response.AttendanceRecordResponse;
import com.labattend.dto.response.AttendanceScanResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.dto.response.SessionExpectedStudentResponse;
import com.labattend.entity.*;
import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.*;
import com.labattend.util.HashUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AttendanceService {

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final SessionStudentRepository sessionStudentRepository;
    private final LabSessionRepository labSessionRepository;
    private final StudentRepository studentRepository;
    private final LecturerRepository lecturerRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final QrCodeService qrCodeService;

    public AttendanceService(
            AttendanceRecordRepository attendanceRecordRepository,
            SessionStudentRepository sessionStudentRepository,
            LabSessionRepository labSessionRepository,
            StudentRepository studentRepository,
            LecturerRepository lecturerRepository,
            UserRepository userRepository,
            AuditLogService auditLogService,
            QrCodeService qrCodeService
    ) {
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.sessionStudentRepository = sessionStudentRepository;
        this.labSessionRepository = labSessionRepository;
        this.studentRepository = studentRepository;
        this.lecturerRepository = lecturerRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.qrCodeService = qrCodeService;
    }

    @Transactional(noRollbackFor = DataIntegrityViolationException.class)
    public AttendanceScanResponse scanQrAttendance(UUID userId, UUID sessionId, AttendanceScanRequest request) {
        // 1. Authenticate lecturer and verify ownership
        Lecturer lecturer = getAuthorizedLecturer(userId);
        LabSession session = getSessionAndVerifyOwnership(sessionId, lecturer);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // 2. Verify session status is ACTIVE
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new BadRequestException("Attendance Is Closed for This Session. This session is not accepting attendance scans.");
        }

        // 3. Resolve identifier to a student per docs/ASSUMPTIONS.md
        String rawIdentifier = request.getIdentifier() != null ? request.getIdentifier().trim() : "";
        if (rawIdentifier.isBlank()) {
            throw new BadRequestException("Invalid QR Code — Student Not Found");
        }

        Student student = resolveStudent(rawIdentifier)
                .orElseThrow(() -> new BadRequestException("Invalid QR Code — Student Not Found"));

        // 4. Duplicate check FIRST
        Optional<AttendanceRecord> existingOpt = attendanceRecordRepository.findBySessionIdAndStudentId(session.getId(), student.getId());
        if (existingOpt.isPresent() && (existingOpt.get().getStatus() == AttendanceStatus.PRESENT || existingOpt.get().getStatus() == AttendanceStatus.LATE)) {
            AttendanceRecord existing = existingOpt.get();
            return buildScanResponse(
                    "ALREADY_MARKED",
                    "Already Marked Present",
                    session,
                    student,
                    existing.getMarkedAt(),
                    existing.getStatus(),
                    existing.getMethod(),
                    Boolean.TRUE.equals(existing.getIsCrossGroup())
            );
        }

        // 5. Determine if student is in expected list or cross-group
        Optional<SessionStudent> sessionStudentOpt = sessionStudentRepository.findBySessionIdAndStudentId(session.getId(), student.getId());
        boolean isExpected = sessionStudentOpt.isPresent()
                ? Boolean.TRUE.equals(sessionStudentOpt.get().getIsExpected())
                : sessionStudentRepository.existsBySessionIdAndStudentId(session.getId(), student.getId());

        boolean isCrossGroup = false;
        LabGroup homeLabGroup = null;

        if (isExpected) {
            isCrossGroup = false;
        } else {
            // Not in expected list
            // Verify student is in the same batch
            if (student.getBatch() == null || session.getBatch() == null ||
                !student.getBatch().getId().equals(session.getBatch().getId())) {
                throw new BadRequestException("Student Is Not Assigned to This Session");
            }

            // Cross-group only applies to group sessions
            if (session.getLabGroup() == null) {
                throw new BadRequestException("Student Is Not Assigned to This Session");
            }

            if (student.getLabGroup() != null && student.getLabGroup().getId().equals(session.getLabGroup().getId())) {
                isCrossGroup = false;
            } else {
                isCrossGroup = true;
                homeLabGroup = student.getLabGroup();
            }

            // Register visitor in session_students with is_expected = false so visitors are kept as extra rows
            if (sessionStudentOpt.isEmpty()) {
                SessionStudent visitor = SessionStudent.builder()
                        .session(session)
                        .student(student)
                        .homeLabGroup(homeLabGroup)
                        .isExpected(!isCrossGroup)
                        .build();
                try {
                    sessionStudentRepository.save(visitor);
                } catch (DataIntegrityViolationException ignored) {
                    // Handled if concurrent insert occurred
                }
            }
        }

        // 6. Insert attendance record
        OffsetDateTime now = OffsetDateTime.now();
        String homeGroupName = homeLabGroup != null ? homeLabGroup.getGroupName() : (student.getLabGroup() != null ? student.getLabGroup().getGroupName() : "Unknown");
        String sessionGroupName = session.getLabGroup() != null ? session.getLabGroup().getGroupName() : "Whole Batch";

        AttendanceRecord record = AttendanceRecord.builder()
                .session(session)
                .student(student)
                .status(AttendanceStatus.PRESENT)
                .method(AttendanceMethod.QR_SCAN)
                .markedAt(now)
                .markedBy(user)
                .isCrossGroup(isCrossGroup)
                .homeLabGroup(homeLabGroup)
                .crossGroupNote(isCrossGroup ? String.format("Cross-group QR scan from %s to %s", homeGroupName, sessionGroupName) : null)
                .build();

        try {
            attendanceRecordRepository.saveAndFlush(record);

            // Audit log for cross-group attendance
            if (isCrossGroup) {
                Map<String, Object> auditValues = new HashMap<>();
                auditValues.put("sessionId", session.getId().toString());
                auditValues.put("sessionCode", session.getSessionCode());
                auditValues.put("studentId", student.getStudentId());
                auditValues.put("studentName", student.getFullName());
                auditValues.put("homeLabGroup", homeGroupName);
                auditValues.put("sessionLabGroup", sessionGroupName);
                auditValues.put("method", "QR_SCAN");
                auditValues.put("isCrossGroup", true);

                auditLogService.logAction(
                        "ATTENDANCE_RECORD",
                        record.getId(),
                        "CROSS_GROUP_ATTENDANCE",
                        null,
                        auditValues
                );
            }

            String result = isCrossGroup ? "CROSS_GROUP_MARKED" : "SUCCESS";
            String message = isCrossGroup
                    ? String.format("Attendance marked. Student belongs to Group %s (this session is Group %s).", homeGroupName, sessionGroupName)
                    : "Attendance Recorded Successfully";

            return buildScanResponse(
                    result,
                    message,
                    session,
                    student,
                    record.getMarkedAt(),
                    record.getStatus(),
                    record.getMethod(),
                    isCrossGroup
            );
        } catch (DataIntegrityViolationException ex) {
            // Concurrent duplicate scan
            AttendanceRecord existing = attendanceRecordRepository.findBySessionIdAndStudentId(session.getId(), student.getId())
                    .orElse(null);
            OffsetDateTime existingTime = existing != null ? existing.getMarkedAt() : now;
            AttendanceStatus status = existing != null ? existing.getStatus() : AttendanceStatus.PRESENT;
            AttendanceMethod method = existing != null ? existing.getMethod() : AttendanceMethod.QR_SCAN;
            boolean existingCrossGroup = existing != null && Boolean.TRUE.equals(existing.getIsCrossGroup());

            return buildScanResponse(
                    "ALREADY_MARKED",
                    "Already Marked Present",
                    session,
                    student,
                    existingTime,
                    status,
                    method,
                    existingCrossGroup
            );
        }
    }

    @Transactional
    public AttendanceScanResponse recordManualAttendance(UUID userId, UUID sessionId, ManualAttendanceRequest request) {
        if (request.getReason() == null || request.getReason().trim().isBlank()) {
            throw new BadRequestException("A justification reason is required for manual attendance recording");
        }

        // 1. Authenticate lecturer and verify ownership
        Lecturer lecturer = getAuthorizedLecturer(userId);
        LabSession session = getSessionAndVerifyOwnership(sessionId, lecturer);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // 2. Verify session is ACTIVE
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new BadRequestException("Attendance Is Closed for This Session. This session is not accepting attendance scans.");
        }

        // 3. Resolve student
        Student student = null;
        if (request.getStudentId() != null) {
            student = studentRepository.findById(request.getStudentId())
                    .orElseThrow(() -> new BadRequestException("Student not found"));
        } else if (request.getStudentIdentifier() != null && !request.getStudentIdentifier().isBlank()) {
            String ident = request.getStudentIdentifier().trim();
            student = studentRepository.findByStudentId(ident)
                    .or(() -> resolveStudent(ident))
                    .orElseThrow(() -> new BadRequestException("Student not found"));
        } else {
            throw new BadRequestException("Student ID or identifier must be provided");
        }

        // 4. Duplicate check
        Optional<AttendanceRecord> existingOpt = attendanceRecordRepository.findBySessionIdAndStudentId(session.getId(), student.getId());
        if (existingOpt.isPresent() && (existingOpt.get().getStatus() == AttendanceStatus.PRESENT || existingOpt.get().getStatus() == AttendanceStatus.LATE)) {
            AttendanceRecord existing = existingOpt.get();
            return buildScanResponse(
                    "ALREADY_MARKED",
                    "Already Marked Present",
                    session,
                    student,
                    existing.getMarkedAt(),
                    existing.getStatus(),
                    existing.getMethod(),
                    Boolean.TRUE.equals(existing.getIsCrossGroup())
            );
        }

        // 5. Eligibility and cross-group check
        Optional<SessionStudent> sessionStudentOpt = sessionStudentRepository.findBySessionIdAndStudentId(session.getId(), student.getId());
        boolean isExpected = sessionStudentOpt.isPresent()
                ? Boolean.TRUE.equals(sessionStudentOpt.get().getIsExpected())
                : sessionStudentRepository.existsBySessionIdAndStudentId(session.getId(), student.getId());

        boolean isCrossGroup = false;
        LabGroup homeLabGroup = null;

        if (isExpected) {
            isCrossGroup = false;
        } else {
            // Not in expected list
            if (student.getBatch() == null || session.getBatch() == null ||
                !student.getBatch().getId().equals(session.getBatch().getId())) {
                throw new BadRequestException("Student Is Not Assigned to This Session");
            }

            if (session.getLabGroup() == null) {
                throw new BadRequestException("Student Is Not Assigned to This Session");
            }

            if (student.getLabGroup() != null && student.getLabGroup().getId().equals(session.getLabGroup().getId())) {
                isCrossGroup = false;
            } else {
                isCrossGroup = true;
                homeLabGroup = student.getLabGroup();
            }

            if (sessionStudentOpt.isEmpty()) {
                SessionStudent visitor = SessionStudent.builder()
                        .session(session)
                        .student(student)
                        .homeLabGroup(homeLabGroup)
                        .isExpected(!isCrossGroup)
                        .build();
                try {
                    sessionStudentRepository.save(visitor);
                } catch (DataIntegrityViolationException ignored) {
                }
            }
        }

        // 6. Insert record with method MANUAL
        OffsetDateTime now = OffsetDateTime.now();
        String homeGroupName = homeLabGroup != null ? homeLabGroup.getGroupName() : (student.getLabGroup() != null ? student.getLabGroup().getGroupName() : "Unknown");
        String sessionGroupName = session.getLabGroup() != null ? session.getLabGroup().getGroupName() : "Whole Batch";

        AttendanceRecord record = AttendanceRecord.builder()
                .session(session)
                .student(student)
                .status(AttendanceStatus.PRESENT)
                .method(AttendanceMethod.MANUAL)
                .markedAt(now)
                .markedBy(user)
                .justificationNotes(request.getReason().trim())
                .isCrossGroup(isCrossGroup)
                .homeLabGroup(homeLabGroup)
                .crossGroupNote(isCrossGroup ? String.format("Manual cross-group mark: %s", request.getReason().trim()) : null)
                .build();

        AttendanceRecord saved = attendanceRecordRepository.saveAndFlush(record);

        // 7. Immutable audit logging
        Map<String, Object> newValues = new HashMap<>();
        newValues.put("sessionId", session.getId().toString());
        newValues.put("sessionCode", session.getSessionCode());
        newValues.put("studentId", student.getStudentId());
        newValues.put("studentName", student.getFullName());
        newValues.put("status", saved.getStatus().name());
        newValues.put("method", saved.getMethod().name());
        newValues.put("reason", request.getReason().trim());
        newValues.put("isCrossGroup", isCrossGroup);
        if (isCrossGroup) {
            newValues.put("homeLabGroup", homeGroupName);
            newValues.put("sessionLabGroup", sessionGroupName);
        }

        auditLogService.logAction(
                "ATTENDANCE_RECORD",
                saved.getId(),
                "MANUAL_ATTENDANCE",
                null,
                newValues
        );

        if (isCrossGroup) {
            auditLogService.logAction(
                    "ATTENDANCE_RECORD",
                    saved.getId(),
                    "CROSS_GROUP_ATTENDANCE",
                    null,
                    newValues
            );
        }

        String result = isCrossGroup ? "CROSS_GROUP_MARKED" : "SUCCESS";
        String message = isCrossGroup
                ? String.format("Attendance marked. Student belongs to Group %s (this session is Group %s).", homeGroupName, sessionGroupName)
                : "Manual Attendance Recorded Successfully";

        return buildScanResponse(
                result,
                message,
                session,
                student,
                saved.getMarkedAt(),
                saved.getStatus(),
                saved.getMethod(),
                isCrossGroup
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<AttendanceRecordResponse> getSessionAttendance(
            UUID userId,
            UUID sessionId,
            String search,
            Boolean isCrossGroup,
            int page,
            int size
    ) {
        Lecturer lecturer = getAuthorizedLecturer(userId);
        LabSession session = getSessionAndVerifyOwnership(sessionId, lecturer);

        Pageable pageable = PageRequest.of(page, size, Sort.by("markedAt").descending());
        String searchTerm = (search != null && !search.isBlank()) ? "%" + search.trim().toLowerCase() + "%" : null;

        Page<AttendanceRecord> records = attendanceRecordRepository.searchAttendanceRecords(
                session.getId(), null, null, null, null, isCrossGroup, searchTerm, pageable
        );

        return PageResponse.of(records.map(this::mapToAttendanceRecordResponse));
    }

    @Transactional(readOnly = true)
    public List<SessionExpectedStudentResponse> getSessionExpectedStudents(
            UUID userId,
            UUID sessionId,
            String search
    ) {
        Lecturer lecturer = getAuthorizedLecturer(userId);
        LabSession session = getSessionAndVerifyOwnership(sessionId, lecturer);

        String searchTerm = (search != null && !search.isBlank()) ? "%" + search.trim().toLowerCase() + "%" : null;
        List<SessionStudent> sessionStudents = sessionStudentRepository.findBySessionIdWithSearch(session.getId(), searchTerm);

        // Fetch all attendance records for this session
        Map<UUID, AttendanceRecord> attendanceMap = attendanceRecordRepository.findBySessionId(session.getId()).stream()
                .collect(Collectors.toMap(
                        a -> a.getStudent().getId(),
                        a -> a,
                        (existing, replacement) -> existing
                ));

        return sessionStudents.stream()
                .map(ss -> {
                    Student s = ss.getStudent();
                    AttendanceRecord ar = attendanceMap.get(s.getId());
                    boolean isAttended = ar != null && (ar.getStatus() == AttendanceStatus.PRESENT || ar.getStatus() == AttendanceStatus.LATE);
                    com.labattend.entity.LabGroup group = ss.getHomeLabGroup() != null ? ss.getHomeLabGroup() : s.getLabGroup();
                    boolean isCrossGroup = ar != null ? Boolean.TRUE.equals(ar.getIsCrossGroup()) : Boolean.FALSE.equals(ss.getIsExpected());

                    return SessionExpectedStudentResponse.builder()
                            .studentUuid(s.getId())
                            .studentId(s.getStudentId())
                            .studentName(s.getFullName())
                            .email(s.getEmail())
                            .labGroupId(group != null ? group.getId() : null)
                            .labGroupName(group != null ? group.getGroupName() : null)
                            .isAttended(isAttended)
                            .attendanceStatus(ar != null ? ar.getStatus().name() : null)
                            .markedAt(ar != null ? ar.getMarkedAt() : null)
                            .method(ar != null ? ar.getMethod().name() : null)
                            .isExpected(ss.getIsExpected() != null ? ss.getIsExpected() : true)
                            .isCrossGroup(isCrossGroup)
                            .homeLabGroupId(group != null ? group.getId() : null)
                            .homeLabGroupName(group != null ? group.getGroupName() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private Optional<Student> resolveStudent(String rawIdentifier) {
        if (rawIdentifier == null || rawIdentifier.trim().isBlank()) {
            return Optional.empty();
        }
        String token = rawIdentifier.trim();
        String tokenHash = qrCodeService.generateTokenHash(token);
        Optional<Student> studentOpt = studentRepository.findByQrTokenHash(tokenHash);
        if (studentOpt.isEmpty()) {
            return Optional.empty();
        }
        Student student = studentOpt.get();
        if (Boolean.FALSE.equals(student.getIsActive())) {
            return Optional.empty();
        }
        int version = student.getQrVersion() != null ? student.getQrVersion() : 1;
        if (!qrCodeService.verifyToken(student.getId(), version, token)) {
            return Optional.empty();
        }
        return Optional.of(student);
    }

    private Lecturer getAuthorizedLecturer(UUID userId) {
        return lecturerRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("Lecturer profile not found for the authenticated user"));
    }

    private LabSession getSessionAndVerifyOwnership(UUID sessionId, Lecturer lecturer) {
        LabSession session = labSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Laboratory session not found"));

        if (!session.getLecturer().getId().equals(lecturer.getId())) {
            throw new BadRequestException("You are not authorized to conduct or scan attendance for this laboratory session");
        }
        return session;
    }

    private AttendanceScanResponse buildScanResponse(
            String result,
            String message,
            LabSession session,
            Student student,
            OffsetDateTime scannedAt,
            AttendanceStatus status,
            AttendanceMethod method,
            boolean isCrossGroup
    ) {
        long totalExpected = sessionStudentRepository.countBySessionIdAndIsExpectedTrue(session.getId());
        if (totalExpected == 0) {
            totalExpected = sessionStudentRepository.countBySessionId(session.getId());
        }
        long attended = attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(
                session.getId(),
                List.of(AttendanceStatus.PRESENT, AttendanceStatus.LATE)
        );
        if (attended == 0) {
            attended = attendanceRecordRepository.countBySessionIdAndStatusIn(
                    session.getId(),
                    List.of(AttendanceStatus.PRESENT, AttendanceStatus.LATE)
            );
        }
        long crossGroupCount = attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrueAndStatusIn(
                session.getId(),
                List.of(AttendanceStatus.PRESENT, AttendanceStatus.LATE)
        );
        long remaining = Math.max(0, totalExpected - attended);

        UUID homeGroupId = student.getLabGroup() != null ? student.getLabGroup().getId() : null;
        String homeGroupName = student.getLabGroup() != null ? student.getLabGroup().getGroupName() : null;
        UUID sessionGroupId = session.getLabGroup() != null ? session.getLabGroup().getId() : null;
        String sessionGroupName = session.getLabGroup() != null ? session.getLabGroup().getGroupName() : null;

        return AttendanceScanResponse.builder()
                .result(result)
                .message(message)
                .studentUuid(student.getId())
                .studentId(student.getStudentId())
                .studentName(student.getFullName())
                .labGroupId(homeGroupId)
                .labGroupName(homeGroupName)
                .isCrossGroup(isCrossGroup)
                .homeLabGroupId(homeGroupId)
                .homeLabGroupName(homeGroupName)
                .sessionLabGroupId(sessionGroupId)
                .sessionLabGroupName(sessionGroupName)
                .scannedAt(scannedAt)
                .attendanceStatus(status != null ? status.name() : "PRESENT")
                .method(method != null ? method.name() : "QR_SCAN")
                .totalExpected(totalExpected)
                .attendedCount(attended)
                .crossGroupCount(crossGroupCount)
                .remainingCount(remaining)
                .build();
    }

    @Transactional
    public AttendanceRecordResponse correctAttendanceRecord(
            UUID userId,
            UUID sessionId,
            UUID recordId,
            AttendanceCorrectionRequest request,
            boolean isAdmin
    ) {
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        LabSession session = labSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Laboratory session not found"));

        // If not admin, verify lecturer owns the session
        if (!isAdmin) {
            Lecturer lecturer = getAuthorizedLecturer(userId);
            if (!session.getLecturer().getId().equals(lecturer.getId())) {
                throw new BadRequestException("Unauthorized: You do not own this laboratory session");
            }
        }

        // Must be FINALIZED
        if (session.getStatus() != SessionStatus.FINALIZED) {
            throw new BadRequestException("Attendance corrections can only be made on FINALIZED sessions. Current status: " + session.getStatus());
        }

        // Justification reason is required
        if (request.getReason() == null || request.getReason().trim().isBlank()) {
            throw new BadRequestException("A justification reason is required for attendance correction");
        }

        AttendanceRecord record = attendanceRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found"));

        if (!record.getSession().getId().equals(sessionId)) {
            throw new BadRequestException("Attendance record does not belong to the specified session");
        }

        AttendanceStatus previousStatus = record.getStatus();
        AttendanceStatus newStatus = request.getStatus();

        // Update record
        record.setPreviousStatus(previousStatus);
        record.setStatus(newStatus);
        record.setIsCorrected(true);
        record.setCorrectedAt(OffsetDateTime.now());
        record.setCorrectedBy(currentUser);
        record.setJustificationNotes(request.getReason().trim());

        AttendanceRecord saved = attendanceRecordRepository.save(record);

        // Audit log
        Map<String, Object> previousState = new HashMap<>();
        previousState.put("status", previousStatus.name());
        previousState.put("recordId", record.getId());

        Map<String, Object> newState = new HashMap<>();
        newState.put("status", newStatus.name());
        newState.put("recordId", record.getId());
        newState.put("reason", request.getReason().trim());
        newState.put("correctedBy", currentUser.getEmail());

        auditLogService.logAction("AttendanceRecord", record.getId(), "ATTENDANCE_CORRECTION", previousState, newState);

        return mapToAttendanceRecordResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<AttendanceRecordResponse> searchAttendanceRecords(
            UUID userId,
            UUID sessionId,
            UUID studentId,
            AttendanceStatus status,
            AttendanceMethod method,
            Boolean isCorrected,
            Boolean isCrossGroup,
            String search,
            int page,
            int size,
            String sortBy,
            String sortDir,
            boolean isAdmin
    ) {
        if (!isAdmin && sessionId != null) {
            Lecturer lecturer = getAuthorizedLecturer(userId);
            getSessionAndVerifyOwnership(sessionId, lecturer);
        }

        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        String searchTerm = (search != null && !search.isBlank()) ? "%" + search.trim().toLowerCase() + "%" : null;

        Page<AttendanceRecord> records = attendanceRecordRepository.searchAttendanceRecords(
                sessionId,
                studentId,
                status,
                method,
                isCorrected,
                isCrossGroup,
                searchTerm,
                pageable
        );

        return PageResponse.of(records.map(this::mapToAttendanceRecordResponse));
    }

    private AttendanceRecordResponse mapToAttendanceRecordResponse(AttendanceRecord record) {
        return AttendanceRecordResponse.builder()
                .id(record.getId())
                .studentUuid(record.getStudent().getId())
                .studentId(record.getStudent().getStudentId())
                .studentName(record.getStudent().getFullName())
                .email(record.getStudent().getEmail())
                .status(record.getStatus().name())
                .method(record.getMethod().name())
                .markedAt(record.getMarkedAt())
                .markedByName(record.getMarkedBy() != null ? record.getMarkedBy().getFullName() : null)
                .justificationNotes(record.getJustificationNotes())
                .isCorrected(record.getIsCorrected())
                .correctedAt(record.getCorrectedAt())
                .correctedByName(record.getCorrectedBy() != null ? record.getCorrectedBy().getFullName() : null)
                .previousStatus(record.getPreviousStatus() != null ? record.getPreviousStatus().name() : null)
                .sessionId(record.getSession() != null ? record.getSession().getId() : null)
                .sessionCode(record.getSession() != null ? record.getSession().getSessionCode() : null)
                .moduleCode(record.getSession() != null && record.getSession().getModule() != null ? record.getSession().getModule().getModuleCode() : null)
                .isCrossGroup(record.getIsCrossGroup() != null ? record.getIsCrossGroup() : false)
                .homeLabGroupId(record.getHomeLabGroup() != null ? record.getHomeLabGroup().getId() : null)
                .homeLabGroupName(record.getHomeLabGroup() != null ? record.getHomeLabGroup().getGroupName() : null)
                .sessionLabGroupName(record.getSession() != null && record.getSession().getLabGroup() != null ? record.getSession().getLabGroup().getGroupName() : null)
                .crossGroupNote(record.getCrossGroupNote())
                .build();
    }
}

