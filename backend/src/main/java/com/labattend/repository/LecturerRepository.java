package com.labattend.repository;

import com.labattend.entity.Lecturer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LecturerRepository extends JpaRepository<Lecturer, UUID> {
    Optional<Lecturer> findByStaffId(String staffId);
    Optional<Lecturer> findByUserId(UUID userId);
}
