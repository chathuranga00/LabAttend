package com.labattend.repository;

import com.labattend.entity.AttendanceRecord;
import com.labattend.entity.enums.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, UUID> {
    Optional<AttendanceRecord> findBySessionIdAndStudentId(UUID sessionId, UUID studentId);
    List<AttendanceRecord> findBySessionId(UUID sessionId);
    List<AttendanceRecord> findBySessionIdAndStatus(UUID sessionId, AttendanceStatus status);
    List<AttendanceRecord> findByStudentId(UUID studentId);
    boolean existsBySessionIdAndStudentId(UUID sessionId, UUID studentId);
    long countBySessionId(UUID sessionId);
    long countBySessionIdAndStatusIn(UUID sessionId, java.util.Collection<AttendanceStatus> statuses);

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT a FROM AttendanceRecord a " +
                "JOIN FETCH a.student s " +
                "LEFT JOIN FETCH a.markedBy u " +
                "WHERE a.session.id = :sessionId AND " +
                "(:search IS NULL OR LOWER(s.studentId) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                "LOWER(s.fullName) LIKE LOWER(CONCAT('%', :search, '%')))",
        countQuery = "SELECT COUNT(a) FROM AttendanceRecord a " +
                     "WHERE a.session.id = :sessionId AND " +
                     "(:search IS NULL OR LOWER(a.student.studentId) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                     "LOWER(a.student.fullName) LIKE LOWER(CONCAT('%', :search, '%')))"
    )
    org.springframework.data.domain.Page<AttendanceRecord> findBySessionIdWithSearch(
            @org.springframework.data.repository.query.Param("sessionId") UUID sessionId,
            @org.springframework.data.repository.query.Param("search") String search,
            org.springframework.data.domain.Pageable pageable
    );
}
