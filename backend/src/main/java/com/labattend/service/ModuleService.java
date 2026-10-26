package com.labattend.service;

import com.labattend.dto.request.ModuleRequest;
import com.labattend.dto.response.ModuleResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.entity.DegreeProgramme;
import com.labattend.entity.Module;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.DegreeProgrammeRepository;
import com.labattend.repository.ModuleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class ModuleService {

    private final ModuleRepository moduleRepository;
    private final DegreeProgrammeRepository degreeProgrammeRepository;
    private final AuditLogService auditLogService;

    public ModuleService(ModuleRepository moduleRepository,
                         DegreeProgrammeRepository degreeProgrammeRepository,
                         AuditLogService auditLogService) {
        this.moduleRepository = moduleRepository;
        this.degreeProgrammeRepository = degreeProgrammeRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ModuleResponse> getModules(UUID programmeId, String search, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Module> modulePage;
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            modulePage = moduleRepository.searchModules(programmeId, pattern, pageable);
        } else if (programmeId != null) {
            modulePage = moduleRepository.findByDegreeProgrammeId(programmeId, pageable);
        } else {
            modulePage = moduleRepository.findAll(pageable);
        }

        return PageResponse.of(modulePage.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public ModuleResponse getModuleById(UUID id) {
        Module module = moduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Module", "id", id));
        return mapToResponse(module);
    }

    public ModuleResponse createModule(ModuleRequest request) {
        String moduleCode = request.getModuleCode().trim().toUpperCase();
        if (moduleRepository.existsByModuleCode(moduleCode)) {
            throw new BadRequestException("Module code already exists: " + moduleCode);
        }

        DegreeProgramme programme = null;
        if (request.getDegreeProgrammeId() != null) {
            programme = degreeProgrammeRepository.findById(request.getDegreeProgrammeId())
                    .orElseThrow(() -> new ResourceNotFoundException("DegreeProgramme", "id", request.getDegreeProgrammeId()));
        }

        Module module = Module.builder()
                .moduleCode(moduleCode)
                .name(request.getName().trim())
                .credits(request.getCredits())
                .degreeProgramme(programme)
                .academicYear(request.getAcademicYear() != null ? request.getAcademicYear().trim() : null)
                .semester(request.getSemester() != null ? request.getSemester().trim() : null)
                .isActive(true)
                .build();

        Module saved = moduleRepository.save(module);
        ModuleResponse response = mapToResponse(saved);

        auditLogService.logAction("Module", saved.getId(), "CREATE", null, response);

        return response;
    }

    public ModuleResponse updateModule(UUID id, ModuleRequest request) {
        Module module = moduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Module", "id", id));

        String moduleCode = request.getModuleCode().trim().toUpperCase();
        if (moduleRepository.existsByModuleCodeAndIdNot(moduleCode, id)) {
            throw new BadRequestException("Module code already exists: " + moduleCode);
        }

        DegreeProgramme programme = null;
        if (request.getDegreeProgrammeId() != null) {
            programme = degreeProgrammeRepository.findById(request.getDegreeProgrammeId())
                    .orElseThrow(() -> new ResourceNotFoundException("DegreeProgramme", "id", request.getDegreeProgrammeId()));
        }

        ModuleResponse previousState = mapToResponse(module);

        module.setModuleCode(moduleCode);
        module.setName(request.getName().trim());
        module.setCredits(request.getCredits());
        module.setDegreeProgramme(programme);
        module.setAcademicYear(request.getAcademicYear() != null ? request.getAcademicYear().trim() : null);
        module.setSemester(request.getSemester() != null ? request.getSemester().trim() : null);

        Module updated = moduleRepository.save(module);
        ModuleResponse newState = mapToResponse(updated);

        auditLogService.logAction("Module", updated.getId(), "UPDATE", previousState, newState);

        return newState;
    }

    public ModuleResponse toggleStatus(UUID id) {
        Module module = moduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Module", "id", id));

        ModuleResponse previousState = mapToResponse(module);

        module.setIsActive(!module.getIsActive());
        Module updated = moduleRepository.save(module);
        ModuleResponse newState = mapToResponse(updated);

        String action = updated.getIsActive() ? "ACTIVATE" : "DEACTIVATE";
        auditLogService.logAction("Module", updated.getId(), action, previousState, newState);

        return newState;
    }

    private ModuleResponse mapToResponse(Module m) {
        return ModuleResponse.builder()
                .id(m.getId())
                .moduleCode(m.getModuleCode())
                .name(m.getName())
                .credits(m.getCredits())
                .degreeProgrammeId(m.getDegreeProgramme() != null ? m.getDegreeProgramme().getId() : null)
                .degreeProgrammeCode(m.getDegreeProgramme() != null ? m.getDegreeProgramme().getCode() : null)
                .degreeProgrammeName(m.getDegreeProgramme() != null ? m.getDegreeProgramme().getName() : null)
                .academicYear(m.getAcademicYear())
                .semester(m.getSemester())
                .isActive(m.getIsActive())
                .createdAt(m.getCreatedAt())
                .updatedAt(m.getUpdatedAt())
                .build();
    }
}
