package com.labattend.repository;

import com.labattend.entity.Module;
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
public interface ModuleRepository extends JpaRepository<Module, UUID> {
    Optional<Module> findByModuleCode(String moduleCode);
    boolean existsByModuleCode(String moduleCode);
    boolean existsByModuleCodeAndIdNot(String moduleCode, UUID id);
    List<Module> findByDegreeProgrammeId(UUID degreeProgrammeId);

    @Query("SELECT m FROM Module m WHERE " +
           "(:programmeId IS NULL OR m.degreeProgramme.id = :programmeId) AND " +
           "(:search IS NULL OR LOWER(m.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(m.moduleCode) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Module> searchModules(@Param("programmeId") UUID programmeId, @Param("search") String search, Pageable pageable);
}
