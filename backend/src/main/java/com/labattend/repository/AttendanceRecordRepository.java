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
}
