package com.labattend.repository;

import com.labattend.entity.LecturerModuleAssignment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LecturerModuleAssignmentRepository extends JpaRepository<LecturerModuleAssignment, UUID> {
    List<LecturerModuleAssignment> findByLecturerId(UUID lecturerId);
    List<LecturerModuleAssignment> findByModuleId(UUID moduleId);
    List<LecturerModuleAssignment> findByBatchId(UUID batchId);

    @Query("SELECT lma FROM LecturerModuleAssignment lma WHERE " +
           "lma.lecturer.id = :lecturerId AND lma.module.id = :moduleId AND " +
           "((:batchId IS NULL AND lma.batch IS NULL) OR lma.batch.id = :batchId) AND " +
           "lma.academicYear = :academicYear AND lma.semester = :semester")
    Optional<LecturerModuleAssignment> findExistingAssignment(
            @Param("lecturerId") UUID lecturerId,
            @Param("moduleId") UUID moduleId,
            @Param("batchId") UUID batchId,
            @Param("academicYear") String academicYear,
            @Param("semester") String semester
    );

    @Query("SELECT lma FROM LecturerModuleAssignment lma WHERE " +
           "(:lecturerId IS NULL OR lma.lecturer.id = :lecturerId) AND " +
           "(:moduleId IS NULL OR lma.module.id = :moduleId) AND " +
           "(:batchId IS NULL OR lma.batch.id = :batchId) AND " +
           "(:academicYear IS NULL OR lma.academicYear = :academicYear) AND " +
           "(:semester IS NULL OR lma.semester = :semester)")
    Page<LecturerModuleAssignment> searchAssignments(
            @Param("lecturerId") UUID lecturerId,
            @Param("moduleId") UUID moduleId,
            @Param("batchId") UUID batchId,
            @Param("academicYear") String academicYear,
            @Param("semester") String semester,
            Pageable pageable
    );
}
