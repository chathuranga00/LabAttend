package com.labattend.dto.student;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentProfileResponse {
    private String studentId;
    private String fullName;
    private String email;
    private String degreeProgramme;
    private String batch;
    private String labGroup;
    private String enrollmentStatus;
}
