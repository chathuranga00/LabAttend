package com.labattend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "degree_programmes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DegreeProgramme extends BaseEntity {

    @Column(name = "code", unique = true, length = 50)
    private String code;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "department")
    private String department;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
