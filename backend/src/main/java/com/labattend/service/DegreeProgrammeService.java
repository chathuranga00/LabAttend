package com.labattend.service;

import com.labattend.dto.request.DegreeProgrammeRequest;
import com.labattend.dto.response.DegreeProgrammeResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.entity.DegreeProgramme;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.DegreeProgrammeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class DegreeProgrammeService {

    private final DegreeProgrammeRepository degreeProgrammeRepository;
    private final AuditLogService auditLogService;

    public DegreeProgrammeService(DegreeProgrammeRepository degreeProgrammeRepository,
                                  AuditLogService auditLogService) {
        this.degreeProgrammeRepository = degreeProgrammeRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public PageResponse<DegreeProgrammeResponse> getProgrammes(String search, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<DegreeProgramme> programmePage;
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            programmePage = degreeProgrammeRepository.searchProgrammes(pattern, pageable);
        } else {
            programmePage = degreeProgrammeRepository.findAll(pageable);
        }

        return PageResponse.of(programmePage.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public DegreeProgrammeResponse getProgrammeById(UUID id) {
        DegreeProgramme programme = degreeProgrammeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DegreeProgramme", "id", id));
        return mapToResponse(programme);
    }

    public DegreeProgrammeResponse createProgramme(DegreeProgrammeRequest request) {
        String code = (request.getCode() != null && !request.getCode().isBlank())
                ? request.getCode().trim().toUpperCase()
                : null;
        if (code != null && degreeProgrammeRepository.existsByCode(code)) {
            throw new BadRequestException("Degree programme code already exists: " + code);
        }

        DegreeProgramme programme = DegreeProgramme.builder()
                .code(code)
                .name(request.getName().trim())
                .department(request.getDepartment() != null && !request.getDepartment().isBlank() ? request.getDepartment().trim() : null)
                .isActive(true)
                .build();

        DegreeProgramme saved = degreeProgrammeRepository.save(programme);
        DegreeProgrammeResponse response = mapToResponse(saved);

        auditLogService.logAction("DegreeProgramme", saved.getId(), "CREATE", null, response);

        return response;
    }

    public DegreeProgrammeResponse updateProgramme(UUID id, DegreeProgrammeRequest request) {
        DegreeProgramme programme = degreeProgrammeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DegreeProgramme", "id", id));

        String code = (request.getCode() != null && !request.getCode().isBlank())
                ? request.getCode().trim().toUpperCase()
                : null;
        if (code != null && degreeProgrammeRepository.existsByCodeAndIdNot(code, id)) {
            throw new BadRequestException("Degree programme code already exists: " + code);
        }

        DegreeProgrammeResponse previousState = mapToResponse(programme);

        programme.setCode(code);
        programme.setName(request.getName().trim());
        programme.setDepartment(request.getDepartment() != null && !request.getDepartment().isBlank() ? request.getDepartment().trim() : null);

        DegreeProgramme updated = degreeProgrammeRepository.save(programme);
        DegreeProgrammeResponse newState = mapToResponse(updated);

        auditLogService.logAction("DegreeProgramme", updated.getId(), "UPDATE", previousState, newState);

        return newState;
    }

    public DegreeProgrammeResponse toggleStatus(UUID id) {
        DegreeProgramme programme = degreeProgrammeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DegreeProgramme", "id", id));

        DegreeProgrammeResponse previousState = mapToResponse(programme);

        programme.setIsActive(!programme.getIsActive());
        DegreeProgramme updated = degreeProgrammeRepository.save(programme);
        DegreeProgrammeResponse newState = mapToResponse(updated);

        String action = updated.getIsActive() ? "ACTIVATE" : "DEACTIVATE";
        auditLogService.logAction("DegreeProgramme", updated.getId(), action, previousState, newState);

        return newState;
    }

    private DegreeProgrammeResponse mapToResponse(DegreeProgramme p) {
        return DegreeProgrammeResponse.builder()
                .id(p.getId())
                .code(p.getCode())
                .name(p.getName())
                .department(p.getDepartment())
                .isActive(p.getIsActive())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
