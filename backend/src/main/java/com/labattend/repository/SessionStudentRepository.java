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
    long countBySessionId(UUID sessionId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT ss FROM SessionStudent ss " +
        "JOIN FETCH ss.student s " +
        "WHERE ss.session.id = :sessionId AND " +
        "(:search IS NULL OR LOWER(s.studentId) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
        "LOWER(s.fullName) LIKE LOWER(CONCAT('%', :search, '%'))) " +
        "ORDER BY s.studentId ASC"
    )
    List<SessionStudent> findBySessionIdWithSearch(
            @org.springframework.data.repository.query.Param("sessionId") UUID sessionId,
            @org.springframework.data.repository.query.Param("search") String search
    );
}
