package com.labattend.repository;

import com.labattend.entity.DegreeProgramme;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DegreeProgrammeRepository extends JpaRepository<DegreeProgramme, UUID> {
    Optional<DegreeProgramme> findByCode(String code);
    boolean existsByCode(String code);
    boolean existsByCodeAndIdNot(String code, UUID id);

    @Query("SELECT dp FROM DegreeProgramme dp WHERE " +
           "LOWER(dp.name) LIKE :search OR LOWER(dp.code) LIKE :search")
    Page<DegreeProgramme> searchProgrammes(@Param("search") String search, Pageable pageable);
}
