package com.labattend.entity;

import com.labattend.entity.enums.AttendanceMethod;
import com.labattend.entity.enums.AttendanceStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "attendance_records",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_attendance_records",
           columnNames = {"session_id", "student_id"}
       ))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRecord extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private LabSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AttendanceStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "method", nullable = false, length = 20)
    private AttendanceMethod method;

    @Column(name = "marked_at", nullable = false)
    private OffsetDateTime markedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marked_by")
    private User markedBy;

    @Column(name = "justification_notes", columnDefinition = "TEXT")
    private String justificationNotes;

    @Builder.Default
    @Column(name = "is_corrected", nullable = false)
    private Boolean isCorrected = false;

    @Column(name = "corrected_at")
    private OffsetDateTime correctedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corrected_by")
    private User correctedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 20)
    private AttendanceStatus previousStatus;
}
