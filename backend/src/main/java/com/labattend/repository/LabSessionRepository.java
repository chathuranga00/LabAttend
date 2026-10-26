package com.labattend.repository;

import com.labattend.entity.LabSession;
import com.labattend.entity.enums.SessionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LabSessionRepository extends JpaRepository<LabSession, UUID> {
    Optional<LabSession> findBySessionCode(String sessionCode);
    boolean existsBySessionCode(String sessionCode);
    List<LabSession> findByLecturerId(UUID lecturerId);
    List<LabSession> findBySessionDate(LocalDate sessionDate);
    List<LabSession> findByStatus(SessionStatus status);

    @Query("SELECT s FROM LabSession s WHERE " +
           "s.hall.id = :hallId AND s.sessionDate = :sessionDate AND s.status != 'CANCELLED' AND " +
           "(:excludeId IS NULL OR s.id != :excludeId) AND " +
           "(s.startTime < :endTime AND s.endTime > :startTime)")
    List<LabSession> findConflictingHallSessions(
            @Param("hallId") UUID hallId,
            @Param("sessionDate") LocalDate sessionDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") UUID excludeId
    );

    @Query("SELECT s FROM LabSession s WHERE " +
           "s.lecturer.id = :lecturerId AND s.sessionDate = :sessionDate AND s.status != 'CANCELLED' AND " +
           "(:excludeId IS NULL OR s.id != :excludeId) AND " +
           "(s.startTime < :endTime AND s.endTime > :startTime)")
    List<LabSession> findConflictingLecturerSessions(
            @Param("lecturerId") UUID lecturerId,
            @Param("sessionDate") LocalDate sessionDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") UUID excludeId
    );

    @Query("SELECT s FROM LabSession s WHERE " +
           "(:lecturerId IS NULL OR s.lecturer.id = :lecturerId) AND " +
           "(:moduleId IS NULL OR s.module.id = :moduleId) AND " +
           "(:batchId IS NULL OR s.batch.id = :batchId) AND " +
           "(:hallId IS NULL OR s.hall.id = :hallId) AND " +
           "(:status IS NULL OR s.status = :status) AND " +
           "(:startDate IS NULL OR s.sessionDate >= :startDate) AND " +
           "(:endDate IS NULL OR s.sessionDate <= :endDate) AND " +
           "(:search IS NULL OR LOWER(s.sessionCode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.module.moduleCode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.module.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<LabSession> searchSessions(
            @Param("lecturerId") UUID lecturerId,
            @Param("moduleId") UUID moduleId,
            @Param("batchId") UUID batchId,
            @Param("hallId") UUID hallId,
            @Param("status") SessionStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT s FROM LabSession s WHERE " +
           "s.lecturer.id = :lecturerId AND s.sessionDate = :date AND s.status != 'CANCELLED' " +
           "ORDER BY s.startTime ASC")
    List<LabSession> findLecturerSessionsOnDate(
            @Param("lecturerId") UUID lecturerId,
            @Param("date") LocalDate date
    );

    @Query("SELECT s FROM LabSession s WHERE " +
           "s.lecturer.id = :lecturerId AND s.sessionDate > :date AND s.status != 'CANCELLED' " +
           "ORDER BY s.sessionDate ASC, s.startTime ASC")
    List<LabSession> findLecturerUpcomingSessions(
            @Param("lecturerId") UUID lecturerId,
            @Param("date") LocalDate date
    );

    long countByLecturerIdAndStatusIn(UUID lecturerId, List<SessionStatus> statuses);
    long countByLecturerId(UUID lecturerId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM LabSession s WHERE s.id = :id")
    Optional<LabSession> findByIdWithPessimisticLock(@Param("id") UUID id);
}
