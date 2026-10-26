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
}
