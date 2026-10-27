package com.labattend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lab_groups",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_lab_groups_batch_name",
           columnNames = {"batch_id", "group_name"}
       ))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabGroup extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private Batch batch;

    @Column(name = "group_name", nullable = false, length = 50)
    private String groupName;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
