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
    long countBySessionIdAndStatus(UUID sessionId, AttendanceStatus status);
    long countBySessionIdAndStatusIn(UUID sessionId, java.util.Collection<AttendanceStatus> statuses);

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT a FROM AttendanceRecord a " +
                "JOIN FETCH a.student s " +
                "JOIN FETCH a.session ses " +
                "LEFT JOIN FETCH ses.module m " +
                "LEFT JOIN FETCH a.markedBy u " +
                "LEFT JOIN FETCH a.correctedBy cu " +
                "WHERE (cast(:sessionId as string) IS NULL OR ses.id = :sessionId) AND " +
                "(cast(:studentId as string) IS NULL OR s.id = :studentId) AND " +
                "(cast(:status as string) IS NULL OR a.status = :status) AND " +
                "(cast(:method as string) IS NULL OR a.method = :method) AND " +
                "(:isCorrected IS NULL OR a.isCorrected = :isCorrected) AND " +
                "(:search IS NULL OR LOWER(s.studentId) LIKE :search OR " +
                "LOWER(s.fullName) LIKE :search OR " +
                "LOWER(ses.sessionCode) LIKE :search)",
        countQuery = "SELECT COUNT(a) FROM AttendanceRecord a " +
                     "WHERE (cast(:sessionId as string) IS NULL OR a.session.id = :sessionId) AND " +
                     "(cast(:studentId as string) IS NULL OR a.student.id = :studentId) AND " +
                     "(cast(:status as string) IS NULL OR a.status = :status) AND " +
                     "(cast(:method as string) IS NULL OR a.method = :method) AND " +
                     "(:isCorrected IS NULL OR a.isCorrected = :isCorrected) AND " +
                     "(:search IS NULL OR LOWER(a.student.studentId) LIKE :search OR " +
                     "LOWER(a.student.fullName) LIKE :search OR " +
                     "LOWER(a.session.sessionCode) LIKE :search)"
    )
    org.springframework.data.domain.Page<AttendanceRecord> searchAttendanceRecords(
            @org.springframework.data.repository.query.Param("sessionId") UUID sessionId,
            @org.springframework.data.repository.query.Param("studentId") UUID studentId,
            @org.springframework.data.repository.query.Param("status") AttendanceStatus status,
            @org.springframework.data.repository.query.Param("method") com.labattend.entity.enums.AttendanceMethod method,
            @org.springframework.data.repository.query.Param("isCorrected") Boolean isCorrected,
            @org.springframework.data.repository.query.Param("search") String search,
            org.springframework.data.domain.Pageable pageable
    );

    @org.springframework.data.jpa.repository.Query(
        "SELECT a.student.id, COUNT(a.id) FROM AttendanceRecord a " +
        "JOIN a.session s " +
        "LEFT JOIN s.batch b " +
        "JOIN s.module m " +
        "WHERE s.status IN (com.labattend.entity.enums.SessionStatus.FINALIZED, com.labattend.entity.enums.SessionStatus.CLOSED) AND " +
        "a.status IN (com.labattend.entity.enums.AttendanceStatus.PRESENT, com.labattend.entity.enums.AttendanceStatus.LATE) AND " +
        "(cast(:lecturerId as string) IS NULL OR s.lecturer.id = :lecturerId) AND " +
        "(cast(:moduleId as string) IS NULL OR m.id = :moduleId) AND " +
        "(cast(:batchId as string) IS NULL OR b.id = :batchId) AND " +
        "(cast(:programmeId as string) IS NULL OR m.degreeProgramme.id = :programmeId OR (b IS NOT NULL AND b.degreeProgramme.id = :programmeId)) AND " +
        "(cast(:startDate as string) IS NULL OR s.sessionDate >= :startDate) AND " +
        "(cast(:endDate as string) IS NULL OR s.sessionDate <= :endDate) AND " +
        "(cast(:semester as string) IS NULL OR m.semester = :semester) " +
        "GROUP BY a.student.id"
    )
    List<Object[]> countAttendedSessionsPerStudent(
            @org.springframework.data.repository.query.Param("lecturerId") UUID lecturerId,
            @org.springframework.data.repository.query.Param("moduleId") UUID moduleId,
            @org.springframework.data.repository.query.Param("batchId") UUID batchId,
            @org.springframework.data.repository.query.Param("programmeId") UUID programmeId,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate,
            @org.springframework.data.repository.query.Param("semester") String semester
    );

    @org.springframework.data.jpa.repository.Query(
        "SELECT a.status, COUNT(a.id) FROM AttendanceRecord a " +
        "JOIN a.session s " +
        "LEFT JOIN s.batch b " +
        "JOIN s.module m " +
        "WHERE s.status IN (com.labattend.entity.enums.SessionStatus.FINALIZED, com.labattend.entity.enums.SessionStatus.CLOSED) AND " +
        "(:lecturerId IS NULL OR s.lecturer.id = :lecturerId) AND " +
        "(:moduleId IS NULL OR m.id = :moduleId) AND " +
        "(:batchId IS NULL OR b.id = :batchId) AND " +
        "(:programmeId IS NULL OR m.degreeProgramme.id = :programmeId OR (b IS NOT NULL AND b.degreeProgramme.id = :programmeId)) AND " +
        "(:startDate IS NULL OR s.sessionDate >= :startDate) AND " +
        "(:endDate IS NULL OR s.sessionDate <= :endDate) AND " +
        "(:semester IS NULL OR m.semester = :semester) " +
        "GROUP BY a.status"
    )
    List<Object[]> countFinalizedAttendanceSlotsByStatus(
            @org.springframework.data.repository.query.Param("lecturerId") UUID lecturerId,
            @org.springframework.data.repository.query.Param("moduleId") UUID moduleId,
            @org.springframework.data.repository.query.Param("batchId") UUID batchId,
            @org.springframework.data.repository.query.Param("programmeId") UUID programmeId,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate,
            @org.springframework.data.repository.query.Param("semester") String semester
    );

    @org.springframework.data.jpa.repository.Query(
        "SELECT a FROM AttendanceRecord a WHERE a.student.id = :studentId AND a.session.id IN :sessionIds"
    )
    List<AttendanceRecord> findByStudentIdAndSessionIdIn(
            @org.springframework.data.repository.query.Param("studentId") UUID studentId,
            @org.springframework.data.repository.query.Param("sessionIds") java.util.Collection<UUID> sessionIds
    );
}
