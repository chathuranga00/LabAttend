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
    List<SessionStudent> findBySessionIdAndIsExpectedTrue(UUID sessionId);
    List<SessionStudent> findByStudentId(UUID studentId);
    Optional<SessionStudent> findBySessionIdAndStudentId(UUID sessionId, UUID studentId);
    Optional<SessionStudent> findBySessionIdAndStudentIdAndIsExpectedTrue(UUID sessionId, UUID studentId);
    boolean existsBySessionIdAndStudentId(UUID sessionId, UUID studentId);
    boolean existsBySessionIdAndStudentIdAndIsExpectedTrue(UUID sessionId, UUID studentId);
    long countBySessionId(UUID sessionId);
    long countBySessionIdAndIsExpectedTrue(UUID sessionId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT ss FROM SessionStudent ss " +
        "JOIN FETCH ss.student s " +
        "WHERE ss.session.id = :sessionId AND " +
        "(:search IS NULL OR LOWER(s.studentId) LIKE :search OR " +
        "LOWER(s.fullName) LIKE :search) " +
        "ORDER BY s.studentId ASC"
    )
    List<SessionStudent> findBySessionIdWithSearch(
            @org.springframework.data.repository.query.Param("sessionId") UUID sessionId,
            @org.springframework.data.repository.query.Param("search") String search
    );

    @org.springframework.data.jpa.repository.Query(
        "SELECT st.id, st.studentId, st.fullName, sb.batchCode, " +
        "lg.id, lg.groupName, " +
        "COUNT(CASE WHEN s.status IN (com.labattend.entity.enums.SessionStatus.FINALIZED, com.labattend.entity.enums.SessionStatus.CLOSED) AND ss.isExpected = true THEN 1 ELSE NULL END) " +
        "FROM SessionStudent ss " +
        "JOIN ss.session s " +
        "JOIN ss.student st " +
        "LEFT JOIN st.batch sb " +
        "LEFT JOIN st.labGroup lg " +
        "LEFT JOIN s.labGroup slg " +
        "LEFT JOIN s.batch b " +
        "JOIN s.module m " +
        "WHERE s.status != com.labattend.entity.enums.SessionStatus.CANCELLED AND " +
        "ss.isExpected = true AND " +
        "(cast(:lecturerId as string) IS NULL OR s.lecturer.id = :lecturerId) AND " +
        "(cast(:moduleId as string) IS NULL OR m.id = :moduleId) AND " +
        "(cast(:batchId as string) IS NULL OR b.id = :batchId) AND " +
        "(cast(:labGroupId as string) IS NULL OR slg.id = :labGroupId OR lg.id = :labGroupId) AND " +
        "(cast(:programmeId as string) IS NULL OR m.degreeProgramme.id = :programmeId OR (b IS NOT NULL AND b.degreeProgramme.id = :programmeId)) AND " +
        "(cast(:startDate as string) IS NULL OR s.sessionDate >= :startDate) AND " +
        "(cast(:endDate as string) IS NULL OR s.sessionDate <= :endDate) AND " +
        "(cast(:semester as string) IS NULL OR m.semester = :semester) " +
        "GROUP BY st.id, st.studentId, st.fullName, sb.batchCode, lg.id, lg.groupName"
    )
    List<Object[]> countEligibleFinalizedSessionsPerStudent(
            @org.springframework.data.repository.query.Param("lecturerId") UUID lecturerId,
            @org.springframework.data.repository.query.Param("moduleId") UUID moduleId,
            @org.springframework.data.repository.query.Param("batchId") UUID batchId,
            @org.springframework.data.repository.query.Param("labGroupId") UUID labGroupId,
            @org.springframework.data.repository.query.Param("programmeId") UUID programmeId,
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate,
            @org.springframework.data.repository.query.Param("semester") String semester
    );

    @org.springframework.data.jpa.repository.Query(
        "SELECT COUNT(ss.id) FROM SessionStudent ss " +
        "JOIN ss.session s " +
        "LEFT JOIN s.labGroup slg " +
        "LEFT JOIN s.batch b " +
        "JOIN s.module m " +
        "WHERE s.status IN (com.labattend.entity.enums.SessionStatus.FINALIZED, com.labattend.entity.enums.SessionStatus.CLOSED) AND " +
        "ss.isExpected = true AND " +
        "(cast(:lecturerId as string) IS NULL OR s.lecturer.id = :lecturerId) AND " +
        "(cast(:moduleId as string) IS NULL OR m.id = :moduleId) AND " +
        "(cast(:batchId as string) IS NULL OR b.id = :batchId) AND " +
        "(cast(:labGroupId as string) IS NULL OR slg.id = :labGroupId) AND " +
        "(cast(:programmeId as string) IS NULL OR m.degreeProgramme.id = :programmeId OR (b IS NOT NULL AND b.degreeProgramme.id = :programmeId)) AND " +
        "(cast(:startDate as string) IS NULL OR s.sessionDate >= :startDate) AND " +
        "(cast(:endDate as string) IS NULL OR s.sessionDate <= :endDate) AND " +
        "(cast(:semester as string) IS NULL OR m.semester = :semester)"
    )
    long countTotalExpectedFinalizedSlots(
            @org.springframework.data.repository.query.Param("lecturerId") UUID lecturerId,
            @org.springframework.data.repository.query.Param("moduleId") UUID moduleId,
            @org.springframework.data.repository.query.Param("batchId") UUID batchId,
            @org.springframework.data.repository.query.Param("labGroupId") UUID labGroupId,
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
        "LEFT JOIN FETCH s.labGroup lg " +
        "JOIN FETCH s.hall h " +
        "JOIN FETCH s.lecturer l " +
        "WHERE ss.student.id = :studentId AND " +
        "s.status != com.labattend.entity.enums.SessionStatus.CANCELLED AND " +
        "(cast(:lecturerId as string) IS NULL OR s.lecturer.id = :lecturerId) AND " +
        "(cast(:moduleId as string) IS NULL OR m.id = :moduleId) AND " +
        "(cast(:startDate as string) IS NULL OR s.sessionDate >= :startDate) AND " +
        "(cast(:endDate as string) IS NULL OR s.sessionDate <= :endDate) " +
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
