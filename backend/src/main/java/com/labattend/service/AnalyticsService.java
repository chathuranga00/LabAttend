package com.labattend.service;

import com.labattend.dto.response.analytics.*;
import com.labattend.entity.*;
import com.labattend.entity.Module;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private final LabSessionRepository labSessionRepository;
    private final SessionStudentRepository sessionStudentRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LecturerRepository lecturerRepository;
    private final StudentRepository studentRepository;
    private final ModuleRepository moduleRepository;
    private final BatchRepository batchRepository;
    private final DegreeProgrammeRepository degreeProgrammeRepository;
    private final LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository;

    public AnalyticsService(
            LabSessionRepository labSessionRepository,
            SessionStudentRepository sessionStudentRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            LecturerRepository lecturerRepository,
            StudentRepository studentRepository,
            ModuleRepository moduleRepository,
            BatchRepository batchRepository,
            DegreeProgrammeRepository degreeProgrammeRepository,
            LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository
    ) {
        this.labSessionRepository = labSessionRepository;
        this.sessionStudentRepository = sessionStudentRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.lecturerRepository = lecturerRepository;
        this.studentRepository = studentRepository;
        this.moduleRepository = moduleRepository;
        this.batchRepository = batchRepository;
        this.degreeProgrammeRepository = degreeProgrammeRepository;
        this.lecturerModuleAssignmentRepository = lecturerModuleAssignmentRepository;
    }

    // =========================================================================
    // 1. LECTURER OVERVIEW
    // =========================================================================
    public AnalyticsOverviewResponse getLecturerOverview(
            UUID userId,
            UUID moduleId,
            UUID batchId,
            LocalDate startDate,
            LocalDate endDate,
            String semester
    ) {
        Lecturer lecturer = getLecturerByUserId(userId);
        return buildOverview(lecturer.getId(), null, moduleId, batchId, startDate, endDate, semester, false);
    }

    // =========================================================================
    // 2. ADMIN OVERVIEW
    // =========================================================================
    public AnalyticsOverviewResponse getAdminOverview(
            UUID programmeId,
            UUID batchId,
            UUID moduleId,
            UUID lecturerId,
            LocalDate startDate,
            LocalDate endDate,
            String semester
    ) {
        return buildOverview(lecturerId, programmeId, moduleId, batchId, startDate, endDate, semester, true);
    }

    private AnalyticsOverviewResponse buildOverview(
            UUID lecturerId,
            UUID programmeId,
            UUID moduleId,
            UUID batchId,
            LocalDate startDate,
            LocalDate endDate,
            String semester,
            boolean isAdmin
    ) {
        List<Object[]> statusCounts = labSessionRepository.countSessionsByStatus(
                lecturerId, moduleId, batchId, programmeId, startDate, endDate, semester
        );

        long draft = 0;
        long active = 0;
        long finalized = 0;
        long cancelled = 0;

        for (Object[] row : statusCounts) {
            SessionStatus status = (SessionStatus) row[0];
            long count = ((Number) row[1]).longValue();
            if (status == SessionStatus.DRAFT || status == SessionStatus.SCHEDULED) {
                draft += count;
            } else if (status == SessionStatus.ACTIVE) {
                active += count;
            } else if (status == SessionStatus.FINALIZED || status == SessionStatus.CLOSED) {
                finalized += count;
            } else if (status == SessionStatus.CANCELLED) {
                cancelled += count;
            }
        }

        long totalSessions = draft + active + finalized + cancelled;

        // Slot totals across finalized sessions only (Real database records)
        long totalExpectedSlots = sessionStudentRepository.countTotalExpectedFinalizedSlots(
                lecturerId, moduleId, batchId, programmeId, startDate, endDate, semester
        );

        List<Object[]> slotCounts = attendanceRecordRepository.countFinalizedAttendanceSlotsByStatus(
                lecturerId, moduleId, batchId, programmeId, startDate, endDate, semester
        );

        long totalPresentSlots = 0;
        long totalAbsentSlots = 0;

        for (Object[] row : slotCounts) {
            AttendanceStatus status = (AttendanceStatus) row[0];
            long count = ((Number) row[1]).longValue();
            if (status == AttendanceStatus.PRESENT || status == AttendanceStatus.LATE) {
                totalPresentSlots += count;
            } else if (status == AttendanceStatus.ABSENT) {
                totalAbsentSlots += count;
            }
        }

        // If absentee records were not fully materialized, expected - present constitutes total absent slots
        if (totalAbsentSlots == 0 && totalExpectedSlots > totalPresentSlots) {
            totalAbsentSlots = totalExpectedSlots - totalPresentSlots;
        }

        String percentageStr = "N/A";
        Double percentageNum = null;

        if (totalExpectedSlots > 0) {
            double raw = ((double) totalPresentSlots / totalExpectedSlots) * 100.0;
            percentageNum = Math.round(raw * 10.0) / 10.0;
            percentageStr = String.format(Locale.US, "%.1f%%", raw);
        }

        AnalyticsOverviewResponse.AnalyticsOverviewResponseBuilder builder = AnalyticsOverviewResponse.builder()
                .totalSessions(totalSessions)
                .finalizedSessions(finalized)
                .activeSessions(active)
                .cancelledSessions(cancelled)
                .draftSessions(draft)
                .totalExpectedSlots(totalExpectedSlots)
                .totalPresentSlots(totalPresentSlots)
                .totalAbsentSlots(totalAbsentSlots)
                .overallAttendancePercentage(percentageStr)
                .percentageNumeric(percentageNum);

        if (isAdmin) {
            builder.totalStudents(studentRepository.count())
                    .totalLecturers(lecturerRepository.count())
                    .totalModules(moduleRepository.count())
                    .totalBatches(batchRepository.count())
                    .totalProgrammes(degreeProgrammeRepository.count());
        }

        return builder.build();
    }

    // =========================================================================
    // 3. ATTENDANCE TRENDS
    // =========================================================================
    public List<AttendanceTrendPoint> getAttendanceTrends(
            UUID lecturerId,
            UUID programmeId,
            UUID moduleId,
            UUID batchId,
            LocalDate startDate,
            LocalDate endDate,
            String semester
    ) {
        List<LabSession> finalizedSessions = labSessionRepository.findFinalizedSessionsForTrends(
                lecturerId, moduleId, batchId, programmeId, startDate, endDate, semester
        );

        List<AttendanceTrendPoint> trend = new ArrayList<>();

        for (LabSession session : finalizedSessions) {
            long expected = sessionStudentRepository.countBySessionId(session.getId());
            long present = attendanceRecordRepository.countBySessionIdAndStatusIn(
                    session.getId(), Arrays.asList(AttendanceStatus.PRESENT, AttendanceStatus.LATE)
            );
            long absent = Math.max(0, expected - present);

            String pctStr = "N/A";
            Double pctNum = null;
            if (expected > 0) {
                double raw = ((double) present / expected) * 100.0;
                pctNum = Math.round(raw * 10.0) / 10.0;
                pctStr = String.format(Locale.US, "%.1f%%", raw);
            }

            trend.add(AttendanceTrendPoint.builder()
                    .sessionId(session.getId())
                    .sessionCode(session.getSessionCode())
                    .sessionDate(session.getSessionDate())
                    .moduleCode(session.getModule() != null ? session.getModule().getModuleCode() : null)
                    .moduleName(session.getModule() != null ? session.getModule().getName() : null)
                    .batchCode(session.getBatch() != null ? session.getBatch().getBatchCode() : null)
                    .expectedCount(expected)
                    .presentCount(present)
                    .absentCount(absent)
                    .attendancePercentage(pctStr)
                    .percentageNumeric(pctNum)
                    .build());
        }

        return trend;
    }

    // =========================================================================
    // 4. MODULE ANALYTICS
    // =========================================================================
    public List<ModuleAnalyticsResponse> getModuleAnalytics(
            UUID lecturerId,
            UUID programmeId,
            UUID batchId,
            LocalDate startDate,
            LocalDate endDate,
            String semester
    ) {
        // Query non-cancelled sessions to aggregate by module
        List<LabSession> sessions = labSessionRepository.findSessionsForAnalytics(
                lecturerId, null, batchId, programmeId, null, startDate, endDate, semester
        );

        Map<UUID, List<LabSession>> sessionsByModule = sessions.stream()
                .filter(s -> s.getModule() != null)
                .collect(Collectors.groupingBy(s -> s.getModule().getId()));

        List<ModuleAnalyticsResponse> result = new ArrayList<>();

        for (Map.Entry<UUID, List<LabSession>> entry : sessionsByModule.entrySet()) {
            List<LabSession> moduleSessions = entry.getValue();
            Module mod = moduleSessions.get(0).getModule();

            long total = moduleSessions.size();
            long finalized = 0;
            long active = 0;
            long totalExpected = 0;
            long totalPresent = 0;
            long totalAbsent = 0;

            for (LabSession s : moduleSessions) {
                if (s.getStatus() == SessionStatus.ACTIVE) {
                    active++;
                } else if (s.getStatus() == SessionStatus.FINALIZED || s.getStatus() == SessionStatus.CLOSED) {
                    finalized++;
                    long exp = sessionStudentRepository.countBySessionId(s.getId());
                    long pres = attendanceRecordRepository.countBySessionIdAndStatusIn(
                            s.getId(), Arrays.asList(AttendanceStatus.PRESENT, AttendanceStatus.LATE)
                    );
                    totalExpected += exp;
                    totalPresent += pres;
                    totalAbsent += Math.max(0, exp - pres);
                }
            }

            String pctStr = "N/A";
            Double pctNum = null;
            if (totalExpected > 0) {
                double raw = ((double) totalPresent / totalExpected) * 100.0;
                pctNum = Math.round(raw * 10.0) / 10.0;
                pctStr = String.format(Locale.US, "%.1f%%", raw);
            }

            result.add(ModuleAnalyticsResponse.builder()
                    .moduleId(mod.getId())
                    .moduleCode(mod.getModuleCode())
                    .moduleName(mod.getName())
                    .semester(mod.getSemester())
                    .academicYear(mod.getAcademicYear())
                    .totalSessions(total)
                    .finalizedSessions(finalized)
                    .activeSessions(active)
                    .totalExpected(totalExpected)
                    .totalPresent(totalPresent)
                    .totalAbsent(totalAbsent)
                    .attendancePercentage(pctStr)
                    .percentageNumeric(pctNum)
                    .build());
        }

        result.sort(Comparator.comparing(ModuleAnalyticsResponse::getModuleCode, Comparator.nullsLast(String::compareTo)));
        return result;
    }

    // =========================================================================
    // 5. BATCH ANALYTICS
    // =========================================================================
    public List<BatchAnalyticsResponse> getBatchAnalytics(
            UUID lecturerId,
            UUID programmeId,
            UUID moduleId,
            LocalDate startDate,
            LocalDate endDate,
            String semester
    ) {
        List<LabSession> sessions = labSessionRepository.findSessionsForAnalytics(
                lecturerId, moduleId, null, programmeId, null, startDate, endDate, semester
        );

        Map<UUID, List<LabSession>> sessionsByBatch = sessions.stream()
                .filter(s -> s.getBatch() != null)
                .collect(Collectors.groupingBy(s -> s.getBatch().getId()));

        List<BatchAnalyticsResponse> result = new ArrayList<>();

        for (Map.Entry<UUID, List<LabSession>> entry : sessionsByBatch.entrySet()) {
            List<LabSession> batchSessions = entry.getValue();
            Batch batch = batchSessions.get(0).getBatch();

            long total = batchSessions.size();
            long finalized = 0;
            long totalExpected = 0;
            long totalPresent = 0;
            long totalAbsent = 0;

            for (LabSession s : batchSessions) {
                if (s.getStatus() == SessionStatus.FINALIZED || s.getStatus() == SessionStatus.CLOSED) {
                    finalized++;
                    long exp = sessionStudentRepository.countBySessionId(s.getId());
                    long pres = attendanceRecordRepository.countBySessionIdAndStatusIn(
                            s.getId(), Arrays.asList(AttendanceStatus.PRESENT, AttendanceStatus.LATE)
                    );
                    totalExpected += exp;
                    totalPresent += pres;
                    totalAbsent += Math.max(0, exp - pres);
                }
            }

            String pctStr = "N/A";
            Double pctNum = null;
            if (totalExpected > 0) {
                double raw = ((double) totalPresent / totalExpected) * 100.0;
                pctNum = Math.round(raw * 10.0) / 10.0;
                pctStr = String.format(Locale.US, "%.1f%%", raw);
            }

            result.add(BatchAnalyticsResponse.builder()
                    .batchId(batch.getId())
                    .batchCode(batch.getBatchCode())
                    .academicYear(batch.getAcademicYear())
                    .programmeCode(batch.getDegreeProgramme() != null ? batch.getDegreeProgramme().getCode() : null)
                    .programmeName(batch.getDegreeProgramme() != null ? batch.getDegreeProgramme().getName() : null)
                    .totalSessions(total)
                    .finalizedSessions(finalized)
                    .totalExpected(totalExpected)
                    .totalPresent(totalPresent)
                    .totalAbsent(totalAbsent)
                    .attendancePercentage(pctStr)
                    .percentageNumeric(pctNum)
                    .build());
        }

        result.sort(Comparator.comparing(BatchAnalyticsResponse::getBatchCode, Comparator.nullsLast(String::compareTo)));
        return result;
    }

    // =========================================================================
    // 6. SESSION ANALYTICS
    // =========================================================================
    public List<SessionAnalyticsResponse> getSessionAnalytics(
            UUID lecturerId,
            UUID programmeId,
            UUID moduleId,
            UUID batchId,
            SessionStatus status,
            LocalDate startDate,
            LocalDate endDate,
            String semester
    ) {
        List<LabSession> sessions = labSessionRepository.findSessionsForAnalytics(
                lecturerId, moduleId, batchId, programmeId, status, startDate, endDate, semester
        );

        List<SessionAnalyticsResponse> result = new ArrayList<>();

        for (LabSession s : sessions) {
            long expected = sessionStudentRepository.countBySessionId(s.getId());
            long present = attendanceRecordRepository.countBySessionIdAndStatusIn(
                    s.getId(), Arrays.asList(AttendanceStatus.PRESENT, AttendanceStatus.LATE)
            );
            long absent = Math.max(0, expected - present);

            String pctStr = "N/A";
            Double pctNum = null;
            if (expected > 0 && (s.getStatus() == SessionStatus.FINALIZED || s.getStatus() == SessionStatus.CLOSED)) {
                double raw = ((double) present / expected) * 100.0;
                pctNum = Math.round(raw * 10.0) / 10.0;
                pctStr = String.format(Locale.US, "%.1f%%", raw);
            }

            result.add(SessionAnalyticsResponse.builder()
                    .sessionId(s.getId())
                    .sessionCode(s.getSessionCode())
                    .moduleCode(s.getModule() != null ? s.getModule().getModuleCode() : null)
                    .moduleName(s.getModule() != null ? s.getModule().getName() : null)
                    .batchCode(s.getBatch() != null ? s.getBatch().getBatchCode() : null)
                    .lecturerName(s.getLecturer() != null && s.getLecturer().getUser() != null ? s.getLecturer().getUser().getFullName() : null)
                    .sessionDate(s.getSessionDate())
                    .status(s.getStatus().name())
                    .expectedStudentCount(expected)
                    .presentCount(present)
                    .absentCount(absent)
                    .attendancePercentage(pctStr)
                    .percentageNumeric(pctNum)
                    .build());
        }

        return result;
    }

    // =========================================================================
    // 7. STUDENT ATTENDANCE SUMMARIES (EFFICIENT 2-PASS AGGREGATE)
    // =========================================================================
    public List<StudentAttendanceSummaryResponse> getStudentAttendanceSummaries(
            UUID lecturerId,
            UUID programmeId,
            UUID moduleId,
            UUID batchId,
            LocalDate startDate,
            LocalDate endDate,
            String semester,
            Double threshold,
            String search
    ) {
        // Query 1: Eligible finalized sessions per student
        List<Object[]> eligibleRows = sessionStudentRepository.countEligibleFinalizedSessionsPerStudent(
                lecturerId, moduleId, batchId, programmeId, startDate, endDate, semester
        );

        // Query 2: Attended sessions per student
        List<Object[]> attendedRows = attendanceRecordRepository.countAttendedSessionsPerStudent(
                lecturerId, moduleId, batchId, programmeId, startDate, endDate, semester
        );

        Map<UUID, Long> attendedMap = new HashMap<>();
        for (Object[] row : attendedRows) {
            UUID studentId = (UUID) row[0];
            long count = ((Number) row[1]).longValue();
            attendedMap.put(studentId, count);
        }

        String searchLower = search != null && !search.isBlank() ? search.trim().toLowerCase() : null;
        List<StudentAttendanceSummaryResponse> summaries = new ArrayList<>();

        for (Object[] row : eligibleRows) {
            UUID studentId = (UUID) row[0];
            String officialStudentId = (String) row[1];
            String fullName = (String) row[2];
            String batchCode = (String) row[3];
            long eligibleFinalized = ((Number) row[4]).longValue();

            if (searchLower != null) {
                boolean matchesId = officialStudentId != null && officialStudentId.toLowerCase().contains(searchLower);
                boolean matchesName = fullName != null && fullName.toLowerCase().contains(searchLower);
                if (!matchesId && !matchesName) {
                    continue;
                }
            }

            long attended = attendedMap.getOrDefault(studentId, 0L);
            long missed = Math.max(0, eligibleFinalized - attended);

            String pctStr = "N/A";
            Double pctNum = null;
            boolean isLow = false;

            if (eligibleFinalized > 0) {
                double raw = ((double) attended / eligibleFinalized) * 100.0;
                pctNum = Math.round(raw * 10.0) / 10.0;
                pctStr = String.format(Locale.US, "%.1f%%", raw);
                if (threshold != null && pctNum < threshold) {
                    isLow = true;
                }
            }

            summaries.add(StudentAttendanceSummaryResponse.builder()
                    .studentId(studentId)
                    .officialStudentId(officialStudentId)
                    .fullName(fullName)
                    .batchCode(batchCode)
                    .eligibleFinalizedSessions(eligibleFinalized)
                    .attendedSessions(attended)
                    .missedSessions(missed)
                    .attendancePercentage(pctStr)
                    .percentageNumeric(pctNum)
                    .isLowAttendance(isLow)
                    .build());
        }

        // Sort by officialStudentId
        summaries.sort(Comparator.comparing(StudentAttendanceSummaryResponse::getOfficialStudentId, Comparator.nullsLast(String::compareTo)));
        return summaries;
    }

    // =========================================================================
    // 8. STUDENT DETAILED ATTENDANCE HISTORY
    // =========================================================================
    public StudentDetailedAttendanceResponse getStudentDetailedAttendance(
            UUID requestingUserId,
            boolean isAdmin,
            UUID studentId,
            UUID moduleId,
            LocalDate startDate,
            LocalDate endDate
    ) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        UUID lecturerId = null;
        if (!isAdmin) {
            Lecturer lecturer = getLecturerByUserId(requestingUserId);
            lecturerId = lecturer.getId();
        }

        List<SessionStudent> sessionStudents = sessionStudentRepository.findStudentEligibleSessions(
                studentId, lecturerId, moduleId, startDate, endDate
        );

        // Security check: if lecturer, student must have at least one session with them or be assigned
        if (!isAdmin && sessionStudents.isEmpty()) {
            boolean hasAssignment = lecturerModuleAssignmentRepository.findByLecturerIdAndIsActiveTrue(lecturerId).stream()
                    .anyMatch(a -> a.getBatch() != null && a.getBatch().getId().equals(student.getBatch().getId()));
            if (!hasAssignment) {
                throw new BadRequestException("Access denied: You are not authorized to view attendance records for this student");
            }
        }

        Set<UUID> sessionIds = sessionStudents.stream().map(ss -> ss.getSession().getId()).collect(Collectors.toSet());
        List<AttendanceRecord> records = sessionIds.isEmpty() ? Collections.emptyList() :
                attendanceRecordRepository.findByStudentIdAndSessionIdIn(studentId, sessionIds);

        Map<UUID, AttendanceRecord> recordMap = new HashMap<>();
        for (AttendanceRecord r : records) {
            recordMap.put(r.getSession().getId(), r);
        }

        long eligibleFinalized = 0;
        long attended = 0;
        long missed = 0;

        List<StudentDetailedAttendanceResponse.StudentSessionHistoryItem> history = new ArrayList<>();

        for (SessionStudent ss : sessionStudents) {
            LabSession s = ss.getSession();
            boolean isFinalized = s.getStatus() == SessionStatus.FINALIZED || s.getStatus() == SessionStatus.CLOSED;

            AttendanceRecord ar = recordMap.get(s.getId());
            String attendanceStatus = "UNRECORDED";
            String method = "—";
            java.time.OffsetDateTime markedAt = null;
            Boolean isCorrected = false;
            String justificationNotes = null;

            if (ar != null) {
                attendanceStatus = ar.getStatus().name();
                method = ar.getMethod() != null ? ar.getMethod().name() : "—";
                markedAt = ar.getMarkedAt();
                isCorrected = ar.getIsCorrected();
                justificationNotes = ar.getJustificationNotes();
            } else if (isFinalized) {
                attendanceStatus = "ABSENT";
            }

            boolean isExpectedSession = !Boolean.FALSE.equals(ss.getIsExpected());
            if (isFinalized && isExpectedSession) {
                eligibleFinalized++;
                if ("PRESENT".equalsIgnoreCase(attendanceStatus) || "LATE".equalsIgnoreCase(attendanceStatus)) {
                    attended++;
                } else {
                    missed++;
                }
            }

            history.add(StudentDetailedAttendanceResponse.StudentSessionHistoryItem.builder()
                    .sessionId(s.getId())
                    .sessionCode(s.getSessionCode())
                    .moduleCode(s.getModule() != null ? s.getModule().getModuleCode() : null)
                    .moduleName(s.getModule() != null ? s.getModule().getName() : null)
                    .batchCode(s.getBatch() != null ? s.getBatch().getBatchCode() : null)
                    .sessionDate(s.getSessionDate())
                    .startTime(s.getStartTime())
                    .endTime(s.getEndTime())
                    .sessionStatus(s.getStatus().name())
                    .attendanceStatus(attendanceStatus)
                    .method(method)
                    .markedAt(markedAt)
                    .isCorrected(isCorrected)
                    .justificationNotes(justificationNotes)
                    .isCrossGroup(ar != null && Boolean.TRUE.equals(ar.getIsCrossGroup()))
                    .sessionGroupName(s.getLabGroup() != null ? s.getLabGroup().getGroupName() : null)
                    .homeGroupName(ar != null && ar.getHomeLabGroup() != null ? ar.getHomeLabGroup().getGroupName() : (student.getLabGroup() != null ? student.getLabGroup().getGroupName() : null))
                    .lecturerName(s.getLecturer() != null ? s.getLecturer().getFullName() : null)
                    .build());
        }

        String pctStr = "N/A";
        Double pctNum = null;
        if (eligibleFinalized > 0) {
            double raw = ((double) attended / eligibleFinalized) * 100.0;
            pctNum = Math.round(raw * 10.0) / 10.0;
            pctStr = String.format(Locale.US, "%.1f%%", raw);
        }

        return StudentDetailedAttendanceResponse.builder()
                .studentId(student.getId())
                .officialStudentId(student.getStudentId())
                .fullName(student.getFullName())
                .email(student.getEmail())
                .batchCode(student.getBatch() != null ? student.getBatch().getBatchCode() : null)
                .programmeName(student.getDegreeProgramme() != null ? student.getDegreeProgramme().getName() : null)
                .eligibleFinalizedSessions(eligibleFinalized)
                .attendedSessions(attended)
                .missedSessions(missed)
                .attendancePercentage(pctStr)
                .percentageNumeric(pctNum)
                .history(history)
                .build();
    }

    public Lecturer getLecturerByUserId(UUID userId) {
        return lecturerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Lecturer profile not found for user: " + userId));
    }
}
