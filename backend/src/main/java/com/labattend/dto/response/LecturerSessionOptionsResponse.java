package com.labattend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LecturerSessionOptionsResponse {

    private List<AuthorizedModuleOption> modules;
    private List<ActiveHallOption> halls;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthorizedModuleOption {
        private UUID moduleId;
        private String moduleCode;
        private String moduleName;
        private List<AuthorizedBatchOption> batches;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthorizedBatchOption {
        private UUID batchId;
        private String batchCode;
        private String academicYear;
        private long enrolledStudentCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActiveHallOption {
        private UUID hallId;
        private String hallCode;
        private String name;
        private int capacity;
        private String location;
    }
}
