package com.labattend.repository;

import com.labattend.entity.LaboratoryHall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LaboratoryHallRepository extends JpaRepository<LaboratoryHall, UUID> {
    Optional<LaboratoryHall> findByHallCode(String hallCode);
}
