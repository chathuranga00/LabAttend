package com.labattend.service;

import com.labattend.dto.request.StudentRequest;
import com.labattend.dto.response.PageResponse;
import com.labattend.dto.response.StudentAttendanceHistoryResponse;
import com.labattend.dto.response.StudentCsvImportResponse;
import com.labattend.dto.response.StudentResponse;
import com.labattend.entity.AttendanceRecord;
import com.labattend.entity.Batch;
import com.labattend.entity.DegreeProgramme;
import com.labattend.entity.LabGroup;
import com.labattend.entity.LabSession;
import com.labattend.entity.SessionStudent;
import com.labattend.entity.Student;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.AttendanceRecordRepository;
import com.labattend.repository.BatchRepository;
import com.labattend.repository.DegreeProgrammeRepository;
import com.labattend.repository.LabGroupRepository;
import com.labattend.repository.SessionStudentRepository;
import com.labattend.repository.StudentRepository;
import com.labattend.util.HashUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.*;

@Service
@Transactional
public class StudentService {

    private final StudentRepository studentRepository;
    private final DegreeProgrammeRepository degreeProgrammeRepository;
    private final BatchRepository batchRepository;
    private final LabGroupRepository labGroupRepository;
    private final SessionStudentRepository sessionStudentRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AuditLogService auditLogService;
    private final QrCodeService qrCodeService;

    public StudentService(StudentRepository studentRepository,
                          DegreeProgrammeRepository degreeProgrammeRepository,
                          BatchRepository batchRepository,
                          LabGroupRepository labGroupRepository,
                          SessionStudentRepository sessionStudentRepository,
                          AttendanceRecordRepository attendanceRecordRepository,
                          AuditLogService auditLogService,
                          QrCodeService qrCodeService) {
        this.studentRepository = studentRepository;
        this.degreeProgrammeRepository = degreeProgrammeRepository;
        this.batchRepository = batchRepository;
        this.labGroupRepository = labGroupRepository;
        this.sessionStudentRepository = sessionStudentRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.auditLogService = auditLogService;
        this.qrCodeService = qrCodeService;
    }

    @Transactional(readOnly = true)
    public PageResponse<StudentResponse> getStudents(UUID programmeId, UUID batchId, UUID labGroupId, Boolean isActive,
                                                    String search, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        boolean noFilters = programmeId == null && batchId == null && labGroupId == null && isActive == null &&
                (search == null || search.isBlank());

        Page<Student> studentPage;
        if (noFilters) {
            studentPage = studentRepository.findAll(pageable);
        } else {
            String searchPattern = search != null && !search.isBlank() ? "%" + search.trim().toLowerCase() + "%" : null;
            studentPage = studentRepository.searchStudents(
                    programmeId,
                    batchId,
                    labGroupId,
                    isActive,
                    searchPattern,
                    pageable
            );
        }

        return PageResponse.of(studentPage.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public StudentResponse getStudentById(UUID id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        return mapToResponse(student);
    }

    public StudentResponse createStudent(StudentRequest request) {
        String studentId = request.getStudentId().trim().toUpperCase();
        if (studentRepository.existsByStudentId(studentId)) {
            throw new BadRequestException("Student ID already exists: " + studentId);
        }

        String email = request.getEmail().trim().toLowerCase();
        if (studentRepository.existsByEmail(email)) {
            throw new BadRequestException("Email already exists: " + email);
        }

        DegreeProgramme programme = degreeProgrammeRepository.findById(request.getDegreeProgrammeId())
                .orElseThrow(() -> new ResourceNotFoundException("DegreeProgramme", "id", request.getDegreeProgrammeId()));

        Batch batch = batchRepository.findById(request.getBatchId())
                .orElseThrow(() -> new ResourceNotFoundException("Batch", "id", request.getBatchId()));

        if (!batch.getDegreeProgramme().getId().equals(programme.getId())) {
            throw new BadRequestException("Selected batch does not belong to the selected degree programme");
        }

        LabGroup labGroup = resolveLabGroup(request, batch);

        Student student = Student.builder()
                .studentId(studentId)
                .fullName(request.getFullName().trim())
                .email(email)
                .degreeProgramme(programme)
                .batch(batch)
                .labGroup(labGroup)
                .qrVersion(1)
                .qrGeneratedAt(OffsetDateTime.now())
                .isActive(true)
                .build();

        Student saved = studentRepository.save(student);
        String token = qrCodeService.generateToken(saved.getId(), saved.getQrVersion());
        saved.setQrTokenHash(qrCodeService.generateTokenHash(token));
        saved = studentRepository.save(saved);
        StudentResponse response = mapToResponse(saved);

        auditLogService.logAction("Student", saved.getId(), "CREATE", null, response);

        return response;
    }

    public StudentResponse updateStudent(UUID id, StudentRequest request) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));

