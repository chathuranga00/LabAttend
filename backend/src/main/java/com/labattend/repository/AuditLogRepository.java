package com.labattend.repository;

import com.labattend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByEntityNameAndEntityId(String entityName, UUID entityId);
    List<AuditLog> findByPerformedById(UUID userId);

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT a FROM AuditLog a " +
                "LEFT JOIN FETCH a.performedBy u " +
                "WHERE (:actorId IS NULL OR (u IS NOT NULL AND u.id = :actorId)) AND " +
                "(:action IS NULL OR a.action = :action) AND " +
                "(:entityName IS NULL OR a.entityName = :entityName) AND " +
                "(:startDate IS NULL OR a.timestamp >= :startDate) AND " +
                "(:endDate IS NULL OR a.timestamp <= :endDate) AND " +
                "(:search IS NULL OR (u IS NOT NULL AND LOWER(u.fullName) LIKE :search) OR " +
                "(u IS NOT NULL AND LOWER(u.email) LIKE :search) OR " +
                "LOWER(a.action) LIKE :search OR " +
                "LOWER(a.entityName) LIKE :search)",
        countQuery = "SELECT COUNT(a) FROM AuditLog a " +
                     "WHERE (:actorId IS NULL OR (a.performedBy IS NOT NULL AND a.performedBy.id = :actorId)) AND " +
                     "(:action IS NULL OR a.action = :action) AND " +
                     "(:entityName IS NULL OR a.entityName = :entityName) AND " +
                     "(:startDate IS NULL OR a.timestamp >= :startDate) AND " +
                     "(:endDate IS NULL OR a.timestamp <= :endDate) AND " +
                     "(:search IS NULL OR (a.performedBy IS NOT NULL AND LOWER(a.performedBy.fullName) LIKE :search) OR " +
                     "(a.performedBy IS NOT NULL AND LOWER(a.performedBy.email) LIKE :search) OR " +
                     "LOWER(a.action) LIKE :search OR " +
                     "LOWER(a.entityName) LIKE :search)"
    )
    org.springframework.data.domain.Page<AuditLog> searchAuditLogs(
            @org.springframework.data.repository.query.Param("actorId") UUID actorId,
            @org.springframework.data.repository.query.Param("action") String action,
            @org.springframework.data.repository.query.Param("entityName") String entityName,
            @org.springframework.data.repository.query.Param("startDate") java.time.OffsetDateTime startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.OffsetDateTime endDate,
            @org.springframework.data.repository.query.Param("search") String search,
            org.springframework.data.domain.Pageable pageable
    );
}
