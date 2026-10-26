package com.labattend.repository;

import com.labattend.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentRepository extends JpaRepository<Student, UUID> {
    Optional<Student> findByStudentId(String studentId);
    Optional<Student> findByQrTokenHash(String qrTokenHash);
    Optional<Student> findByEmail(String email);
    boolean existsByStudentId(String studentId);
}
