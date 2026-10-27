package com.labattend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student extends BaseEntity {

    @Column(name = "student_id", nullable = false, unique = true, length = 50)
    private String studentId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "degree_programme_id", nullable = false)
    private DegreeProgramme degreeProgramme;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private Batch batch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lab_group_id")
    private LabGroup labGroup;

    @Column(name = "qr_token_hash", unique = true, length = 64)
    private String qrTokenHash;

    @Builder.Default
    @Column(name = "qr_version", nullable = false)
    private Integer qrVersion = 1;

    @Column(name = "qr_generated_at")
    private OffsetDateTime qrGeneratedAt;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
