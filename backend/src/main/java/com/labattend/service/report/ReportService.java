package com.labattend.service.report;

import com.labattend.dto.report.ReportData;
import com.labattend.dto.report.ReportExportFormat;
import com.labattend.dto.report.ReportType;
import com.labattend.entity.*;
import com.labattend.entity.Module;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import com.labattend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ReportService {

    private final LabSessionRepository labSessionRepository;
    private final SessionStudentRepository sessionStudentRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final StudentRepository studentRepository;
    private final LecturerRepository lecturerRepository;
    private final ModuleRepository moduleRepository;
    private final BatchRepository batchRepository;
    private final LaboratoryHallRepository laboratoryHallRepository;
    private final DegreeProgrammeRepository degreeProgrammeRepository;
    private final LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository;
    private final LabGroupRepository labGroupRepository;

    private final CsvReportGenerator csvReportGenerator;
    private final ExcelReportGenerator excelReportGenerator;
    private final PdfReportGenerator pdfReportGenerator;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public ReportService(
            LabSessionRepository labSessionRepository,
            SessionStudentRepository sessionStudentRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            StudentRepository studentRepository,
            LecturerRepository lecturerRepository,
            ModuleRepository moduleRepository,
            BatchRepository batchRepository,
            LaboratoryHallRepository laboratoryHallRepository,
            DegreeProgrammeRepository degreeProgrammeRepository,
            LecturerModuleAssignmentRepository lecturerModuleAssignmentRepository,
            LabGroupRepository labGroupRepository,
            CsvReportGenerator csvReportGenerator,
            ExcelReportGenerator excelReportGenerator,
            PdfReportGenerator pdfReportGenerator
    ) {
        this.labSessionRepository = labSessionRepository;
        this.sessionStudentRepository = sessionStudentRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.studentRepository = studentRepository;
        this.lecturerRepository = lecturerRepository;
        this.moduleRepository = moduleRepository;
        this.batchRepository = batchRepository;
        this.laboratoryHallRepository = laboratoryHallRepository;
        this.degreeProgrammeRepository = degreeProgrammeRepository;
        this.lecturerModuleAssignmentRepository = lecturerModuleAssignmentRepository;
        this.labGroupRepository = labGroupRepository;
        this.csvReportGenerator = csvReportGenerator;
        this.excelReportGenerator = excelReportGenerator;
        this.pdfReportGenerator = pdfReportGenerator;
    }

    // =========================================================================
    // EXPORT DISPATCHER
    // =========================================================================
    public byte[] exportReport(ReportData reportData, ReportExportFormat format) {
        if (format == ReportExportFormat.CSV) {
            return csvReportGenerator.generate(reportData);
        } else if (format == ReportExportFormat.EXCEL) {
            return excelReportGenerator.generate(reportData);
        } else if (format == ReportExportFormat.PDF) {
            return pdfReportGenerator.generate(reportData);
        }
        throw new BadRequestException("Unsupported report export format: " + format);
    }

    // =========================================================================
    // 1. INDIVIDUAL SESSION REPORT
    // =========================================================================
    public ReportData generateSessionReport(UUID sessionId, UUID requestingUserId, boolean isAdmin) {
        LabSession session = labSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        if (session.getStatus() == SessionStatus.CANCELLED) {
            throw new BadRequestException("Cancelled sessions cannot be exported as official reports.");
        }

        if (!isAdmin) {
            Lecturer lecturer = getLecturerByUserId(requestingUserId);
            if (!session.getLecturer().getId().equals(lecturer.getId())) {
                throw new AccessDeniedException("You are not authorized to view reports for sessions you do not conduct.");
            }
        }

        // Must be finalized or closed for official reports
        if (session.getStatus() != SessionStatus.FINALIZED && session.getStatus() != SessionStatus.CLOSED) {
            throw new BadRequestException("Only finalized sessions can generate official attendance reports. Current session is " + session.getStatus());
        }

        List<SessionStudent> sessionStudents = sessionStudentRepository.findBySessionId(session.getId());
        List<AttendanceRecord> records = attendanceRecordRepository.findBySessionId(session.getId());
        Map<UUID, AttendanceRecord> recordMap = records.stream()
                .collect(Collectors.toMap(r -> r.getStudent().getId(), r -> r, (a, b) -> a));

        int expected = (int) sessionStudents.stream()
                .filter(ss -> ss.getIsExpected() == null || ss.getIsExpected())
                .count();
        if (expected == 0 && !sessionStudents.isEmpty()) {
            expected = sessionStudents.size();
        }

        int present = (int) records.stream()
                .filter(r -> (r.getIsCrossGroup() == null || !r.getIsCrossGroup()) &&
                        (r.getStatus() == AttendanceStatus.PRESENT || r.getStatus() == AttendanceStatus.LATE))
                .count();
        int absent = Math.max(0, expected - present);
        int visitors = (int) records.stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsCrossGroup()))
                .count();

        String rate = formatRate(present, expected);

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Session Code", session.getSessionCode());
        meta.put("Module", session.getModule().getModuleCode() + " - " + session.getModule().getName());
        meta.put("Batch", session.getBatch() != null ? session.getBatch().getBatchCode() : "N/A");
        meta.put("Lab Group", session.getLabGroup() != null ? session.getLabGroup().getGroupName() : "Whole Batch");
        meta.put("Cross-Group Visitors", String.valueOf(visitors));
        meta.put("Session Date", session.getSessionDate().format(DATE_FORMATTER));
        meta.put("Time Window", session.getStartTime().format(TIME_FORMATTER) + " - " + session.getEndTime().format(TIME_FORMATTER));
        meta.put("Laboratory Hall", session.getHall().getName());
        meta.put("Lecturer", session.getLecturer().getFullName());
        meta.put("Lab Sheet Number", getLabSheetOrNotes(session));
        meta.put("Session Status", session.getStatus().name());

        List<String> headers = List.of(
                "#", "Student ID", "Full Name", "Lab Group", "Attendance Status", "Cross-Group", "Method", "Marked / Scanned Time", "Remarks / Correction Reason"
        );
        List<List<String>> rows = new ArrayList<>();

        int idx = 1;
        List<SessionStudent> sortedStudents = new ArrayList<>(sessionStudents);
        sortedStudents.sort(Comparator.comparing(ss -> ss.getStudent().getStudentId()));
        for (SessionStudent ss : sortedStudents) {
            Student s = ss.getStudent();
            AttendanceRecord r = recordMap.get(s.getId());

            String status = r != null ? r.getStatus().name() : "UNRECORDED";
            String method = (r != null && r.getMethod() != null) ? r.getMethod().name() : "-";
            String time = (r != null && r.getMarkedAt() != null) ? r.getMarkedAt().format(DATE_TIME_FORMATTER) : "-";
            String remarks = (r != null && r.getJustificationNotes() != null) ? r.getJustificationNotes() : "-";
            String studentGroup = s.getLabGroup() != null ? s.getLabGroup().getGroupName() : "-";
            String crossGroup = (r != null && Boolean.TRUE.equals(r.getIsCrossGroup()))
                    ? "Yes (" + (r.getHomeLabGroup() != null ? r.getHomeLabGroup().getGroupName() : (s.getLabGroup() != null ? s.getLabGroup().getGroupName() : "Other")) + ")"
                    : "No";

            rows.add(List.of(
                    String.valueOf(idx++),
                    s.getStudentId(),
                    s.getFullName(),
                    studentGroup,
                    status,
                    crossGroup,
                    method,
                    time,
                    remarks
            ));
        }

        return buildReportData("Individual Session Attendance", ReportType.SESSION, meta, expected, present, absent, rate, headers, rows,
                "Finalized official session record conducted at " + session.getHall().getName() + ". Cross-group visitors: " + visitors + ".");
    }

    // =========================================================================
    // 2. DAILY ATTENDANCE REPORT
    // =========================================================================
    public ReportData generateDailyReport(LocalDate sessionDate, UUID labGroupId, UUID requestingUserId, boolean isAdmin) {
        if (sessionDate == null) {
            throw new BadRequestException("Session date is required for Daily Attendance Report.");
        }

        UUID lecturerId = null;
        String lecturerName = "All Lecturers (Institutional)";
        if (!isAdmin) {
            Lecturer lecturer = getLecturerByUserId(requestingUserId);
            lecturerId = lecturer.getId();
            lecturerName = lecturer.getFullName();
        }

        List<LabSession> sessions = labSessionRepository.findFinalizedSessionsForReports(
                null, sessionDate, null, null, null, null, labGroupId, null, null, lecturerId);

        int totalExpected = 0;
        int totalPresent = 0;
        int totalAbsent = 0;
        int totalVisitors = 0;

        List<String> headers = List.of(
                "#", "Session Code", "Module", "Batch", "Lab Group", "Hall", "Time Window", "Lecturer", "Lab Sheet #", "Expected", "Present", "Absent", "Visitors", "Attendance %"
        );
        List<List<String>> rows = new ArrayList<>();

        int idx = 1;
        for (LabSession s : sessions) {
            int exp = (int) sessionStudentRepository.countBySessionIdAndIsExpectedTrue(s.getId());
            int pres = (int) attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(
                    s.getId(), List.of(AttendanceStatus.PRESENT, AttendanceStatus.LATE));
            int abs = Math.max(0, exp - pres);
            int visitors = (int) attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrue(s.getId());
            String r = formatRate(pres, exp);

            totalExpected += exp;
            totalPresent += pres;
            totalAbsent += abs;
            totalVisitors += visitors;

            rows.add(List.of(
                    String.valueOf(idx++),
                    s.getSessionCode(),
                    s.getModule().getModuleCode(),
                    s.getBatch() != null ? s.getBatch().getBatchCode() : "N/A",
                    s.getLabGroup() != null ? s.getLabGroup().getGroupName() : "Whole Batch",
                    s.getHall().getName(),
                    s.getStartTime().format(TIME_FORMATTER) + " - " + s.getEndTime().format(TIME_FORMATTER),
                    s.getLecturer().getFullName(),
                    getLabSheetOrNotes(s),
                    String.valueOf(exp),
                    String.valueOf(pres),
                    String.valueOf(abs),
                    String.valueOf(visitors),
                    r
            ));
        }

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Report Date", sessionDate.format(DATE_FORMATTER));
        meta.put("Audited Scope", lecturerName);
        if (labGroupId != null) {
            LabGroup g = labGroupRepository.findById(labGroupId).orElse(null);
            if (g != null) meta.put("Lab Group Filter", g.getGroupName());
        }
        meta.put("Total Sessions Conducted", String.valueOf(sessions.size()));
        meta.put("Total Cross-Group Visitors", String.valueOf(totalVisitors));

        return buildReportData("Daily Attendance Audit", ReportType.DAILY, meta, totalExpected, totalPresent, totalAbsent,
                formatRate(totalPresent, totalExpected), headers, rows,
                "Audit includes all " + sessions.size() + " finalized sessions conducted on " + sessionDate.format(DATE_FORMATTER));
    }

    // =========================================================================
    // 3. STUDENT HISTORY REPORT
    // =========================================================================
    public ReportData generateStudentHistoryReport(
            UUID studentId,
            UUID moduleId,
            LocalDate startDate,
            LocalDate endDate,
            UUID requestingUserId,
            boolean isAdmin
    ) {
        return generateStudentHistoryReport(
                studentId != null ? studentId.toString() : null,
                moduleId,
                startDate,
                endDate,
                requestingUserId,
                isAdmin
        );
    }

    public ReportData generateStudentHistoryReport(
            String studentIdentifier,
            UUID moduleId,
            LocalDate startDate,
            LocalDate endDate,
            UUID requestingUserId,
            boolean isAdmin
    ) {
        if (studentIdentifier == null || studentIdentifier.trim().isEmpty()) {
            throw new BadRequestException("Student ID or Matriculation Number is required for Student History Report.");
        }

        String trimmed = studentIdentifier.trim();
        Student student = null;
        try {
            UUID sUuid = UUID.fromString(trimmed);
            student = studentRepository.findById(sUuid).orElse(null);
        } catch (IllegalArgumentException ignored) {
            // Not a UUID, fallback to matriculation studentId
        }

        if (student == null) {
            student = studentRepository.findByStudentId(trimmed)
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found for identifier: " + trimmed));
        }

        UUID lecturerId = null;
        if (!isAdmin) {
            Lecturer lecturer = getLecturerByUserId(requestingUserId);
            lecturerId = lecturer.getId();
        }

        List<SessionStudent> eligible = sessionStudentRepository.findStudentEligibleSessions(
                student.getId(), lecturerId, moduleId, startDate, endDate);

        // Filter only finalized or closed
        eligible = eligible.stream()
                .filter(ss -> ss.getSession().getStatus() == SessionStatus.FINALIZED || ss.getSession().getStatus() == SessionStatus.CLOSED)
                .collect(Collectors.toList());

        List<UUID> sessionIds = eligible.stream().map(ss -> ss.getSession().getId()).collect(Collectors.toList());
        List<AttendanceRecord> records = sessionIds.isEmpty() ? List.of() :
                attendanceRecordRepository.findByStudentIdAndSessionIdIn(student.getId(), sessionIds);
        Map<UUID, AttendanceRecord> recordMap = records.stream()
                .collect(Collectors.toMap(r -> r.getSession().getId(), r -> r, (a, b) -> a));

        int totalEligible = 0;
        int presentCount = 0;
        int absentCount = 0;
        int crossGroupCount = 0;

        List<String> headers = List.of(
                "#", "Date", "Session Code", "Module", "Batch", "Lab Group", "Cross-Group", "Hall", "Lab Sheet #", "Attendance Status", "Marked Time", "Method"
        );
        List<List<String>> rows = new ArrayList<>();

        int idx = 1;
        for (SessionStudent ss : eligible) {
            LabSession s = ss.getSession();
            AttendanceRecord r = recordMap.get(s.getId());
            boolean isCrossGroup = (r != null && Boolean.TRUE.equals(r.getIsCrossGroup())) || Boolean.FALSE.equals(ss.getIsExpected());
            String status = r != null ? r.getStatus().name() : "ABSENT";

            if (isCrossGroup) {
                crossGroupCount++;
            } else {
                totalEligible++;
                if (r != null && (r.getStatus() == AttendanceStatus.PRESENT || r.getStatus() == AttendanceStatus.LATE)) {
                    presentCount++;
                } else {
                    absentCount++;
                }
            }

            rows.add(List.of(
                    String.valueOf(idx++),
                    s.getSessionDate().format(DATE_FORMATTER),
                    s.getSessionCode(),
                    s.getModule().getModuleCode() + " - " + s.getModule().getName(),
                    s.getBatch() != null ? s.getBatch().getBatchCode() : "N/A",
                    s.getLabGroup() != null ? s.getLabGroup().getGroupName() : "Whole Batch",
                    isCrossGroup ? "Yes (Visitor)" : "No",
                    s.getHall().getName(),
                    getLabSheetOrNotes(s),
                    status,
                    (r != null && r.getMarkedAt() != null) ? r.getMarkedAt().format(DATE_TIME_FORMATTER) : "-",
                    (r != null && r.getMethod() != null) ? r.getMethod().name() : "-"
            ));
        }

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Student Identification", student.getStudentId());
        meta.put("Full Name", student.getFullName());
        meta.put("Batch", student.getBatch() != null ? student.getBatch().getBatchCode() : "N/A");
        meta.put("Lab Group", student.getLabGroup() != null ? student.getLabGroup().getGroupName() : "Unassigned");
        meta.put("Degree Programme", student.getDegreeProgramme() != null ? student.getDegreeProgramme().getName() : "N/A");
        meta.put("Cross-Group Visits Attended", String.valueOf(crossGroupCount));
        if (startDate != null || endDate != null) {
            meta.put("Date Filter", (startDate != null ? startDate.format(DATE_FORMATTER) : "Earliest") + " to " +
                    (endDate != null ? endDate.format(DATE_FORMATTER) : "Latest"));
        }
        if (moduleId != null) {
            Module m = moduleRepository.findById(moduleId).orElse(null);
            if (m != null) meta.put("Module", m.getModuleCode() + " - " + m.getName());
        }

        return buildReportData("Student Attendance History", ReportType.STUDENT_HISTORY, meta,
                totalEligible, presentCount, absentCount, formatRate(presentCount, totalEligible), headers, rows,
                "Audited attendance history for " + student.getFullName() + " (" + student.getStudentId() + "). Attended other group sessions: " + crossGroupCount + ".");
    }

    // =========================================================================
    // 4. MODULE-WISE REPORT
    // =========================================================================
    public ReportData generateModuleReport(
            UUID moduleId,
            UUID batchId,
            UUID labGroupId,
            LocalDate startDate,
            LocalDate endDate,
            UUID requestingUserId,
            boolean isAdmin
    ) {
        if (moduleId == null) {
            throw new BadRequestException("Module ID is required for Module-wise Report.");
        }
        Module module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Module not found: " + moduleId));

        UUID lecturerId = null;
        if (!isAdmin) {
            Lecturer lecturer = getLecturerByUserId(requestingUserId);
            lecturerId = lecturer.getId();
            boolean assigned = lecturerModuleAssignmentRepository.findByLecturerId(lecturerId).stream()
                    .anyMatch(lma -> lma.getModule().getId().equals(moduleId));
            if (!assigned) {
                throw new AccessDeniedException("You are not assigned to module " + module.getModuleCode());
            }
        }

        List<LabSession> sessions = labSessionRepository.findFinalizedSessionsForReports(
                null, null, startDate, endDate, moduleId, batchId, labGroupId, null, null, lecturerId);

        int totalExpected = 0;
        int totalPresent = 0;
        int totalAbsent = 0;
        int totalVisitors = 0;

        List<String> headers = List.of(
                "#", "Session Code", "Date", "Batch", "Lab Group", "Hall", "Lecturer", "Lab Sheet #", "Expected", "Present", "Absent", "Visitors", "Attendance Rate"
        );
        List<List<String>> rows = new ArrayList<>();

        int idx = 1;
        for (LabSession s : sessions) {
            int exp = (int) sessionStudentRepository.countBySessionIdAndIsExpectedTrue(s.getId());
            int pres = (int) attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(
                    s.getId(), List.of(AttendanceStatus.PRESENT, AttendanceStatus.LATE));
            int abs = Math.max(0, exp - pres);
            int visitors = (int) attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrue(s.getId());

            totalExpected += exp;
            totalPresent += pres;
            totalAbsent += abs;
            totalVisitors += visitors;

            rows.add(List.of(
                    String.valueOf(idx++),
                    s.getSessionCode(),
                    s.getSessionDate().format(DATE_FORMATTER),
                    s.getBatch() != null ? s.getBatch().getBatchCode() : "N/A",
                    s.getLabGroup() != null ? s.getLabGroup().getGroupName() : "Whole Batch",
                    s.getHall().getName(),
                    s.getLecturer().getFullName(),
                    getLabSheetOrNotes(s),
                    String.valueOf(exp),
                    String.valueOf(pres),
                    String.valueOf(abs),
                    String.valueOf(visitors),
                    formatRate(pres, exp)
            ));
        }

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Module", module.getModuleCode() + " - " + module.getName());
        meta.put("Semester", module.getSemester() != null ? module.getSemester() : "N/A");
        if (batchId != null) {
            Batch b = batchRepository.findById(batchId).orElse(null);
            if (b != null) meta.put("Target Batch", b.getBatchCode());
        }
        if (labGroupId != null) {
            LabGroup g = labGroupRepository.findById(labGroupId).orElse(null);
            if (g != null) meta.put("Lab Group Filter", g.getGroupName());
        }
        if (startDate != null || endDate != null) {
            meta.put("Date Filter", (startDate != null ? startDate.format(DATE_FORMATTER) : "Start") + " to " +
                    (endDate != null ? endDate.format(DATE_FORMATTER) : "End"));
        }
        meta.put("Conducted Sessions", String.valueOf(sessions.size()));
        meta.put("Total Cross-Group Visitors", String.valueOf(totalVisitors));

        return buildReportData("Module Attendance Comprehensive Audit", ReportType.MODULE, meta,
                totalExpected, totalPresent, totalAbsent, formatRate(totalPresent, totalExpected), headers, rows,
                "Detailed breakdown of finalized sessions for module " + module.getModuleCode());
    }

    // =========================================================================
    // 5. BATCH-WISE REPORT
    // =========================================================================
    public ReportData generateBatchReport(
            UUID batchId,
            UUID moduleId,
            UUID labGroupId,
            LocalDate startDate,
            LocalDate endDate,
            UUID requestingUserId,
            boolean isAdmin
    ) {
        if (batchId == null) {
            throw new BadRequestException("Batch ID is required for Batch-wise Report.");
        }
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));

        UUID lecturerId = null;
        if (!isAdmin) {
            Lecturer lecturer = getLecturerByUserId(requestingUserId);
            lecturerId = lecturer.getId();
        }

        List<LabSession> sessions = labSessionRepository.findFinalizedSessionsForReports(
                null, null, startDate, endDate, moduleId, batchId, labGroupId, null, null, lecturerId);

        int totalExpected = 0;
        int totalPresent = 0;
        int totalAbsent = 0;
        int totalVisitors = 0;

        List<String> headers = List.of(
                "#", "Date", "Session Code", "Module", "Lab Group", "Hall", "Lecturer", "Lab Sheet #", "Expected", "Present", "Absent", "Visitors", "Rate (%)"
        );
        List<List<String>> rows = new ArrayList<>();

        int idx = 1;
        for (LabSession s : sessions) {
            int exp = (int) sessionStudentRepository.countBySessionIdAndIsExpectedTrue(s.getId());
            int pres = (int) attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(
                    s.getId(), List.of(AttendanceStatus.PRESENT, AttendanceStatus.LATE));
            int abs = Math.max(0, exp - pres);
            int visitors = (int) attendanceRecordRepository.countBySessionIdAndIsCrossGroupTrue(s.getId());

            totalExpected += exp;
            totalPresent += pres;
            totalAbsent += abs;
            totalVisitors += visitors;

            rows.add(List.of(
                    String.valueOf(idx++),
                    s.getSessionDate().format(DATE_FORMATTER),
                    s.getSessionCode(),
                    s.getModule().getModuleCode() + " - " + s.getModule().getName(),
                    s.getLabGroup() != null ? s.getLabGroup().getGroupName() : "Whole Batch",
                    s.getHall().getName(),
                    s.getLecturer().getFullName(),
                    getLabSheetOrNotes(s),
                    String.valueOf(exp),
                    String.valueOf(pres),
                    String.valueOf(abs),
                    String.valueOf(visitors),
                    formatRate(pres, exp)
            ));
        }

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Batch Code", batch.getBatchCode());
        meta.put("Degree Programme", batch.getDegreeProgramme() != null ? batch.getDegreeProgramme().getName() : "N/A");
        meta.put("Academic Year", batch.getAcademicYear() != null ? batch.getAcademicYear() : "N/A");
        if (labGroupId != null) {
            LabGroup g = labGroupRepository.findById(labGroupId).orElse(null);
            if (g != null) meta.put("Lab Group Filter", g.getGroupName());
        }
        if (moduleId != null) {
            Module m = moduleRepository.findById(moduleId).orElse(null);
            if (m != null) meta.put("Filtered Module", m.getModuleCode() + " - " + m.getName());
        }
        if (startDate != null || endDate != null) {
            meta.put("Date Period", (startDate != null ? startDate.format(DATE_FORMATTER) : "Start") + " to " +
                    (endDate != null ? endDate.format(DATE_FORMATTER) : "End"));
        }
        meta.put("Total Sessions", String.valueOf(sessions.size()));
        meta.put("Total Cross-Group Visitors", String.valueOf(totalVisitors));

        return buildReportData("Batch Attendance Audit", ReportType.BATCH, meta,
                totalExpected, totalPresent, totalAbsent, formatRate(totalPresent, totalExpected), headers, rows,
                "Audit report for student cohort batch " + batch.getBatchCode());
    }

    // =========================================================================
    // 6. SEMESTER REPORT
    // =========================================================================
    public ReportData generateSemesterReport(
            String semester,
            UUID programmeId,
            UUID batchId,
            UUID labGroupId,
            UUID moduleId,
            LocalDate startDate,
            LocalDate endDate,
            UUID requestingUserId,
            boolean isAdmin
    ) {
        if (semester == null || semester.trim().isEmpty()) {
            throw new BadRequestException("Semester identifier is required for Semester Report.");
        }

        UUID lecturerId = null;
        if (!isAdmin) {
            Lecturer lecturer = getLecturerByUserId(requestingUserId);
            lecturerId = lecturer.getId();
        }

        List<LabSession> sessions = labSessionRepository.findFinalizedSessionsForReports(
                null, null, startDate, endDate, moduleId, batchId, labGroupId, programmeId, semester, lecturerId);

        Map<Module, List<LabSession>> moduleMap = sessions.stream()
                .collect(Collectors.groupingBy(LabSession::getModule));

        int totalExpected = 0;
        int totalPresent = 0;
        int totalAbsent = 0;

        List<String> headers = List.of(
                "#", "Module Code", "Module Name", "Finalized Sessions", "Expected Student Slots", "Present Slots", "Absent Slots", "Average Rate"
        );
        List<List<String>> rows = new ArrayList<>();

        int idx = 1;
        for (Map.Entry<Module, List<LabSession>> entry : moduleMap.entrySet()) {
            Module m = entry.getKey();
            List<LabSession> modSessions = entry.getValue();

            int modExp = 0;
            int modPres = 0;
            int modAbs = 0;

            for (LabSession s : modSessions) {
                int exp = (int) sessionStudentRepository.countBySessionIdAndIsExpectedTrue(s.getId());
                int pres = (int) attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(
                        s.getId(), List.of(AttendanceStatus.PRESENT, AttendanceStatus.LATE));
                int abs = Math.max(0, exp - pres);
                modExp += exp;
                modPres += pres;
                modAbs += abs;
            }

            totalExpected += modExp;
            totalPresent += modPres;
            totalAbsent += modAbs;

            rows.add(List.of(
                    String.valueOf(idx++),
                    m.getModuleCode(),
                    m.getName(),
                    String.valueOf(modSessions.size()),
                    String.valueOf(modExp),
                    String.valueOf(modPres),
                    String.valueOf(modAbs),
                    formatRate(modPres, modExp)
            ));
        }

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Academic Semester", semester);
        if (programmeId != null) {
            DegreeProgramme dp = degreeProgrammeRepository.findById(programmeId).orElse(null);
            if (dp != null) meta.put("Degree Programme", dp.getName());
        }
        if (batchId != null) {
            Batch b = batchRepository.findById(batchId).orElse(null);
            if (b != null) meta.put("Batch", b.getBatchCode());
        }
        if (labGroupId != null) {
            LabGroup g = labGroupRepository.findById(labGroupId).orElse(null);
            if (g != null) meta.put("Lab Group Filter", g.getGroupName());
        }
        meta.put("Total Sessions Evaluated", String.valueOf(sessions.size()));

        return buildReportData("Semester-Wide Attendance Summary", ReportType.SEMESTER, meta,
                totalExpected, totalPresent, totalAbsent, formatRate(totalPresent, totalExpected), headers, rows,
                "Aggregated academic semester audit for " + semester);
    }

    // =========================================================================
    // 7. LOW ATTENDANCE ALERT REPORT
    // =========================================================================
    public ReportData generateLowAttendanceReport(
            Double threshold,
            UUID programmeId,
            UUID moduleId,
            UUID batchId,
            UUID labGroupId,
            LocalDate startDate,
            LocalDate endDate,
            UUID requestingUserId,
            boolean isAdmin
    ) {
        double cutoff = (threshold != null && threshold > 0) ? threshold : 80.0;

        UUID lecturerId = null;
        if (!isAdmin) {
            Lecturer lecturer = getLecturerByUserId(requestingUserId);
            lecturerId = lecturer.getId();
        }

        List<Object[]> eligibleRows = sessionStudentRepository.countEligibleFinalizedSessionsPerStudent(
                lecturerId, moduleId, batchId, labGroupId, programmeId, startDate, endDate, null);

        List<Object[]> attendedRows = attendanceRecordRepository.countAttendedSessionsPerStudent(
                lecturerId, moduleId, batchId, labGroupId, programmeId, startDate, endDate, null);

        Map<UUID, Long> attendedMap = new HashMap<>();
        for (Object[] r : attendedRows) {
            attendedMap.put((UUID) r[0], ((Number) r[1]).longValue());
        }

        List<String> headers = List.of(
                "#", "Student ID", "Full Name", "Batch", "Lab Group", "Eligible Sessions", "Attended Sessions", "Absent Sessions", "Attendance Rate", "Deficit to " + String.format("%.1f", cutoff) + "%"
        );
        List<List<String>> rows = new ArrayList<>();

        int totalExpectedSlots = 0;
        int totalPresentSlots = 0;
        int totalAbsentSlots = 0;
        int idx = 1;

        for (Object[] r : eligibleRows) {
            UUID sId = (UUID) r[0];
            String studentIdStr = (String) r[1];
            String fullName = (String) r[2];
            String batchCode = (String) r[3];
            String groupName = r[5] != null ? (String) r[5] : "Unassigned";
            long eligibleSessions = ((Number) r[6]).longValue();

            if (eligibleSessions == 0) continue;

            long attended = attendedMap.getOrDefault(sId, 0L);
            long absent = eligibleSessions - attended;
            double rate = (attended * 100.0) / eligibleSessions;

            if (rate < cutoff) {
                totalExpectedSlots += eligibleSessions;
                totalPresentSlots += attended;
                totalAbsentSlots += absent;

                double deficit = cutoff - rate;

                rows.add(List.of(
                        String.valueOf(idx++),
                        studentIdStr,
                        fullName,
                        batchCode != null ? batchCode : "N/A",
                        groupName,
                        String.valueOf(eligibleSessions),
                        String.valueOf(attended),
                        String.valueOf(absent),
                        String.format(Locale.US, "%.1f%%", rate),
                        String.format(Locale.US, "-%.1f%%", deficit)
                ));
            }
        }

        rows.sort(Comparator.comparing(row -> Double.parseDouble(row.get(8).replace("%", ""))));
        for (int i = 0; i < rows.size(); i++) {
            List<String> mutableRow = new ArrayList<>(rows.get(i));
            mutableRow.set(0, String.valueOf(i + 1));
            rows.set(i, mutableRow);
        }

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Attendance Threshold", String.format(Locale.US, "%.1f%%", cutoff));
        meta.put("At-Risk Students Identified", String.valueOf(rows.size()));
        if (moduleId != null) {
            Module m = moduleRepository.findById(moduleId).orElse(null);
            if (m != null) meta.put("Module", m.getModuleCode() + " - " + m.getName());
        }
        if (batchId != null) {
            Batch b = batchRepository.findById(batchId).orElse(null);
            if (b != null) meta.put("Batch", b.getBatchCode());
        }
        if (labGroupId != null) {
            LabGroup g = labGroupRepository.findById(labGroupId).orElse(null);
            if (g != null) meta.put("Lab Group Filter", g.getGroupName());
        }

        return buildReportData("Low Attendance Risk Audit", ReportType.LOW_ATTENDANCE, meta,
                totalExpectedSlots, totalPresentSlots, totalAbsentSlots,
                formatRate(totalPresentSlots, totalExpectedSlots), headers, rows,
                "Warning: Contains " + rows.size() + " students falling below the statutory " + String.format(Locale.US, "%.1f", cutoff) + "% threshold.");
    }

    // =========================================================================
    // 8. LABORATORY HALL SESSION REPORT
    // =========================================================================
    public ReportData generateHallReport(
            UUID hallId,
            LocalDate startDate,
            LocalDate endDate,
            UUID requestingUserId,
            boolean isAdmin
    ) {
        if (hallId == null) {
            throw new BadRequestException("Laboratory Hall ID is required for Hall Session Report.");
        }
        LaboratoryHall hall = laboratoryHallRepository.findById(hallId)
                .orElseThrow(() -> new ResourceNotFoundException("Laboratory Hall not found: " + hallId));

        UUID lecturerId = null;
        if (!isAdmin) {
            Lecturer lecturer = getLecturerByUserId(requestingUserId);
            lecturerId = lecturer.getId();
        }

        List<LabSession> sessions = labSessionRepository.findFinalizedSessionsForReports(
                hallId, null, startDate, endDate, null, null, null, null, null, lecturerId);

        int totalExpected = 0;
        int totalPresent = 0;
        int totalAbsent = 0;

        List<String> headers = List.of(
                "#", "Date", "Session Code", "Module", "Batch", "Lab Group", "Lecturer", "Time Slot", "Expected", "Present", "Absent", "Turnout Rate", "Hall Utilization"
        );
        List<List<String>> rows = new ArrayList<>();

        int idx = 1;
        for (LabSession s : sessions) {
            int exp = (int) sessionStudentRepository.countBySessionIdAndIsExpectedTrue(s.getId());
            int pres = (int) attendanceRecordRepository.countBySessionIdAndIsCrossGroupFalseAndStatusIn(
                    s.getId(), List.of(AttendanceStatus.PRESENT, AttendanceStatus.LATE));
            int abs = Math.max(0, exp - pres);

            totalExpected += exp;
            totalPresent += pres;
            totalAbsent += abs;

            double hallUtilization = hall.getCapacity() > 0 ? (pres * 100.0) / hall.getCapacity() : 0.0;

            rows.add(List.of(
                    String.valueOf(idx++),
                    s.getSessionDate().format(DATE_FORMATTER),
                    s.getSessionCode(),
                    s.getModule().getModuleCode() + " - " + s.getModule().getName(),
                    s.getBatch() != null ? s.getBatch().getBatchCode() : "N/A",
                    s.getLabGroup() != null ? s.getLabGroup().getGroupName() : "Whole Batch",
                    s.getLecturer().getFullName(),
                    s.getStartTime().format(TIME_FORMATTER) + " - " + s.getEndTime().format(TIME_FORMATTER),
                    String.valueOf(exp),
                    String.valueOf(pres),
                    String.valueOf(abs),
                    formatRate(pres, exp),
                    String.format(Locale.US, "%.1f%%", hallUtilization)
            ));
        }

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Laboratory Hall", hall.getName());
        meta.put("Building / Location", hall.getLocation() != null ? hall.getLocation() : "Main Campus");
        meta.put("Hall Seating Capacity", String.valueOf(hall.getCapacity()));
        if (startDate != null || endDate != null) {
            meta.put("Period Audited", (startDate != null ? startDate.format(DATE_FORMATTER) : "Start") + " to " +
                    (endDate != null ? endDate.format(DATE_FORMATTER) : "End"));
        }
        meta.put("Conducted Sessions", String.valueOf(sessions.size()));

        return buildReportData("Laboratory Hall Session & Utilization Audit", ReportType.HALL, meta,
                totalExpected, totalPresent, totalAbsent, formatRate(totalPresent, totalExpected), headers, rows,
                "Facility usage and attendance metrics for " + hall.getName());
    }

    // =========================================================================
    // 9. CROSS-GROUP ATTENDANCE REPORT
    // =========================================================================
    public ReportData generateCrossGroupReport(
            UUID batchId,
            UUID labGroupId,
            UUID moduleId,
            LocalDate startDate,
            LocalDate endDate,
            UUID requestingUserId,
            boolean isAdmin
    ) {
        UUID lecturerId = null;
        if (!isAdmin) {
            Lecturer lecturer = getLecturerByUserId(requestingUserId);
            lecturerId = lecturer.getId();
        }

        List<AttendanceRecord> records = attendanceRecordRepository.findCrossGroupAttendanceRecords(
                lecturerId, moduleId, batchId, labGroupId, startDate, endDate
        );

        List<String> headers = List.of(
                "#", "Student ID", "Student Name", "Home Group", "Attended Session", "Session Group", "Session Date", "Lecturer", "Lab Sheet / Notes"
        );
        List<List<String>> rows = new ArrayList<>();

        int idx = 1;
        for (AttendanceRecord r : records) {
            Student s = r.getStudent();
            LabSession session = r.getSession();
            String homeGroup = r.getHomeLabGroup() != null ? r.getHomeLabGroup().getGroupName() :
                    (s.getLabGroup() != null ? s.getLabGroup().getGroupName() : "Unassigned");
            String sessionGroup = session.getLabGroup() != null ? session.getLabGroup().getGroupName() : "Whole Batch";
            String lecturerName = session.getLecturer() != null && session.getLecturer().getUser() != null ?
                    session.getLecturer().getUser().getFullName() : (session.getLecturer() != null ? session.getLecturer().getFullName() : "N/A");

            rows.add(List.of(
                    String.valueOf(idx++),
                    s.getStudentId(),
                    s.getFullName(),
                    homeGroup,
                    session.getSessionCode(),
                    sessionGroup,
                    session.getSessionDate().format(DATE_FORMATTER),
                    lecturerName,
                    getLabSheetOrNotes(session)
            ));
        }

        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("Report Type", "Cross-Group Attendance Audit");
        meta.put("Scope", isAdmin ? "Institutional (All Sessions)" : "Lecturer Conducted Sessions");
        if (batchId != null) {
            Batch b = batchRepository.findById(batchId).orElse(null);
            if (b != null) meta.put("Batch", b.getBatchCode());
        }
        if (labGroupId != null) {
            LabGroup g = labGroupRepository.findById(labGroupId).orElse(null);
            if (g != null) meta.put("Lab Group Filter", g.getGroupName());
        }
        if (moduleId != null) {
            Module m = moduleRepository.findById(moduleId).orElse(null);
            if (m != null) meta.put("Module", m.getModuleCode() + " - " + m.getName());
        }
        if (startDate != null || endDate != null) {
            meta.put("Date Filter", (startDate != null ? startDate.format(DATE_FORMATTER) : "Start") + " to " +
                    (endDate != null ? endDate.format(DATE_FORMATTER) : "End"));
        }
        meta.put("Total Cross-Group Visits", String.valueOf(records.size()));

        return buildReportData("Cross-Group Attendance Audit", ReportType.CROSS_GROUP, meta,
                records.size(), records.size(), 0, "100.0%", headers, rows,
                "Audit includes all " + records.size() + " cross-group attendance occurrences within the audited scope.");
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================
    private ReportData buildReportData(
            String title,
            ReportType type,
            Map<String, String> metadata,
            int expected,
            int present,
            int absent,
            String rate,
            List<String> headers,
            List<List<String>> rows,
            String additionalSummary
    ) {
        return ReportData.builder()
                .title(title)
                .type(type)
                .generatedAt(LocalDateTime.now().format(DATE_TIME_FORMATTER))
                .metadata(metadata)
                .expectedCount(expected)
                .presentCount(present)
                .absentCount(absent)
                .attendancePercentage(rate)
                .headers(headers)
                .rows(rows)
                .additionalSummary(additionalSummary)
                .build();
    }

    private String getLabSheetOrNotes(LabSession s) {
        if (s.getFinalizationNotes() != null && !s.getFinalizationNotes().trim().isEmpty()) {
            return s.getFinalizationNotes();
        }
        return "N/A";
    }

    private String formatRate(int present, int expected) {
        if (expected <= 0) {
            return "N/A";
        }
        double percentage = (present * 100.0) / expected;
        return String.format(Locale.US, "%.1f%%", percentage);
    }

    private Lecturer getLecturerByUserId(UUID userId) {
        return lecturerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Lecturer profile not found for user: " + userId));
    }
}
