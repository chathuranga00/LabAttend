package com.labattend.repository;

import com.labattend.entity.DegreeProgramme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DegreeProgrammeRepository extends JpaRepository<DegreeProgramme, UUID> {
    Optional<DegreeProgramme> findByCode(String code);
}