        String studentId = request.getStudentId().trim().toUpperCase();
        if (studentRepository.existsByStudentIdAndIdNot(studentId, id)) {
            throw new BadRequestException("Student ID already exists: " + studentId);
        }

        String email = request.getEmail().trim().toLowerCase();
        if (studentRepository.existsByEmailAndIdNot(email, id)) {
            throw new BadRequestException("Email already exists: " + email);
        }

        DegreeProgramme programme = degreeProgrammeRepository.findById(request.getDegreeProgrammeId())
                .orElseThrow(() -> new ResourceNotFoundException("DegreeProgramme", "id", request.getDegreeProgrammeId()));

        Batch batch = batchRepository.findById(request.getBatchId())
                .orElseThrow(() -> new ResourceNotFoundException("Batch", "id", request.getBatchId()));

        if (!batch.getDegreeProgramme().getId().equals(programme.getId())) {
            throw new BadRequestException("Selected batch does not belong to the selected degree programme");
        }

        LabGroup labGroup = resolveLabGroup(request, batch);

        String qrTokenHash = student.getQrTokenHash();
        if (request.getQrToken() != null && !request.getQrToken().isBlank()) {
            String newHash = HashUtils.sha256Hex(request.getQrToken());
            if (studentRepository.existsByQrTokenHashAndIdNot(newHash, id)) {
                throw new BadRequestException("QR token identifier already mapped to another student");
            }
            qrTokenHash = newHash;
        }

        StudentResponse previousState = mapToResponse(student);

        student.setStudentId(studentId);
        student.setFullName(request.getFullName().trim());
        student.setEmail(email);
        student.setDegreeProgramme(programme);
        // NOTE: Changing the student's batch or lab group updates only the student record.
        // It strictly preserves historical session_students and attendance_records!
        student.setBatch(batch);
        student.setLabGroup(labGroup);
        student.setQrTokenHash(qrTokenHash);

        Student updated = studentRepository.save(student);
        StudentResponse newState = mapToResponse(updated);

        auditLogService.logAction("Student", updated.getId(), "UPDATE", previousState, newState);

