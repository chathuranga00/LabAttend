package com.labattend.service;

import com.labattend.dto.request.LecturerCreateRequest;
import com.labattend.dto.request.LecturerUpdateRequest;
import com.labattend.dto.response.AccessResetResponse;
import com.labattend.dto.response.LecturerResponse;
import com.labattend.dto.response.PageResponse;
import com.labattend.entity.Lecturer;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.LecturerRepository;
import com.labattend.repository.UserRepository;
import com.labattend.util.HashUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class LecturerService {

    private final LecturerRepository lecturerRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public LecturerService(LecturerRepository lecturerRepository,
                           UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           AuditLogService auditLogService) {
        this.lecturerRepository = lecturerRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public PageResponse<LecturerResponse> getLecturers(String department, Boolean isActive,
                                                      String search, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Lecturer> lecturerPage = lecturerRepository.searchLecturers(
                department != null && !department.isBlank() ? department.trim() : null,
                isActive,
                search != null && !search.isBlank() ? search.trim() : null,
                pageable
        );

        return PageResponse.of(lecturerPage.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public LecturerResponse getLecturerById(UUID id) {
        Lecturer lecturer = lecturerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lecturer", "id", id));
        return mapToResponse(lecturer);
    }

    public LecturerResponse createLecturer(LecturerCreateRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("User with email already exists: " + email);
        }

        String staffId = request.getStaffId().trim().toUpperCase();
        if (lecturerRepository.existsByStaffId(staffId)) {
            throw new BadRequestException("Staff ID already exists: " + staffId);
        }

        String rawPassword = (request.getInitialPassword() != null && !request.getInitialPassword().isBlank())
                ? request.getInitialPassword().trim()
                : HashUtils.generateTemporaryPassword(12);

        // 1. Create User in same transaction
        User user = User.builder()
                .email(email)
                .fullName(request.getFullName().trim())
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(Role.LECTURER)
                .isActive(true)
                .mustChangePassword(true)
                .build();

        User savedUser = userRepository.save(user);

        // 2. Create Lecturer entity linked to User
        Lecturer lecturer = Lecturer.builder()
                .user(savedUser)
                .staffId(staffId)
                .fullName(request.getFullName().trim())
                .department(request.getDepartment().trim())
                .isActive(true)
                .build();

        Lecturer savedLecturer = lecturerRepository.save(lecturer);

        LecturerResponse response = mapToResponse(savedLecturer);
        response.setTemporaryPassword(rawPassword);

        // Audit log (omit password)
        LecturerResponse auditSafe = mapToResponse(savedLecturer);
        auditLogService.logAction("Lecturer", savedLecturer.getId(), "CREATE", null, auditSafe);

        return response;
    }

    public LecturerResponse updateLecturer(UUID id, LecturerUpdateRequest request) {
        Lecturer lecturer = lecturerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lecturer", "id", id));

        String staffId = request.getStaffId().trim().toUpperCase();
        if (lecturerRepository.existsByStaffIdAndIdNot(staffId, id)) {
            throw new BadRequestException("Staff ID already exists: " + staffId);
        }

        LecturerResponse previousState = mapToResponse(lecturer);

        lecturer.setStaffId(staffId);
        lecturer.setFullName(request.getFullName().trim());
        lecturer.setDepartment(request.getDepartment().trim());

        if (lecturer.getUser() != null) {
            lecturer.getUser().setFullName(request.getFullName().trim());
            userRepository.save(lecturer.getUser());
        }

        Lecturer updated = lecturerRepository.save(lecturer);
        LecturerResponse newState = mapToResponse(updated);

        auditLogService.logAction("Lecturer", updated.getId(), "UPDATE", previousState, newState);

        return newState;
    }

    public LecturerResponse toggleStatus(UUID id) {
        Lecturer lecturer = lecturerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lecturer", "id", id));

        LecturerResponse previousState = mapToResponse(lecturer);

        boolean newActive = !lecturer.getIsActive();
        lecturer.setIsActive(newActive);

        // Cascade to user account so deactivated lecturer cannot log in!
        if (lecturer.getUser() != null) {
            lecturer.getUser().setIsActive(newActive);
            userRepository.save(lecturer.getUser());
        }

        Lecturer updated = lecturerRepository.save(lecturer);
        LecturerResponse newState = mapToResponse(updated);

        String action = newActive ? "ACTIVATE" : "DEACTIVATE";
        auditLogService.logAction("Lecturer", updated.getId(), action, previousState, newState);

        return newState;
    }

    public AccessResetResponse resetAccess(UUID id) {
        Lecturer lecturer = lecturerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lecturer", "id", id));

        User user = lecturer.getUser();
        if (user == null) {
            throw new BadRequestException("No user authentication account associated with lecturer");
        }

        String newTempPassword = HashUtils.generateTemporaryPassword(12);
        user.setPasswordHash(passwordEncoder.encode(newTempPassword));
        user.setMustChangePassword(true);
        userRepository.save(user);

        auditLogService.logAction("Lecturer", id, "ACCESS_RESET", null,
                "Password reset and forced change flag activated for " + user.getEmail());

        return AccessResetResponse.builder()
                .lecturerId(id)
                .email(user.getEmail())
                .temporaryPassword(newTempPassword)
                .message("Access credentials reset successfully. A temporary password has been issued.")
                .build();
    }

    private LecturerResponse mapToResponse(Lecturer l) {
        return LecturerResponse.builder()
                .id(l.getId())
                .userId(l.getUser() != null ? l.getUser().getId() : null)
                .email(l.getUser() != null ? l.getUser().getEmail() : null)
                .fullName(l.getFullName())
                .staffId(l.getStaffId())
                .department(l.getDepartment())
                .isActive(l.getIsActive())
                .mustChangePassword(l.getUser() != null ? l.getUser().getMustChangePassword() : false)
                .temporaryPassword(null)
                .createdAt(l.getCreatedAt())
                .updatedAt(l.getUpdatedAt())
                .build();
    }
}
