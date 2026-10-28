package com.labattend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "batches", uniqueConstraints = @UniqueConstraint(columnNames = {"batch_code"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Batch extends BaseEntity {

    @Column(name = "batch_code", nullable = false, length = 50)
    private String batchCode;

    @Column(name = "academic_year", nullable = false, length = 50)
    private String academicYear;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "degree_programme_id")
    private DegreeProgramme degreeProgramme;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
