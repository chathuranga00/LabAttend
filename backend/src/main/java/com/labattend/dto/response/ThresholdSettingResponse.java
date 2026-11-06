package com.labattend.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThresholdSettingResponse {
    private Double threshold;
    private String description;
}
