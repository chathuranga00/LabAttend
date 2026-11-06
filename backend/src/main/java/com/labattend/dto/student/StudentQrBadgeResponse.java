package com.labattend.dto.student;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentQrBadgeResponse {
    private String studentId;
    private String fullName;
    private String batch;
    private String labGroup;
    private String badgeDataUrl;
    private String qrDataUrl;
}
