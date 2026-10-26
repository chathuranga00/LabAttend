package com.labattend.repository;

import com.labattend.entity.LecturerModuleAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LecturerModuleAssignmentRepository extends JpaRepository<LecturerModuleAssignment, UUID> {
    List<LecturerModuleAssignment> findByLecturerId(UUID lecturerId);
    List<LecturerModuleAssignment> findByModuleId(UUID moduleId);
}
