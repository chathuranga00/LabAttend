package com.labattend.service;

import com.labattend.dto.student.*;
import com.labattend.entity.*;
import com.labattend.entity.Module;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.AttendanceRecordRepository;
import com.labattend.repository.SessionStudentRepository;
import com.labattend.repository.StudentRepository;
import com.labattend.repository.UserRepository;
import com.labattend.security.CustomUserDetails;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class StudentPortalService {

    private final StudentRepository studentRepository;
    private final SessionStudentRepository sessionStudentRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SystemSettingService systemSettingService;
    private final StudentAccountService studentAccountService;

    public StudentPortalService(
            StudentRepository studentRepository,
            SessionStudentRepository sessionStudentRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            SystemSettingService systemSettingService,
            StudentAccountService studentAccountService
    ) {
        this.studentRepository = studentRepository;
        this.sessionStudentRepository = sessionStudentRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.systemSettingService = systemSettingService;
        this.studentAccountService = studentAccountService;
    }

    /**
     * Resolves the authenticated student entity strictly from the JWT authenticated user.
     * Prevents horizontal privilege escalation by never accepting student ID as parameter.
     */
    public Student resolveAuthenticatedStudent(CustomUserDetails userDetails) {
        if (userDetails == null || userDetails.getId() == null) {
            throw new BadCredentialsException("Authenticated session context is invalid.");
        }

        Student student = studentRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user account"));

        if (!Boolean.TRUE.equals(student.getIsActive())) {
            throw new BadCredentialsException("Student account is deactivated.");
        }

        return student;
    }

    /**
     * GET /api/student/me
     * Returns student's personal profile (student ID, full name, email, degree programme, batch, lab group, status).
     * Excludes all sensitive fields such as qr_token, qr_token_hash, justification notes, etc.
     */
    public StudentProfileResponse getProfile(CustomUserDetails userDetails) {
        Student student = resolveAuthenticatedStudent(userDetails);

        return StudentProfileResponse.builder()
                .studentId(student.getStudentId())
                .fullName(student.getFullName())
                .email(student.getEmail())
                .degreeProgramme(student.getDegreeProgramme() != null ? student.getDegreeProgramme().getName() : null)
                .batch(student.getBatch() != null ? student.getBatch().getBatchCode() : null)
                .labGroup(student.getLabGroup() != null ? student.getLabGroup().getGroupName() : null)
                .enrollmentStatus(Boolean.TRUE.equals(student.getIsActive()) ? "ACTIVE" : "INACTIVE")
                .build();
    }

    /**
     * GET /api/student/attendance/summary
     * Reuses analytics computation so metrics match lecturer and admin views exactly.
     * Only counts FINALIZED sessions. CANCELLED sessions are excluded; ACTIVE sessions are not shown as absences.
     */
    public StudentSummaryResponse getAttendanceSummary(CustomUserDetails userDetails) {
        Student student = resolveAuthenticatedStudent(userDetails);

        List<SessionStudent> sessionStudents = sessionStudentRepository.findStudentEligibleSessions(
                student.getId(), null, null, null, null);

        // Filter strictly to finalized or closed sessions
        List<SessionStudent> finalizedSessions = sessionStudents.stream()
                .filter(ss -> ss.getSession().getStatus() == SessionStatus.FINALIZED || ss.getSession().getStatus() == SessionStatus.CLOSED)
                .toList();

        Set<UUID> sessionIds = finalizedSessions.stream().map(ss -> ss.getSession().getId()).collect(Collectors.toSet());
        List<AttendanceRecord> records = sessionIds.isEmpty() ? List.of() :
                attendanceRecordRepository.findByStudentIdAndSessionIdIn(student.getId(), sessionIds);

        Map<UUID, AttendanceRecord> recordMap = records.stream()
                .collect(Collectors.toMap(r -> r.getSession().getId(), r -> r, (a, b) -> a));

        long eligibleFinalized = 0;
        long attended = 0;
        long missed = 0;
        long crossGroupVisits = 0;

        for (SessionStudent ss : finalizedSessions) {
            LabSession s = ss.getSession();
            AttendanceRecord ar = recordMap.get(s.getId());
            boolean isExpected = !Boolean.FALSE.equals(ss.getIsExpected());
            boolean isAttended = ar != null && (ar.getStatus() == AttendanceStatus.PRESENT || ar.getStatus() == AttendanceStatus.LATE);
            boolean isCross = ar != null && Boolean.TRUE.equals(ar.getIsCrossGroup());

            if (isExpected) {
                eligibleFinalized++;
                if (isAttended) {
                    attended++;
                } else {
                    missed++;
                }
            }

            if (isCross && isAttended) {
                crossGroupVisits++;
            }
        }

        double threshold = systemSettingService.getLowAttendanceThreshold();

        String pctStr = "N/A";
        Double pctNum = null;
        boolean belowThreshold = false;

        if (eligibleFinalized > 0) {
            double raw = ((double) attended / eligibleFinalized) * 100.0;
            pctNum = Math.round(raw * 10.0) / 10.0;
            pctStr = String.format(Locale.US, "%.1f%%", raw);
            belowThreshold = pctNum < threshold;
        }

        return StudentSummaryResponse.builder()
                .eligibleFinalizedSessions(eligibleFinalized)
                .attendedSessions(attended)
                .missedSessions(missed)
                .attendancePercentage(pctStr)
                .percentageNumeric(pctNum)
                .crossGroupVisitsCount(crossGroupVisits)
                .threshold(threshold)
                .belowThreshold(belowThreshold)
                .build();
    }

    /**
     * GET /api/student/attendance/modules
     * Per-module eligible, attended, missed, and percentage metrics.
     */
    public List<StudentModuleAttendanceResponse> getModuleAttendance(CustomUserDetails userDetails) {
        Student student = resolveAuthenticatedStudent(userDetails);
        double threshold = systemSettingService.getLowAttendanceThreshold();

        List<SessionStudent> sessionStudents = sessionStudentRepository.findStudentEligibleSessions(
                student.getId(), null, null, null, null);

        List<SessionStudent> finalizedSessions = sessionStudents.stream()
                .filter(ss -> ss.getSession().getStatus() == SessionStatus.FINALIZED || ss.getSession().getStatus() == SessionStatus.CLOSED)
                .toList();

        Set<UUID> sessionIds = finalizedSessions.stream().map(ss -> ss.getSession().getId()).collect(Collectors.toSet());
        List<AttendanceRecord> records = sessionIds.isEmpty() ? List.of() :
                attendanceRecordRepository.findByStudentIdAndSessionIdIn(student.getId(), sessionIds);

        Map<UUID, AttendanceRecord> recordMap = records.stream()
                .collect(Collectors.toMap(r -> r.getSession().getId(), r -> r, (a, b) -> a));

        Map<UUID, List<SessionStudent>> moduleGroups = finalizedSessions.stream()
                .collect(Collectors.groupingBy(ss -> ss.getSession().getModule().getId(), LinkedHashMap::new, Collectors.toList()));

        List<StudentModuleAttendanceResponse> result = new ArrayList<>();

        for (Map.Entry<UUID, List<SessionStudent>> entry : moduleGroups.entrySet()) {
            List<SessionStudent> moduleSessions = entry.getValue();
            Module module = moduleSessions.get(0).getSession().getModule();

            long eligible = 0;
            long attended = 0;
            long missed = 0;

            for (SessionStudent ss : moduleSessions) {
                LabSession s = ss.getSession();
                AttendanceRecord ar = recordMap.get(s.getId());
                boolean isExpected = !Boolean.FALSE.equals(ss.getIsExpected());
                boolean isAttended = ar != null && (ar.getStatus() == AttendanceStatus.PRESENT || ar.getStatus() == AttendanceStatus.LATE);

                if (isExpected) {
                    eligible++;
                    if (isAttended) {
                        attended++;
                    } else {
                        missed++;
                    }
                }
            }

            String pctStr = "N/A";
            Double pctNum = null;
            boolean belowThreshold = false;

            if (eligible > 0) {
                double raw = ((double) attended / eligible) * 100.0;
                pctNum = Math.round(raw * 10.0) / 10.0;
                pctStr = String.format(Locale.US, "%.1f%%", raw);
                belowThreshold = pctNum < threshold;
            }

            result.add(StudentModuleAttendanceResponse.builder()
                    .moduleId(module.getId())
                    .moduleCode(module.getModuleCode())
                    .moduleName(module.getName())
                    .eligibleFinalizedSessions(eligible)
                    .attendedSessions(attended)
                    .missedSessions(missed)
                    .attendancePercentage(pctStr)
                    .percentageNumeric(pctNum)
                    .belowThreshold(belowThreshold)
                    .build());
        }

        result.sort(Comparator.comparing(StudentModuleAttendanceResponse::getModuleCode, Comparator.nullsLast(String::compareTo)));
        return result;
    }

    /**
     * GET /api/student/attendance/history
     * Paginated history of finalized sessions with optional module, date range, and status filters.
     * Excludes forbidden fields: correction reasons, lecturer notes, recorded-by user, audit data, internal IDs, qr_token.
     */
    public Page<StudentAttendanceHistoryItemResponse> getAttendanceHistory(
            CustomUserDetails userDetails,
            UUID moduleId,
            LocalDate startDate,
            LocalDate endDate,
            String statusFilter,
            Pageable pageable
    ) {
        Student student = resolveAuthenticatedStudent(userDetails);

        List<SessionStudent> sessionStudents = sessionStudentRepository.findStudentEligibleSessions(
                student.getId(), null, moduleId, startDate, endDate);

        // Filter to only finalized or closed sessions
        List<SessionStudent> finalizedSessions = sessionStudents.stream()
                .filter(ss -> ss.getSession().getStatus() == SessionStatus.FINALIZED || ss.getSession().getStatus() == SessionStatus.CLOSED)
                .toList();

        Set<UUID> sessionIds = finalizedSessions.stream().map(ss -> ss.getSession().getId()).collect(Collectors.toSet());
        List<AttendanceRecord> records = sessionIds.isEmpty() ? List.of() :
                attendanceRecordRepository.findByStudentIdAndSessionIdIn(student.getId(), sessionIds);

        Map<UUID, AttendanceRecord> recordMap = records.stream()
                .collect(Collectors.toMap(r -> r.getSession().getId(), r -> r, (a, b) -> a));

        List<StudentAttendanceHistoryItemResponse> allItems = new ArrayList<>();

        for (SessionStudent ss : finalizedSessions) {
            LabSession s = ss.getSession();
            AttendanceRecord ar = recordMap.get(s.getId());

            String status = (ar != null && (ar.getStatus() == AttendanceStatus.PRESENT || ar.getStatus() == AttendanceStatus.LATE))
                    ? "PRESENT" : "ABSENT";

            boolean isCrossGroup = (ar != null && Boolean.TRUE.equals(ar.getIsCrossGroup())) || Boolean.FALSE.equals(ss.getIsExpected());
            boolean isCorrected = ar != null && Boolean.TRUE.equals(ar.getIsCorrected());

            // Optional status filter
            if (statusFilter != null && !statusFilter.isBlank() && !statusFilter.equalsIgnoreCase("ALL")) {
                if (!status.equalsIgnoreCase(statusFilter.trim())) {
                    continue;
                }
            }

            String labSheetNumber = s.getLabSheetNumber() != null ? s.getLabSheetNumber() : "—";
            String labGroupName = s.getLabGroup() != null ? s.getLabGroup().getGroupName() : "Whole Batch";

            allItems.add(StudentAttendanceHistoryItemResponse.builder()
                    .sessionDate(s.getSessionDate())
                    .moduleCode(s.getModule() != null ? s.getModule().getModuleCode() : "N/A")
                    .moduleName(s.getModule() != null ? s.getModule().getName() : "N/A")
                    .labSheetNumber(labSheetNumber)
                    .labGroup(labGroupName)
                    .status(status)
                    .isCrossGroup(isCrossGroup)
                    .isCorrected(isCorrected)
                    .build());
        }

        // Apply in-memory pagination
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), allItems.size());
        List<StudentAttendanceHistoryItemResponse> pageContent = (start <= allItems.size())
                ? allItems.subList(start, end)
                : Collections.emptyList();

        return new PageImpl<>(pageContent, pageable, allItems.size());
    }

    /**
     * POST /api/student/change-password
     * Allows authenticated student to change their password with current password verification and strength policy enforcement.
     */
    @Transactional
    public void changePassword(CustomUserDetails userDetails, StudentPasswordChangeRequest request) {
        if (userDetails == null || userDetails.getId() == null) {
            throw new BadCredentialsException("Authenticated session context is invalid.");
        }

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userDetails.getId()));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect.");
        }

        if (request.getNewPassword() == null || !request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("New password and confirmation do not match.");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BadRequestException("New password cannot be the same as the current password.");
        }

        studentAccountService.validatePasswordStrength(request.getNewPassword());

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
