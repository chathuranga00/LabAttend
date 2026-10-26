package com.labattend.repository;

import com.labattend.entity.Lecturer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LecturerRepository extends JpaRepository<Lecturer, UUID> {
    Optional<Lecturer> findByStaffId(String staffId);
    Optional<Lecturer> findByUserId(UUID userId);

    boolean existsByStaffId(String staffId);
    boolean existsByStaffIdAndIdNot(String staffId, UUID id);

    @Query("SELECT l FROM Lecturer l WHERE " +
           "(:department IS NULL OR LOWER(l.department) LIKE LOWER(CONCAT('%', :department, '%'))) AND " +
           "(:isActive IS NULL OR l.isActive = :isActive) AND " +
           "(:search IS NULL OR LOWER(l.staffId) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(l.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(l.user.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Lecturer> searchLecturers(
            @Param("department") String department,
            @Param("isActive") Boolean isActive,
            @Param("search") String search,
            Pageable pageable
    );
}
