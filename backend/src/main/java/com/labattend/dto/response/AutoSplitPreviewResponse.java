package com.labattend.dto.response;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoSplitPreviewResponse {

    private UUID batchId;
    private String batchCode;
    private int totalStudents;
    private int numGroups;
    private String splitMethod;
    private List<GroupSplitPreview> groups;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GroupSplitPreview {
        private String groupName;
        private int studentCount;
        private List<StudentPreviewItem> students;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StudentPreviewItem {
        private UUID id;
        private String studentId;
        private String fullName;
        private String email;
        private String currentGroupName;
    }
}
