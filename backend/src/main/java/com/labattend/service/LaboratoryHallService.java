package com.labattend.service;

import com.labattend.dto.request.LaboratoryHallRequest;
import com.labattend.dto.response.LaboratoryHallResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.entity.LaboratoryHall;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.LaboratoryHallRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class LaboratoryHallService {

    private final LaboratoryHallRepository laboratoryHallRepository;
    private final AuditLogService auditLogService;

    public LaboratoryHallService(LaboratoryHallRepository laboratoryHallRepository,
                                 AuditLogService auditLogService) {
        this.laboratoryHallRepository = laboratoryHallRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public PageResponse<LaboratoryHallResponse> getHalls(String search, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<LaboratoryHall> hallPage;
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            hallPage = laboratoryHallRepository.searchHalls(pattern, pageable);
        } else {
            hallPage = laboratoryHallRepository.findAll(pageable);
        }

        return PageResponse.of(hallPage.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public LaboratoryHallResponse getHallById(UUID id) {
        LaboratoryHall hall = laboratoryHallRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LaboratoryHall", "id", id));
        return mapToResponse(hall);
    }

    public LaboratoryHallResponse createHall(LaboratoryHallRequest request) {
        String hallCode = request.getHallCode().trim().toUpperCase();
        if (laboratoryHallRepository.existsByHallCode(hallCode)) {
            throw new BadRequestException("Laboratory hall code already exists: " + hallCode);
        }

        LaboratoryHall hall = LaboratoryHall.builder()
                .hallCode(hallCode)
                .name(request.getName().trim())
                .capacity(request.getCapacity())
                .location(request.getLocation() != null ? request.getLocation().trim() : null)
                .isActive(true)
                .build();

        LaboratoryHall saved = laboratoryHallRepository.save(hall);
        LaboratoryHallResponse response = mapToResponse(saved);

        auditLogService.logAction("LaboratoryHall", saved.getId(), "CREATE", null, response);

        return response;
    }

    public LaboratoryHallResponse updateHall(UUID id, LaboratoryHallRequest request) {
        LaboratoryHall hall = laboratoryHallRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LaboratoryHall", "id", id));

        String hallCode = request.getHallCode().trim().toUpperCase();
        if (laboratoryHallRepository.existsByHallCodeAndIdNot(hallCode, id)) {
            throw new BadRequestException("Laboratory hall code already exists: " + hallCode);
        }

        LaboratoryHallResponse previousState = mapToResponse(hall);

        hall.setHallCode(hallCode);
        hall.setName(request.getName().trim());
        hall.setCapacity(request.getCapacity());
        hall.setLocation(request.getLocation() != null ? request.getLocation().trim() : null);

        LaboratoryHall updated = laboratoryHallRepository.save(hall);
        LaboratoryHallResponse newState = mapToResponse(updated);

        auditLogService.logAction("LaboratoryHall", updated.getId(), "UPDATE", previousState, newState);

        return newState;
    }

    public LaboratoryHallResponse toggleStatus(UUID id) {
        LaboratoryHall hall = laboratoryHallRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LaboratoryHall", "id", id));

        LaboratoryHallResponse previousState = mapToResponse(hall);

        hall.setIsActive(!hall.getIsActive());
        LaboratoryHall updated = laboratoryHallRepository.save(hall);
        LaboratoryHallResponse newState = mapToResponse(updated);

        String action = updated.getIsActive() ? "ACTIVATE" : "DEACTIVATE";
        auditLogService.logAction("LaboratoryHall", updated.getId(), action, previousState, newState);

        return newState;
    }

    private LaboratoryHallResponse mapToResponse(LaboratoryHall h) {
        return LaboratoryHallResponse.builder()
                .id(h.getId())
                .hallCode(h.getHallCode())
                .name(h.getName())
                .capacity(h.getCapacity())
                .location(h.getLocation())
                .isActive(h.getIsActive())
                .createdAt(h.getCreatedAt())
                .updatedAt(h.getUpdatedAt())
                .build();
    }
}
