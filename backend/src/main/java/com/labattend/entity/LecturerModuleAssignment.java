package com.labattend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lecturer_module_assignments",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_lecturer_module_sem",
           columnNames = {"lecturer_id", "module_id", "academic_year", "semester"}
       ))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LecturerModuleAssignment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lecturer_id", nullable = false)
    private Lecturer lecturer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "module_id", nullable = false)
    private Module module;

    @Column(name = "academic_year", nullable = false, length = 50)
    private String academicYear;

    @Column(name = "semester", nullable = false, length = 50)
    private String semester;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
