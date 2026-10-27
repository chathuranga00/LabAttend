package com.labattend.service;

import com.labattend.dto.request.AutoSplitConfirmRequest;
import com.labattend.dto.request.AutoSplitRequest;
import com.labattend.dto.request.BulkAssignGroupRequest;
import com.labattend.dto.request.LabGroupRequest;
import com.labattend.dto.response.AutoSplitPreviewResponse;
import com.labattend.dto.response.LabGroupResponse;
import com.labattend.entity.Batch;
import com.labattend.entity.LabGroup;
import com.labattend.entity.Student;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.BatchRepository;
import com.labattend.repository.LabGroupRepository;
import com.labattend.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class LabGroupService {

    private final LabGroupRepository labGroupRepository;
    private final BatchRepository batchRepository;
    private final StudentRepository studentRepository;
    private final AuditLogService auditLogService;

    public LabGroupService(
            LabGroupRepository labGroupRepository,
            BatchRepository batchRepository,
            StudentRepository studentRepository,
            AuditLogService auditLogService
    ) {
        this.labGroupRepository = labGroupRepository;
        this.batchRepository = batchRepository;
        this.studentRepository = studentRepository;
        this.auditLogService = auditLogService;
    }

    // =========================================================================
    // 1. LAB GROUPS CRUD
    // =========================================================================

    @Transactional(readOnly = true)
    public List<LabGroupResponse> getAllGroups() {
        return labGroupRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "groupName"))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LabGroupResponse> getGroupsByBatch(UUID batchId) {
        if (!batchRepository.existsById(batchId)) {
            throw new ResourceNotFoundException("Batch not found with id: " + batchId);
        }
        return labGroupRepository.findByBatchIdOrderByGroupNameAsc(batchId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public LabGroupResponse getGroupById(UUID groupId) {
        LabGroup group = labGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab group not found with id: " + groupId));
        return mapToResponse(group);
    }

    @Transactional
    public LabGroupResponse createGroup(UUID batchId, LabGroupRequest request) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + batchId));

        String trimmedName = request.getGroupName().trim();
        if (labGroupRepository.existsByBatchIdAndGroupNameIgnoreCase(batchId, trimmedName)) {
            throw new BadRequestException(String.format(
                    "Lab group with name '%s' already exists for batch '%s'",
                    trimmedName, batch.getBatchCode()
            ));
        }

        LabGroup group = LabGroup.builder()
                .batch(batch)
                .groupName(trimmedName)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        LabGroup savedGroup = labGroupRepository.save(group);
        LabGroupResponse response = mapToResponse(savedGroup);

        auditLogService.logAction("LabGroup", savedGroup.getId(), "CREATE", null, response);
        return response;
    }

    @Transactional
    public LabGroupResponse updateGroup(UUID groupId, LabGroupRequest request) {
        LabGroup group = labGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab group not found with id: " + groupId));

        LabGroupResponse previousState = mapToResponse(group);
        String trimmedName = request.getGroupName().trim();

        if (labGroupRepository.existsByBatchIdAndGroupNameIgnoreCaseAndIdNot(group.getBatch().getId(), trimmedName, groupId)) {
            throw new BadRequestException(String.format(
                    "Lab group with name '%s' already exists for batch '%s'",
                    trimmedName, group.getBatch().getBatchCode()
            ));
        }

        group.setGroupName(trimmedName);
        if (request.getIsActive() != null) {
            group.setIsActive(request.getIsActive());
        }

        LabGroup updatedGroup = labGroupRepository.save(group);
        LabGroupResponse newState = mapToResponse(updatedGroup);

        auditLogService.logAction("LabGroup", updatedGroup.getId(), "UPDATE", previousState, newState);
        return newState;
    }

    @Transactional
    public LabGroupResponse toggleGroupStatus(UUID groupId) {
        LabGroup group = labGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab group not found with id: " + groupId));

        LabGroupResponse previousState = mapToResponse(group);
        group.setIsActive(!Boolean.TRUE.equals(group.getIsActive()));

        LabGroup updatedGroup = labGroupRepository.save(group);
        LabGroupResponse newState = mapToResponse(updatedGroup);

        auditLogService.logAction("LabGroup", updatedGroup.getId(), "STATUS_CHANGE", previousState, newState);
        return newState;
    }

    // =========================================================================
    // 2. BULK ASSIGN STUDENTS TO GROUP
    // =========================================================================

    @Transactional
    public void bulkAssignStudentsToGroup(UUID batchId, BulkAssignGroupRequest request) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + batchId));

        LabGroup targetGroup = null;
        if (request.getTargetGroupId() != null) {
            targetGroup = labGroupRepository.findById(request.getTargetGroupId())
                    .orElseThrow(() -> new ResourceNotFoundException("Target lab group not found with id: " + request.getTargetGroupId()));
            if (!targetGroup.getBatch().getId().equals(batchId)) {
                throw new BadRequestException("Target lab group does not belong to the specified batch: " + batch.getBatchCode());
            }
        } else if (request.getTargetGroupName() != null && !request.getTargetGroupName().trim().isBlank()) {
            String cleanName = request.getTargetGroupName().trim();
            String normalizedName = cleanName.toLowerCase().startsWith("group ")
                    ? "Group " + cleanName.substring(6).trim().toUpperCase()
                    : (cleanName.length() == 1 ? "Group " + cleanName.toUpperCase() : cleanName);
            String shortName = normalizedName.startsWith("Group ") ? normalizedName.substring(6).trim() : normalizedName;

            targetGroup = labGroupRepository.findByBatchIdAndGroupNameIgnoreCase(batchId, normalizedName)
                    .or(() -> labGroupRepository.findByBatchIdAndGroupNameIgnoreCase(batchId, shortName))
                    .or(() -> labGroupRepository.findByBatchIdAndGroupNameIgnoreCase(batchId, cleanName))
                    .orElseGet(() -> labGroupRepository.save(
                            LabGroup.builder()
                                    .batch(batch)
                                    .groupName(normalizedName)
                                    .isActive(true)
                                    .build()
                    ));
        }

        List<Student> students = studentRepository.findAllById(request.getStudentIds());
        for (Student student : students) {
            if (!student.getBatch().getId().equals(batchId)) {
                throw new BadRequestException(String.format(
                        "Student '%s' (%s) does not belong to batch '%s'",
                        student.getFullName(), student.getStudentId(), batch.getBatchCode()
                ));
            }
            student.setLabGroup(targetGroup);
        }

        studentRepository.saveAll(students);

        Map<String, Object> auditDetails = new HashMap<>();
        auditDetails.put("batchId", batchId);
        auditDetails.put("targetGroupId", request.getTargetGroupId());
        auditDetails.put("targetGroupName", targetGroup != null ? targetGroup.getGroupName() : "UNASSIGNED");
        auditDetails.put("assignedStudentCount", students.size());

        auditLogService.logAction("Student", batchId, "BULK_ASSIGN_GROUP", null, auditDetails);
    }

    // =========================================================================
    // 3. AUTO-SPLIT HELPER
    // =========================================================================

    @Transactional(readOnly = true)
    public AutoSplitPreviewResponse previewAutoSplit(UUID batchId, AutoSplitRequest request) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + batchId));

        int n = request.getNumGroups();
        if (n < 2 || n > 10) {
            throw new BadRequestException("Number of groups must be between 2 and 10");
        }

        String method = request.getSplitMethod() != null ? request.getSplitMethod().trim().toUpperCase() : "ALPHABETICAL";
        List<Student> students;
        if ("STUDENT_ID".equals(method)) {
            students = studentRepository.findByBatchIdAndIsActiveTrueOrderByStudentIdAsc(batchId);
        } else {
            students = studentRepository.findByBatchIdAndIsActiveTrueOrderByFullNameAsc(batchId);
        }

        if (students.isEmpty()) {
            throw new BadRequestException("No active students found in batch '" + batch.getBatchCode() + "' to split.");
        }

        // Determine group names
        List<String> names = new ArrayList<>();
        if (request.getGroupNames() != null && request.getGroupNames().size() == n) {
            names.addAll(request.getGroupNames());
        } else {
            for (int i = 0; i < n; i++) {
                char letter = (char) ('A' + i);
                names.add("Group " + letter);
            }
        }

        // Divide students into N chunks as evenly as possible
        int total = students.size();
        int baseSize = total / n;
        int remainder = total % n;

        List<AutoSplitPreviewResponse.GroupSplitPreview> groupPreviews = new ArrayList<>();
        int currentIndex = 0;

        for (int i = 0; i < n; i++) {
            int currentChunkSize = baseSize + (i < remainder ? 1 : 0);
            List<Student> chunk = students.subList(currentIndex, currentIndex + currentChunkSize);
            currentIndex += currentChunkSize;

            List<AutoSplitPreviewResponse.StudentPreviewItem> studentItems = chunk.stream()
                    .map(s -> AutoSplitPreviewResponse.StudentPreviewItem.builder()
                            .id(s.getId())
                            .studentId(s.getStudentId())
                            .fullName(s.getFullName())
                            .email(s.getEmail())
                            .currentGroupName(s.getLabGroup() != null ? s.getLabGroup().getGroupName() : null)
                            .build())
                    .collect(Collectors.toList());

            groupPreviews.add(AutoSplitPreviewResponse.GroupSplitPreview.builder()
                    .groupName(names.get(i))
                    .studentCount(studentItems.size())
                    .students(studentItems)
                    .build());
        }

        return AutoSplitPreviewResponse.builder()
                .batchId(batchId)
                .batchCode(batch.getBatchCode())
                .totalStudents(total)
                .numGroups(n)
                .splitMethod(method)
                .groups(groupPreviews)
                .build();
    }

    @Transactional
    public List<LabGroupResponse> confirmAutoSplit(UUID batchId, AutoSplitConfirmRequest request) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + batchId));

        if (request.getAssignments() == null || request.getAssignments().isEmpty()) {
            throw new BadRequestException("Assignments list cannot be empty");
        }

        List<LabGroup> savedGroups = new ArrayList<>();

        for (AutoSplitConfirmRequest.GroupSplitAssignment assignment : request.getAssignments()) {
            String groupName = assignment.getGroupName().trim();

            // Find or create the group
            LabGroup group = labGroupRepository.findByBatchIdOrderByGroupNameAsc(batchId).stream()
                    .filter(g -> g.getGroupName().equalsIgnoreCase(groupName))
                    .findFirst()
                    .orElseGet(() -> labGroupRepository.save(LabGroup.builder()
                            .batch(batch)
                            .groupName(groupName)
                            .isActive(true)
                            .build()));

            savedGroups.add(group);

            if (assignment.getStudentIds() != null && !assignment.getStudentIds().isEmpty()) {
                List<Student> students = studentRepository.findAllById(assignment.getStudentIds());
                for (Student student : students) {
                    if (student.getBatch().getId().equals(batchId)) {
                        student.setLabGroup(group);
                    }
                }
                studentRepository.saveAll(students);
            }
        }

        auditLogService.logAction("Batch", batchId, "AUTO_SPLIT_CONFIRM", null,
                Map.of("batchCode", batch.getBatchCode(), "groupsCreatedOrUpdated", savedGroups.size()));

        return labGroupRepository.findByBatchIdOrderByGroupNameAsc(batchId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // HELPER: Map to Response
    // =========================================================================
    public LabGroupResponse mapToResponse(LabGroup group) {
        long studentCount = studentRepository.countByLabGroupId(group.getId());
        return LabGroupResponse.builder()
                .id(group.getId())
                .batchId(group.getBatch().getId())
                .batchCode(group.getBatch().getBatchCode())
                .groupName(group.getGroupName())
                .isActive(group.getIsActive())
                .studentCount(studentCount)
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .build();
    }
}
