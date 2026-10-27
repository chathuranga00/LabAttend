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

    public AttendanceService(
            AttendanceRecordRepository attendanceRecordRepository,
            SessionStudentRepository sessionStudentRepository,
            LabSessionRepository labSessionRepository,
            StudentRepository studentRepository,
            LecturerRepository lecturerRepository,
            UserRepository userRepository,
            AuditLogService auditLogService
    ) {
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.sessionStudentRepository = sessionStudentRepository;
        this.labSessionRepository = labSessionRepository;
        this.studentRepository = studentRepository;
        this.lecturerRepository = lecturerRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
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

        // 4. Check student is in session_students expected list
        boolean isAssigned = sessionStudentRepository.existsBySessionIdAndStudentId(session.getId(), student.getId());
        if (!isAssigned) {
            throw new BadRequestException("Student Is Not Assigned to This Session");
        }

        // 5. If a PRESENT record already exists -> return "Already Marked Present"
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
                    existing.getMethod()
            );
        }

        // 6. Otherwise insert PRESENT, method QR_SCAN, scanned_at, recorded_by_user_id
        OffsetDateTime now = OffsetDateTime.now();
        AttendanceRecord record = AttendanceRecord.builder()
                .session(session)
                .student(student)
                .status(AttendanceStatus.PRESENT)
                .method(AttendanceMethod.QR_SCAN)
                .markedAt(now)
                .markedBy(user)
                .build();

        try {
            attendanceRecordRepository.saveAndFlush(record);
            return buildScanResponse(
                    "SUCCESS",
                    "Attendance Recorded Successfully",
                    session,
                    student,
                    record.getMarkedAt(),
                    record.getStatus(),
                    record.getMethod()
            );
        } catch (DataIntegrityViolationException ex) {
            // Unique constraint violation due to concurrent scan
            AttendanceRecord existing = attendanceRecordRepository.findBySessionIdAndStudentId(session.getId(), student.getId())
                    .orElse(null);
            OffsetDateTime existingTime = existing != null ? existing.getMarkedAt() : now;
            AttendanceStatus status = existing != null ? existing.getStatus() : AttendanceStatus.PRESENT;
            AttendanceMethod method = existing != null ? existing.getMethod() : AttendanceMethod.QR_SCAN;

            return buildScanResponse(
                    "ALREADY_MARKED",
                    "Already Marked Present",
                    session,
                    student,
                    existingTime,
                    status,
                    method
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
            student = resolveStudent(request.getStudentIdentifier().trim())
                    .orElseThrow(() -> new BadRequestException("Student not found"));
        } else {
            throw new BadRequestException("Student ID or identifier must be provided");
        }

        // 4. Check eligibility in session_students
        boolean isAssigned = sessionStudentRepository.existsBySessionIdAndStudentId(session.getId(), student.getId());
        if (!isAssigned) {
            throw new BadRequestException("Student Is Not Assigned to This Session");
        }

        // 5. Check if already marked present
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
                    existing.getMethod()
            );
        }

        // 6. Insert record with method MANUAL
        OffsetDateTime now = OffsetDateTime.now();
        AttendanceRecord record = AttendanceRecord.builder()
                .session(session)
                .student(student)
                .status(AttendanceStatus.PRESENT)
                .method(AttendanceMethod.MANUAL)
                .markedAt(now)
                .markedBy(user)
                .justificationNotes(request.getReason().trim())
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

        auditLogService.logAction(
                "ATTENDANCE_RECORD",
                saved.getId(),
                "MANUAL_ATTENDANCE",
                null,
                newValues
        );

        return buildScanResponse(
                "SUCCESS",
                "Manual Attendance Recorded Successfully",
                session,
                student,
                saved.getMarkedAt(),
                saved.getStatus(),
                saved.getMethod()
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<AttendanceRecordResponse> getSessionAttendance(
            UUID userId,
            UUID sessionId,
            String search,
            int page,
            int size
    ) {
        Lecturer lecturer = getAuthorizedLecturer(userId);
        LabSession session = getSessionAndVerifyOwnership(sessionId, lecturer);

        Pageable pageable = PageRequest.of(page, size, Sort.by("markedAt").descending());
        String searchTerm = (search != null && !search.isBlank()) ? "%" + search.trim().toLowerCase() + "%" : null;

        Page<AttendanceRecord> records = attendanceRecordRepository.searchAttendanceRecords(
                session.getId(), null, null, null, null, searchTerm, pageable
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
                            .build();
                })
                .collect(Collectors.toList());
    }

    private Optional<Student> resolveStudent(String rawIdentifier) {
        String tokenHash = HashUtils.sha256Hex(rawIdentifier);
        Optional<Student> studentOpt = studentRepository.findByQrTokenHash(tokenHash);
        if (studentOpt.isEmpty()) {
            studentOpt = studentRepository.findByStudentId(rawIdentifier);
        }
        return studentOpt;
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
            AttendanceMethod method
    ) {
        long totalExpected = sessionStudentRepository.countBySessionId(session.getId());
        long attended = attendanceRecordRepository.countBySessionIdAndStatusIn(
                session.getId(),
                List.of(AttendanceStatus.PRESENT, AttendanceStatus.LATE)
        );
        long remaining = Math.max(0, totalExpected - attended);

        return AttendanceScanResponse.builder()
                .result(result)
                .message(message)
                .studentUuid(student.getId())
                .studentId(student.getStudentId())
                .studentName(student.getFullName())
                .labGroupId(student.getLabGroup() != null ? student.getLabGroup().getId() : null)
                .labGroupName(student.getLabGroup() != null ? student.getLabGroup().getGroupName() : null)
                .scannedAt(scannedAt)
                .attendanceStatus(status != null ? status.name() : "PRESENT")
                .method(method != null ? method.name() : "QR_SCAN")
                .totalExpected(totalExpected)
                .attendedCount(attended)
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
                .build();
    }
}

