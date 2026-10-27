package com.labattend.service;

import com.labattend.dto.request.BatchRequest;
import com.labattend.dto.response.BatchResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.entity.Batch;
import com.labattend.entity.DegreeProgramme;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.BatchRepository;
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
public class BatchService {

    private final BatchRepository batchRepository;
    private final DegreeProgrammeRepository degreeProgrammeRepository;
    private final AuditLogService auditLogService;

    public BatchService(BatchRepository batchRepository,
                        DegreeProgrammeRepository degreeProgrammeRepository,
                        AuditLogService auditLogService) {
        this.batchRepository = batchRepository;
        this.degreeProgrammeRepository = degreeProgrammeRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public PageResponse<BatchResponse> getBatches(UUID programmeId, String search, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Batch> batchPage;
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            batchPage = batchRepository.searchBatches(programmeId, pattern, pageable);
        } else if (programmeId != null) {
            batchPage = batchRepository.findByDegreeProgrammeId(programmeId, pageable);
        } else {
            batchPage = batchRepository.findAll(pageable);
        }

        return PageResponse.of(batchPage.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public BatchResponse getBatchById(UUID id) {
        Batch batch = batchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Batch", "id", id));
        return mapToResponse(batch);
    }

    public BatchResponse createBatch(BatchRequest request) {
        String batchCode = request.getBatchCode().trim().toUpperCase();
        if (batchRepository.existsByBatchCode(batchCode)) {
            throw new BadRequestException("Batch code already exists: " + batchCode);
        }

        DegreeProgramme programme = degreeProgrammeRepository.findById(request.getDegreeProgrammeId())
                .orElseThrow(() -> new ResourceNotFoundException("DegreeProgramme", "id", request.getDegreeProgrammeId()));

        Batch batch = Batch.builder()
                .batchCode(batchCode)
                .academicYear(request.getAcademicYear().trim())
                .degreeProgramme(programme)
                .isActive(true)
                .build();

        Batch saved = batchRepository.save(batch);
        BatchResponse response = mapToResponse(saved);

        auditLogService.logAction("Batch", saved.getId(), "CREATE", null, response);

        return response;
    }

    public BatchResponse updateBatch(UUID id, BatchRequest request) {
        Batch batch = batchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Batch", "id", id));

        String batchCode = request.getBatchCode().trim().toUpperCase();
        if (batchRepository.existsByBatchCodeAndIdNot(batchCode, id)) {
            throw new BadRequestException("Batch code already exists: " + batchCode);
        }

        DegreeProgramme programme = degreeProgrammeRepository.findById(request.getDegreeProgrammeId())
                .orElseThrow(() -> new ResourceNotFoundException("DegreeProgramme", "id", request.getDegreeProgrammeId()));

        BatchResponse previousState = mapToResponse(batch);

        batch.setBatchCode(batchCode);
        batch.setAcademicYear(request.getAcademicYear().trim());
        batch.setDegreeProgramme(programme);

        Batch updated = batchRepository.save(batch);
        BatchResponse newState = mapToResponse(updated);

        auditLogService.logAction("Batch", updated.getId(), "UPDATE", previousState, newState);

        return newState;
    }

    public BatchResponse toggleStatus(UUID id) {
        Batch batch = batchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Batch", "id", id));

        BatchResponse previousState = mapToResponse(batch);

        batch.setIsActive(!batch.getIsActive());
        Batch updated = batchRepository.save(batch);
        BatchResponse newState = mapToResponse(updated);

        String action = updated.getIsActive() ? "ACTIVATE" : "DEACTIVATE";
        auditLogService.logAction("Batch", updated.getId(), action, previousState, newState);

        return newState;
    }

    private BatchResponse mapToResponse(Batch b) {
        return BatchResponse.builder()
                .id(b.getId())
                .batchCode(b.getBatchCode())
                .academicYear(b.getAcademicYear())
                .degreeProgrammeId(b.getDegreeProgramme() != null ? b.getDegreeProgramme().getId() : null)
                .degreeProgrammeCode(b.getDegreeProgramme() != null ? b.getDegreeProgramme().getCode() : null)
                .degreeProgrammeName(b.getDegreeProgramme() != null ? b.getDegreeProgramme().getName() : null)
                .isActive(b.getIsActive())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .build();
    }
}
