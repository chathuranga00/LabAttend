package com.labattend.repository;

import com.labattend.entity.Batch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BatchRepository extends JpaRepository<Batch, UUID> {
    Optional<Batch> findByBatchCode(String batchCode);
    boolean existsByBatchCode(String batchCode);
    boolean existsByBatchCodeAndIdNot(String batchCode, UUID id);
    List<Batch> findByDegreeProgrammeId(UUID degreeProgrammeId);

    @Query("SELECT b FROM Batch b WHERE " +
           "(:programmeId IS NULL OR b.degreeProgramme.id = :programmeId) AND " +
           "(:search IS NULL OR LOWER(b.batchCode) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(b.academicYear) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Batch> searchBatches(@Param("programmeId") UUID programmeId, @Param("search") String search, Pageable pageable);
}
