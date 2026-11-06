package com.labattend.service;

import com.labattend.dto.response.StudentResponse;
import com.labattend.entity.AccountActivationToken;
import com.labattend.entity.Batch;
import com.labattend.entity.Student;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.TokenPurpose;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.AccountActivationTokenRepository;
import com.labattend.repository.BatchRepository;
import com.labattend.repository.StudentRepository;
import com.labattend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.regex.Pattern;

@Service
@Transactional
public class StudentAccountService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final AccountActivationTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final BatchRepository batchRepository;

    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,100}$"
    );

    public StudentAccountService(
            StudentRepository studentRepository,
            UserRepository userRepository,
            AccountActivationTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            AuditLogService auditLogService,
            BatchRepository batchRepository
    ) {
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
        this.batchRepository = batchRepository;
    }

    public StudentResponse createAccount(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        if (student.getEmail() == null || student.getEmail().isBlank()) {
            throw new BadRequestException("Student does not have a registered university email address.");
        }

        if (student.getUser() != null) {
            throw new BadRequestException("Student already has an active or provisioned account.");
        }

        String normalizedEmail = student.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BadRequestException("A user account with email " + normalizedEmail + " already exists.");
        }

        User user = User.builder()
                .email(normalizedEmail)
                .fullName(student.getFullName())
                .role(Role.STUDENT)
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                .isActive(true)
                .mustChangePassword(true)
                .build();

        User savedUser = userRepository.save(user);
        student.setUser(savedUser);
        Student updatedStudent = studentRepository.save(student);

        // Generate activation token
        String rawToken = generateSecureToken();
        String tokenHash = hashToken(rawToken);

        AccountActivationToken token = AccountActivationToken.builder()
                .user(savedUser)
                .tokenHash(tokenHash)
                .purpose(TokenPurpose.ACTIVATION)
                .expiresAt(OffsetDateTime.now().plusHours(24))
                .build();
        tokenRepository.save(token);

        // Send activation email
        emailService.sendActivationEmail(normalizedEmail, student.getFullName(), rawToken);

        auditLogService.logAction("StudentAccount", savedUser.getId(), "STUDENT_ACCOUNT_CREATE", null, Map.of(
                "studentId", student.getStudentId(),
                "email", normalizedEmail
        ));

        return mapToStudentResponse(updatedStudent);
    }

    public StudentResponse sendActivationLink(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        User user = student.getUser();
        if (user == null) {
            throw new BadRequestException("Student does not have an account. Please create an account first.");
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadRequestException("Cannot send activation link to a deactivated account. Reactivate the account first.");
        }

        // Invalidate prior unused activation tokens
        tokenRepository.invalidateUnusedTokens(user.getId(), TokenPurpose.ACTIVATION, OffsetDateTime.now());

        // Mark account as pending activation
        user.setMustChangePassword(true);
        userRepository.save(user);

        // Generate fresh activation token
        String rawToken = generateSecureToken();
        String tokenHash = hashToken(rawToken);

        AccountActivationToken token = AccountActivationToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .purpose(TokenPurpose.ACTIVATION)
                .expiresAt(OffsetDateTime.now().plusHours(24))
                .build();
        tokenRepository.save(token);

        emailService.sendActivationEmail(user.getEmail(), student.getFullName(), rawToken);

        auditLogService.logAction("StudentAccount", user.getId(), "STUDENT_ACCOUNT_SEND_ACTIVATION", null, Map.of(
                "studentId", student.getStudentId(),
                "email", user.getEmail()
        ));

        return mapToStudentResponse(student);
    }

    public StudentResponse toggleAccountStatus(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        User user = student.getUser();
        if (user == null) {
            throw new BadRequestException("Student does not have an account to toggle.");
        }

        boolean newStatus = !Boolean.TRUE.equals(user.getIsActive());
        user.setIsActive(newStatus);
        userRepository.save(user);

        auditLogService.logAction("StudentAccount", user.getId(), "STUDENT_ACCOUNT_TOGGLE_STATUS", null, Map.of(
                "studentId", student.getStudentId(),
                "isActive", newStatus
        ));

        return mapToStudentResponse(student);
    }

    public StudentResponse resetAccess(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        User user = student.getUser();
        if (user == null) {
            throw new BadRequestException("Student does not have an account. Please create an account first.");
        }

        // Invalidate all tokens
        tokenRepository.invalidateUnusedTokens(user.getId(), TokenPurpose.ACTIVATION, OffsetDateTime.now());
        tokenRepository.invalidateUnusedTokens(user.getId(), TokenPurpose.PASSWORD_RESET, OffsetDateTime.now());

        // Reset password to unusable placeholder and force activation
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setIsActive(true);
        user.setMustChangePassword(true);
        userRepository.save(user);

        // Generate fresh activation token
        String rawToken = generateSecureToken();
        String tokenHash = hashToken(rawToken);

        AccountActivationToken token = AccountActivationToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .purpose(TokenPurpose.ACTIVATION)
                .expiresAt(OffsetDateTime.now().plusHours(24))
                .build();
        tokenRepository.save(token);

        emailService.sendActivationEmail(user.getEmail(), student.getFullName(), rawToken);

        auditLogService.logAction("StudentAccount", user.getId(), "STUDENT_ACCOUNT_RESET_ACCESS", null, Map.of(
                "studentId", student.getStudentId(),
                "email", user.getEmail()
        ));

        return mapToStudentResponse(student);
    }

    public Map<String, Object> bulkCreateAccounts(UUID batchId, UUID labGroupId, List<UUID> studentIds) {
        List<Student> targets;

        if (studentIds != null && !studentIds.isEmpty()) {
            targets = studentRepository.findAllById(studentIds);
        } else if (batchId != null) {
            if (labGroupId != null) {
                targets = studentRepository.findByBatchIdAndLabGroupIdAndIsActiveTrue(batchId, labGroupId);
            } else {
                targets = studentRepository.findByBatchIdAndIsActiveTrue(batchId);
            }
        } else {
            throw new BadRequestException("Either studentIds or batchId must be provided for bulk account creation.");
        }

        int createdCount = 0;
        int skippedCount = 0;

        for (Student student : targets) {
            if (student.getUser() != null) {
                skippedCount++;
                continue;
            }

            if (student.getEmail() == null || student.getEmail().isBlank()) {
                skippedCount++;
                continue;
            }

            String normalizedEmail = student.getEmail().trim().toLowerCase();
            if (userRepository.existsByEmail(normalizedEmail)) {
                skippedCount++;
                continue;
            }

            try {
                User user = User.builder()
                        .email(normalizedEmail)
                        .fullName(student.getFullName())
                        .role(Role.STUDENT)
                        .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .isActive(true)
                        .mustChangePassword(true)
                        .build();

                User savedUser = userRepository.save(user);
                student.setUser(savedUser);
                studentRepository.save(student);

                String rawToken = generateSecureToken();
                String tokenHash = hashToken(rawToken);

                AccountActivationToken token = AccountActivationToken.builder()
                        .user(savedUser)
                        .tokenHash(tokenHash)
                        .purpose(TokenPurpose.ACTIVATION)
                        .expiresAt(OffsetDateTime.now().plusHours(24))
                        .build();
                tokenRepository.save(token);

                emailService.sendActivationEmail(normalizedEmail, student.getFullName(), rawToken);
                createdCount++;
            } catch (Exception e) {
                skippedCount++;
            }
        }

        auditLogService.logAction("StudentAccount", null, "STUDENT_ACCOUNT_BULK_CREATE", null, Map.of(
                "batchId", batchId != null ? batchId.toString() : "N/A",
                "labGroupId", labGroupId != null ? labGroupId.toString() : "N/A",
                "createdCount", createdCount,
                "skippedCount", skippedCount
        ));

        return Map.of(
                "createdCount", createdCount,
                "skippedCount", skippedCount,
                "totalTargeted", targets.size()
        );
    }

    public void activateAccount(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new BadRequestException("Invalid or missing activation token.");
        }

        validatePasswordStrength(newPassword);

        String tokenHash = hashToken(rawToken.trim());
        AccountActivationToken token = tokenRepository.findByTokenHashAndPurpose(tokenHash, TokenPurpose.ACTIVATION)
                .orElseThrow(() -> new BadRequestException("Invalid, expired, or already used activation link."));

        if (token.isExpired() || token.isUsed()) {
            throw new BadRequestException("Invalid, expired, or already used activation link.");
        }

        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setIsActive(true);
        user.setMustChangePassword(false);
        userRepository.save(user);

        token.setUsedAt(OffsetDateTime.now());
        tokenRepository.save(token);

        // Invalidate any other activation tokens for this user
        tokenRepository.invalidateUnusedTokens(user.getId(), TokenPurpose.ACTIVATION, OffsetDateTime.now());
    }

    public void forgotPassword(String email) {
        if (email == null || email.isBlank()) {
            return; // Generic response regardless
        }

        String normalizedEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getRole() == Role.STUDENT && Boolean.TRUE.equals(user.getIsActive())) {
                // Invalidate prior unused reset tokens
                tokenRepository.invalidateUnusedTokens(user.getId(), TokenPurpose.PASSWORD_RESET, OffsetDateTime.now());

                String rawToken = generateSecureToken();
                String tokenHash = hashToken(rawToken);

                AccountActivationToken token = AccountActivationToken.builder()
                        .user(user)
                        .tokenHash(tokenHash)
                        .purpose(TokenPurpose.PASSWORD_RESET)
                        .expiresAt(OffsetDateTime.now().plusHours(24))
                        .build();
                tokenRepository.save(token);

                emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), rawToken);
            }
        }
    }

    public void resetPassword(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new BadRequestException("Invalid or missing password reset token.");
        }

        validatePasswordStrength(newPassword);

        String tokenHash = hashToken(rawToken.trim());
        AccountActivationToken token = tokenRepository.findByTokenHashAndPurpose(tokenHash, TokenPurpose.PASSWORD_RESET)
                .orElseThrow(() -> new BadRequestException("Invalid, expired, or already used password reset link."));

        if (token.isExpired() || token.isUsed()) {
            throw new BadRequestException("Invalid, expired, or already used password reset link.");
        }

        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setIsActive(true);
        user.setMustChangePassword(false);
        userRepository.save(user);

        token.setUsedAt(OffsetDateTime.now());
        tokenRepository.save(token);

        tokenRepository.invalidateUnusedTokens(user.getId(), TokenPurpose.PASSWORD_RESET, OffsetDateTime.now());
    }

    public void validatePasswordStrength(String password) {
        if (password == null || !PASSWORD_PATTERN.matcher(password).matches()) {
            throw new BadRequestException("Password must be between 8 and 100 characters and contain at least one uppercase letter, one lowercase letter, one digit, and one special character.");
        }
    }

    public static String generateSecureToken() {
        byte[] randomBytes = new byte[32];
        new SecureRandom().nextBytes(randomBytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : randomBytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    public static String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.trim().getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    private StudentResponse mapToStudentResponse(Student s) {
        User u = s.getUser();
        String status = "NO_ACCOUNT";
        if (u != null) {
            if (!Boolean.TRUE.equals(u.getIsActive())) {
                status = "DEACTIVATED";
            } else if (Boolean.TRUE.equals(u.getMustChangePassword())) {
                status = "PENDING_ACTIVATION";
            } else {
                status = "ACTIVE";
            }
        }

        return StudentResponse.builder()
                .id(s.getId())
                .studentId(s.getStudentId())
                .title(s.getTitle())
                .fullName(s.getFullName())
                .email(s.getEmail())
                .personalEmail(s.getPersonalEmail())
                .offeredBy(s.getOfferedBy())
                .degreeProgrammeId(s.getDegreeProgramme() != null ? s.getDegreeProgramme().getId() : null)
                .degreeProgrammeCode(s.getDegreeProgramme() != null ? s.getDegreeProgramme().getCode() : null)
                .degreeProgrammeName(s.getDegreeProgramme() != null ? s.getDegreeProgramme().getName() : null)
                .batchId(s.getBatch() != null ? s.getBatch().getId() : null)
                .batchCode(s.getBatch() != null ? s.getBatch().getBatchCode() : null)
                .batchAcademicYear(s.getBatch() != null ? s.getBatch().getAcademicYear() : null)
                .labGroupId(s.getLabGroup() != null ? s.getLabGroup().getId() : null)
                .labGroupName(s.getLabGroup() != null ? s.getLabGroup().getGroupName() : null)
                .qrTokenHash(s.getQrTokenHash())
                .hasQrToken(s.getQrTokenHash() != null && !s.getQrTokenHash().isBlank())
                .qrVersion(s.getQrVersion())
                .qrGeneratedAt(s.getQrGeneratedAt())
                .isActive(s.getIsActive())
                .hasAccount(u != null)
                .accountUserId(u != null ? u.getId() : null)
                .isAccountActive(u != null ? u.getIsActive() : null)
                .accountStatus(status)
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
