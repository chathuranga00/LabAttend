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

    @org.springframework.data.jpa.repository.Query(
        "SELECT ss.student.id, ss.student.studentId, ss.student.fullName, ss.student.batch.batchCode, " +
        "COUNT(CASE WHEN s.status IN (com.labattend.entity.enums.SessionStatus.FINALIZED, com.labattend.entity.enums.SessionStatus.CLOSED) THEN 1 ELSE NULL END) " +
        "FROM SessionStudent ss " +
        "JOIN ss.session s " +
        "LEFT JOIN s.batch b " +
        "JOIN s.module m " +
        "WHERE s.status != com.labattend.entity.enums.SessionStatus.CANCELLED AND " +
        "(:lecturerId IS NULL OR s.lecturer.id = :lecturerId) AND " +
        "(:moduleId IS NULL OR m.id = :moduleId) AND " +
        "(:batchId IS NULL OR b.id = :batchId) AND " +
        "(:programmeId IS NULL OR m.degreeProgramme.id = :programmeId OR (b IS NOT NULL AND b.degreeProgramme.id = :programmeId)) AND " +
        "(:startDate IS NULL OR s.sessionDate >= :startDate) AND " +
        "(:endDate IS NULL OR s.sessionDate <= :endDate) AND " +
        "(:semester IS NULL OR m.semester = :semester) " +
        "GROUP BY ss.student.id, ss.student.studentId, ss.student.fullName, ss.student.batch.batchCode"
    )
    List<Object[]> countEligibleFinalizedSessionsPerStudent(
            @org.springframework.data.repository.query.Param("lecturerId") UUID lecturerId,
            @org.springframework.data.repository.query.Param("moduleId") UUID moduleId,
            @org.springframework.data.repository.query.Param("batchId") UUID batchId,
            @org.springframework.data.repository.query.Param("programmeId") UUID programmeId,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate,
            @org.springframework.data.repository.query.Param("semester") String semester
    );

    @org.springframework.data.jpa.repository.Query(
        "SELECT COUNT(ss.id) FROM SessionStudent ss " +
        "JOIN ss.session s " +
        "LEFT JOIN s.batch b " +
        "JOIN s.module m " +
        "WHERE s.status IN (com.labattend.entity.enums.SessionStatus.FINALIZED, com.labattend.entity.enums.SessionStatus.CLOSED) AND " +
        "(:lecturerId IS NULL OR s.lecturer.id = :lecturerId) AND " +
        "(:moduleId IS NULL OR m.id = :moduleId) AND " +
        "(:batchId IS NULL OR b.id = :batchId) AND " +
        "(:programmeId IS NULL OR m.degreeProgramme.id = :programmeId OR (b IS NOT NULL AND b.degreeProgramme.id = :programmeId)) AND " +
        "(:startDate IS NULL OR s.sessionDate >= :startDate) AND " +
        "(:endDate IS NULL OR s.sessionDate <= :endDate) AND " +
        "(:semester IS NULL OR m.semester = :semester)"
    )
    long countTotalExpectedFinalizedSlots(
            @org.springframework.data.repository.query.Param("lecturerId") UUID lecturerId,
            @org.springframework.data.repository.query.Param("moduleId") UUID moduleId,
            @org.springframework.data.repository.query.Param("batchId") UUID batchId,
            @org.springframework.data.repository.query.Param("programmeId") UUID programmeId,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate,
            @org.springframework.data.repository.query.Param("semester") String semester
    );

    @org.springframework.data.jpa.repository.Query(
        "SELECT ss FROM SessionStudent ss " +
        "JOIN FETCH ss.session s " +
        "JOIN FETCH s.module m " +
        "LEFT JOIN FETCH s.batch b " +
        "JOIN FETCH s.hall h " +
        "JOIN FETCH s.lecturer l " +
        "WHERE ss.student.id = :studentId AND " +
        "s.status != com.labattend.entity.enums.SessionStatus.CANCELLED AND " +
        "(:lecturerId IS NULL OR s.lecturer.id = :lecturerId) AND " +
        "(:moduleId IS NULL OR m.id = :moduleId) AND " +
        "(:startDate IS NULL OR s.sessionDate >= :startDate) AND " +
        "(:endDate IS NULL OR s.sessionDate <= :endDate) " +
        "ORDER BY s.sessionDate DESC, s.startTime DESC"
    )
    List<SessionStudent> findStudentEligibleSessions(
            @org.springframework.data.repository.query.Param("studentId") UUID studentId,
            @org.springframework.data.repository.query.Param("lecturerId") UUID lecturerId,
            @org.springframework.data.repository.query.Param("moduleId") UUID moduleId,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate
    );
}
