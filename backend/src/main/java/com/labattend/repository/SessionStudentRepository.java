package com.labattend.repository;

import com.labattend.entity.SessionStudent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionStudentRepository extends JpaRepository<SessionStudent, UUID> {
    List<SessionStudent> findBySessionId(UUID sessionId);
    List<SessionStudent> findByStudentId(UUID studentId);
    Optional<SessionStudent> findBySessionIdAndStudentId(UUID sessionId, UUID studentId);
    boolean existsBySessionIdAndStudentId(UUID sessionId, UUID studentId);
}