        return newState;
    }

    public StudentResponse toggleStatus(UUID id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));

        StudentResponse previousState = mapToResponse(student);

        student.setIsActive(!student.getIsActive());
        Student updated = studentRepository.save(student);
        StudentResponse newState = mapToResponse(updated);

        String action = updated.getIsActive() ? "ACTIVATE" : "DEACTIVATE";
        auditLogService.logAction("Student", updated.getId(), action, previousState, newState);

        return newState;
    }

    @Transactional(readOnly = true)
    public StudentAttendanceHistoryResponse getAttendanceHistory(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        List<SessionStudent> sessionEnrollments = sessionStudentRepository.findByStudentId(studentId);
        List<AttendanceRecord> attendanceRecords = attendanceRecordRepository.findByStudentId(studentId);

        Map<UUID, AttendanceRecord> recordBySessionId = new HashMap<>();
        for (AttendanceRecord record : attendanceRecords) {
            recordBySessionId.put(record.getSession().getId(), record);
        }

        int totalEligible = 0;
        int attended = 0;
        int missed = 0;

        List<StudentAttendanceHistoryResponse.AttendanceRecordItemDto> items = new ArrayList<>();

        for (SessionStudent enrollment : sessionEnrollments) {
            LabSession session = enrollment.getSession();
            boolean isClosed = session.getStatus() == SessionStatus.CLOSED;

            AttendanceRecord record = recordBySessionId.get(session.getId());

            String attendanceStatus = "UNRECORDED";
            String attendanceMethod = "—";
            java.time.OffsetDateTime markedAt = null;
            String justification = null;

            if (record != null) {
                attendanceStatus = record.getStatus().name();
                attendanceMethod = record.getMethod().name();
                markedAt = record.getMarkedAt();
                justification = record.getJustificationNotes();
            } else if (isClosed) {
                attendanceStatus = "ABSENT";
            }

            boolean isExpectedSession = !Boolean.FALSE.equals(enrollment.getIsExpected());
            if (isClosed && isExpectedSession) {
                totalEligible++;
                if ("PRESENT".equalsIgnoreCase(attendanceStatus) || "LATE".equalsIgnoreCase(attendanceStatus)) {
                    attended++;
                } else {
                    missed++;
                }
            }

            items.add(StudentAttendanceHistoryResponse.AttendanceRecordItemDto.builder()
                    .sessionId(session.getId())
                    .sessionCode(session.getSessionCode())
                    .moduleCode(session.getModule().getModuleCode())
                    .moduleName(session.getModule().getName())
                    .hallCode(session.getHall().getHallCode())
                    .sessionDate(session.getSessionDate())
                    .startTime(session.getStartTime())
                    .endTime(session.getEndTime())
                    .sessionStatus(session.getStatus().name())
                    .attendanceStatus(attendanceStatus)
                    .attendanceMethod(attendanceMethod)
                    .markedAt(markedAt)
                    .justificationNotes(justification)
                    .isCrossGroup(record != null && Boolean.TRUE.equals(record.getIsCrossGroup()))
                    .sessionGroupName(session.getLabGroup() != null ? session.getLabGroup().getGroupName() : null)
                    .homeGroupName(record != null && record.getHomeLabGroup() != null ? record.getHomeLabGroup().getGroupName() : (student.getLabGroup() != null ? student.getLabGroup().getGroupName() : null))
                    .lecturerName(session.getLecturer() != null ? session.getLecturer().getFullName() : null)
                    .build());
        }

        // Sort items by session date descending
        items.sort((a, b) -> b.getSessionDate().compareTo(a.getSessionDate()));

        Double percentage = null;
        if (totalEligible > 0) {
            percentage = Math.round(((double) attended / totalEligible) * 1000.0) / 10.0;
        }

        return StudentAttendanceHistoryResponse.builder()
                .studentId(student.getId())
                .studentRegNumber(student.getStudentId())
                .studentName(student.getFullName())
                .batchCode(student.getBatch().getBatchCode())
                .degreeProgrammeCode(student.getDegreeProgramme().getCode())
                .totalEligibleSessions(totalEligible)
                .attendedSessions(attended)
                .missedSessions(missed)
                .attendancePercentage(percentage)
                .records(items)
                .build();
    }

    public StudentCsvImportResponse importStudentsFromCsv(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("CSV file is empty or not provided");
        }

        List<StudentCsvImportResponse.CsvRowError> errors = new ArrayList<>();
        List<Student> studentsToSave = new ArrayList<>();

        Set<String> seenStudentIds = new HashSet<>();
        Set<String> seenEmails = new HashSet<>();
        Set<String> seenQrHashes = new HashSet<>();

        Map<String, DegreeProgramme> programmeCache = new HashMap<>();
        Map<String, Batch> batchCache = new HashMap<>();

        int rowNumber = 0;
        int totalRows = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                throw new BadRequestException("CSV file is empty");
            }

            String[] headers = headerLine.split(",");
            Map<String, Integer> colIndex = new HashMap<>();
            for (int i = 0; i < headers.length; i++) {
                colIndex.put(headers[i].trim().toLowerCase().replaceAll("[_\\-\\s]", ""), i);
            }

            Integer studentIdIdx = findColumn(colIndex, "studentid", "id", "regno");
            Integer fullNameIdx = findColumn(colIndex, "fullname", "name", "studentname");
            Integer emailIdx = findColumn(colIndex, "email");
            Integer progIdx = findColumn(colIndex, "degreeprogrammecode", "programmecode", "programme", "degree");
            Integer batchIdx = findColumn(colIndex, "batchcode", "batch");
            Integer qrIdx = findColumn(colIndex, "qrtoken", "qridentifier", "qr", "token");
            Integer groupIdx = findColumn(colIndex, "group", "labgroup", "groupname", "labgroupname");

            if (studentIdIdx == null || fullNameIdx == null || emailIdx == null || progIdx == null || batchIdx == null) {
                throw new BadRequestException("CSV must contain columns: student_id, full_name, email, degree_programme_code, batch_code");
            }

            Map<String, LabGroup> groupCache = new HashMap<>();

            String line;
            while ((line = reader.readLine()) != null) {
                rowNumber++;
                if (line.trim().isEmpty()) continue;
                totalRows++;

                String[] values = line.split(",", -1);
                String rowStudentId = getVal(values, studentIdIdx);
                String rowFullName = getVal(values, fullNameIdx);
                String rowEmail = getVal(values, emailIdx);
                String rowProgCode = getVal(values, progIdx);
                String rowBatchCode = getVal(values, batchIdx);
                String rowQr = qrIdx != null ? getVal(values, qrIdx) : null;
                String rowGroupName = groupIdx != null ? getVal(values, groupIdx) : null;

                if (rowStudentId == null || rowStudentId.isBlank()) {
                    errors.add(new StudentCsvImportResponse.CsvRowError(rowNumber, "UNKNOWN", "Missing student ID"));
                    continue;
                }
                String upperStudentId = rowStudentId.toUpperCase();

                if (rowFullName == null || rowFullName.isBlank()) {
                    errors.add(new StudentCsvImportResponse.CsvRowError(rowNumber, upperStudentId, "Missing full name"));
                    continue;
                }

                if (rowEmail == null || rowEmail.isBlank() || !rowEmail.contains("@")) {
                    errors.add(new StudentCsvImportResponse.CsvRowError(rowNumber, upperStudentId, "Invalid or missing email"));
                    continue;
                }
                String lowerEmail = rowEmail.toLowerCase();

                if (seenStudentIds.contains(upperStudentId) || studentRepository.existsByStudentId(upperStudentId)) {
                    errors.add(new StudentCsvImportResponse.CsvRowError(rowNumber, upperStudentId, "Duplicate student ID: already exists"));
                    continue;
                }

                if (seenEmails.contains(lowerEmail) || studentRepository.existsByEmail(lowerEmail)) {
                    errors.add(new StudentCsvImportResponse.CsvRowError(rowNumber, upperStudentId, "Duplicate email: already in use"));
                    continue;
                }

                if (rowProgCode == null || rowProgCode.isBlank()) {
                    errors.add(new StudentCsvImportResponse.CsvRowError(rowNumber, upperStudentId, "Missing degree programme code"));
                    continue;
                }
                String upperProgCode = rowProgCode.toUpperCase();

                DegreeProgramme programme = programmeCache.computeIfAbsent(upperProgCode, code ->
                        degreeProgrammeRepository.findByCode(code).orElse(null)
                );
                if (programme == null) {
                    errors.add(new StudentCsvImportResponse.CsvRowError(rowNumber, upperStudentId, "Degree programme not found: " + upperProgCode));
                    continue;
                }

                if (rowBatchCode == null || rowBatchCode.isBlank()) {
                    errors.add(new StudentCsvImportResponse.CsvRowError(rowNumber, upperStudentId, "Missing batch code"));
                    continue;
                }
                String upperBatchCode = rowBatchCode.toUpperCase();

                Batch batch = batchCache.computeIfAbsent(upperBatchCode, code ->
                        batchRepository.findByBatchCode(code).orElse(null)
                );
                if (batch == null) {
                    errors.add(new StudentCsvImportResponse.CsvRowError(rowNumber, upperStudentId, "Batch not found: " + upperBatchCode));
                    continue;
                }

                if (!batch.getDegreeProgramme().getId().equals(programme.getId())) {
                    errors.add(new StudentCsvImportResponse.CsvRowError(rowNumber, upperStudentId,
                            "Batch " + upperBatchCode + " does not belong to programme " + upperProgCode));
                    continue;
                }

                LabGroup assignedGroup = null;
                if (rowGroupName != null && !rowGroupName.isBlank()) {
                    String cleanGroupName = rowGroupName.trim();
                    String cacheKey = batch.getId().toString() + ":" + cleanGroupName.toUpperCase();
                    assignedGroup = groupCache.computeIfAbsent(cacheKey, k -> {
                        return labGroupRepository.findByBatchIdAndGroupNameIgnoreCase(batch.getId(), cleanGroupName)
                                .orElseGet(() -> labGroupRepository.save(
                                        LabGroup.builder()
                                                .batch(batch)
                                                .groupName(cleanGroupName)
                                                .isActive(true)
                                                .build()
                                ));
                    });
                }

                seenStudentIds.add(upperStudentId);
                seenEmails.add(lowerEmail);

                Student student = Student.builder()
                        .studentId(upperStudentId)
                        .fullName(rowFullName)
                        .email(lowerEmail)
                        .degreeProgramme(programme)
                        .batch(batch)
                        .labGroup(assignedGroup)
                        .qrVersion(1)
                        .qrGeneratedAt(OffsetDateTime.now())
                        .isActive(true)
                        .build();

                studentsToSave.add(student);
            }

            if (!studentsToSave.isEmpty()) {
                List<Student> persistedList = studentRepository.saveAll(studentsToSave);
                for (Student s : persistedList) {
                    if (s.getId() != null) {
                        String token = qrCodeService.generateToken(s.getId(), s.getQrVersion());
                        s.setQrTokenHash(qrCodeService.generateTokenHash(token));
                    }
                }
                Map<String, Object> auditSummary = new HashMap<>();
                auditSummary.put("importedCount", studentsToSave.size());
                auditSummary.put("errorCount", errors.size());
                auditLogService.logAction("Student", null, "CSV_IMPORT", null, auditSummary);
            }

        } catch (Exception e) {
            throw new BadRequestException("Failed to process CSV file: " + e.getMessage());
        }

        return StudentCsvImportResponse.builder()
                .totalRows(totalRows)
                .successCount(studentsToSave.size())
                .failureCount(errors.size())
                .errors(errors)
                .build();
    }

    private Integer findColumn(Map<String, Integer> map, String... candidates) {
        for (String c : candidates) {
            if (map.containsKey(c)) return map.get(c);
        }
        return null;
    }

    private String getVal(String[] values, Integer index) {
        if (index != null && index >= 0 && index < values.length) {
            String v = values[index].trim();
            return v.isEmpty() ? null : v;
        }
        return null;
    }

    private LabGroup resolveLabGroup(StudentRequest request, Batch batch) {
        if (request.getLabGroupId() != null) {
            LabGroup labGroup = labGroupRepository.findById(request.getLabGroupId())
                    .orElseThrow(() -> new ResourceNotFoundException("LabGroup", "id", request.getLabGroupId()));
            if (!labGroup.getBatch().getId().equals(batch.getId())) {
                throw new BadRequestException("Selected lab group does not belong to the selected batch");
            }
            return labGroup;
        } else if (request.getGroupName() != null && !request.getGroupName().trim().isBlank()) {
            String cleanName = request.getGroupName().trim();
            String normalizedName = cleanName.toLowerCase().startsWith("group ")
                    ? "Group " + cleanName.substring(6).trim().toUpperCase()
                    : (cleanName.length() == 1 ? "Group " + cleanName.toUpperCase() : cleanName);
            String shortName = normalizedName.startsWith("Group ") ? normalizedName.substring(6).trim() : normalizedName;

            return labGroupRepository.findByBatchIdAndGroupNameIgnoreCase(batch.getId(), normalizedName)
                    .or(() -> labGroupRepository.findByBatchIdAndGroupNameIgnoreCase(batch.getId(), shortName))
                    .or(() -> labGroupRepository.findByBatchIdAndGroupNameIgnoreCase(batch.getId(), cleanName))
                    .orElseGet(() -> labGroupRepository.save(
                            LabGroup.builder()
                                    .batch(batch)
                                    .groupName(normalizedName)
                                    .isActive(true)
                                    .build()
                    ));
        }
        return null;
    }

    private StudentResponse mapToResponse(Student s) {
        return StudentResponse.builder()
                .id(s.getId())
                .studentId(s.getStudentId())
                .fullName(s.getFullName())
                .email(s.getEmail())
                .degreeProgrammeId(s.getDegreeProgramme() != null ? s.getDegreeProgramme().getId() : null)
                .degreeProgrammeCode(s.getDegreeProgramme() != null ? s.getDegreeProgramme().getCode() : null)
                .degreeProgrammeName(s.getDegreeProgramme() != null ? s.getDegreeProgramme().getName() : null)
                .batchId(s.getBatch() != null ? s.getBatch().getId() : null)
                .batchCode(s.getBatch() != null ? s.getBatch().getBatchCode() : null)
                .batchAcademicYear(s.getBatch() != null ? s.getBatch().getAcademicYear() : null)
                .labGroupId(s.getLabGroup() != null ? s.getLabGroup().getId() : null)
                .labGroupName(s.getLabGroup() != null ? s.getLabGroup().getGroupName() : null)
                .qrTokenHash(s.getQrTokenHash())
                .hasQrToken(s.getQrTokenHash() != null && !s.getQrTokenHash().isBlank())
                .qrVersion(s.getQrVersion())
                .qrGeneratedAt(s.getQrGeneratedAt())
                .isActive(s.getIsActive())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
