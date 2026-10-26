package com.labattend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "modules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Module extends BaseEntity {

    @Column(name = "module_code", nullable = false, unique = true, length = 50)
    private String moduleCode;

    @Column(name = "name", nullable = false)
    private String name;

    @Builder.Default
    @Column(name = "credits", nullable = false)
    private Integer credits = 3;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "degree_programme_id")
    private DegreeProgramme degreeProgramme;

    @Column(name = "academic_year", length = 50)
    private String academicYear;

    @Column(name = "semester", length = 50)
    private String semester;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
