package com.labattend.repository;

import com.labattend.entity.LaboratoryHall;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LaboratoryHallRepository extends JpaRepository<LaboratoryHall, UUID> {
    Optional<LaboratoryHall> findByHallCode(String hallCode);
    boolean existsByHallCode(String hallCode);
    boolean existsByHallCodeAndIdNot(String hallCode, UUID id);

    @Query("SELECT lh FROM LaboratoryHall lh WHERE " +
           "(:search IS NULL OR LOWER(lh.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(lh.hallCode) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(lh.location) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<LaboratoryHall> searchHalls(@Param("search") String search, Pageable pageable);
}
