package com.labattend.repository;

import com.labattend.entity.LabGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LabGroupRepository extends JpaRepository<LabGroup, UUID> {

    List<LabGroup> findByBatchIdOrderByGroupNameAsc(UUID batchId);

    List<LabGroup> findByBatchIdAndIsActiveTrueOrderByGroupNameAsc(UUID batchId);

    boolean existsByBatchIdAndGroupNameIgnoreCase(UUID batchId, String groupName);

    boolean existsByBatchIdAndGroupNameIgnoreCaseAndIdNot(UUID batchId, String groupName, UUID id);

    Optional<LabGroup> findByBatchIdAndGroupNameIgnoreCase(UUID batchId, String groupName);

    List<LabGroup> findByGroupNameIgnoreCase(String groupName);

    Optional<LabGroup> findFirstByGroupNameIgnoreCase(String groupName);

    Optional<LabGroup> findByIdAndBatchId(UUID id, UUID batchId);
}
