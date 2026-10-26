package com.labattend.repository;

import com.labattend.entity.LabSession;
import com.labattend.entity.enums.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LabSessionRepository extends JpaRepository<LabSession, UUID> {
    Optional<LabSession> findBySessionCode(String sessionCode);
    List<LabSession> findByLecturerId(UUID lecturerId);
    List<LabSession> findBySessionDate(LocalDate sessionDate);
    List<LabSession> findByStatus(SessionStatus status);
}
