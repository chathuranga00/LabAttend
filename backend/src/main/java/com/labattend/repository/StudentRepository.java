package com.labattend.repository;

import com.labattend.entity.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentRepository extends JpaRepository<Student, UUID> {
    Optional<Student> findByStudentId(String studentId);
    Optional<Student> findByQrTokenHash(String qrTokenHash);
    Optional<Student> findByEmail(String email);

    boolean existsByStudentId(String studentId);
    boolean existsByStudentIdAndIdNot(String studentId, UUID id);
    boolean existsByEmail(String email);
    boolean existsByEmailAndIdNot(String email, UUID id);
    boolean existsByQrTokenHash(String qrTokenHash);
    boolean existsByQrTokenHashAndIdNot(String qrTokenHash, UUID id);

    java.util.List<Student> findByBatchIdAndIsActiveTrue(UUID batchId);
    long countByBatchIdAndIsActiveTrue(UUID batchId);

    java.util.List<Student> findByBatchIdAndLabGroupIdAndIsActiveTrue(UUID batchId, UUID labGroupId);
    long countByBatchIdAndLabGroupIdAndIsActiveTrue(UUID batchId, UUID labGroupId);
    long countByLabGroupId(UUID labGroupId);

    java.util.List<Student> findByBatchIdAndIsActiveTrueOrderByFullNameAsc(UUID batchId);
    java.util.List<Student> findByBatchIdAndIsActiveTrueOrderByStudentIdAsc(UUID batchId);

    @Query("SELECT s FROM Student s WHERE " +
           "(:programmeId IS NULL OR s.degreeProgramme.id = :programmeId) AND " +
           "(:batchId IS NULL OR s.batch.id = :batchId) AND " +
           "(:labGroupId IS NULL OR s.labGroup.id = :labGroupId) AND " +
           "(:isActive IS NULL OR s.isActive = :isActive) AND " +
           "(:search IS NULL OR LOWER(s.studentId) LIKE :search OR " +
           "LOWER(s.fullName) LIKE :search OR " +
           "LOWER(s.email) LIKE :search)")
    Page<Student> searchStudents(
            @Param("programmeId") UUID programmeId,
            @Param("batchId") UUID batchId,
            @Param("labGroupId") UUID labGroupId,
            @Param("isActive") Boolean isActive,
            @Param("search") String search,
            Pageable pageable
    );
}
