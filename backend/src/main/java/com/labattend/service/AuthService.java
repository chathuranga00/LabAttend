package com.labattend.service;

import com.labattend.dto.request.LoginRequest;
import com.labattend.dto.response.LoginResponse;
import com.labattend.dto.response.UserSummaryDto;
import com.labattend.entity.Lecturer;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.LecturerRepository;
import com.labattend.repository.UserRepository;
import com.labattend.security.JwtService;
import com.labattend.security.RateLimiterService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final LecturerRepository lecturerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RateLimiterService rateLimiterService;

    // Fixed dummy hash to ensure constant-time response when user is not found
    private static final String DUMMY_HASH = "$2a$10$w8WzK8h5Z3xP3qN9n5M3r.O9i6jK7l8m9n0p1q2r3s4t5u6v7w8x9";

    public AuthService(UserRepository userRepository,
                       LecturerRepository lecturerRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       RateLimiterService rateLimiterService) {
        this.userRepository = userRepository;
        this.lecturerRepository = lecturerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.rateLimiterService = rateLimiterService;
    }

    /**
     * Staff Login: strictly ADMIN and LECTURER roles only.
     * Rejects STUDENT accounts with the exact same generic 401 message as wrong passwords.
     */
    @Transactional(readOnly = true)
    public LoginResponse staffLogin(LoginRequest request, String clientIp) {
        String normalizedEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";

        // Check rate limiter & account lockout
        if (!rateLimiterService.isStaffLoginAllowed(clientIp, normalizedEmail)) {
            throw new BadCredentialsException("Email or password is incorrect.");
        }

        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);
        if (userOpt.isEmpty()) {
            passwordEncoder.matches(request.getPassword(), DUMMY_HASH);
            rateLimiterService.recordFailedAttempt(normalizedEmail, "STAFF");
            throw new BadCredentialsException("Email or password is incorrect.");
        }

        User user = userOpt.get();
        boolean passwordMatches = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());
        boolean isStaffRole = user.getRole() == Role.ADMIN || user.getRole() == Role.LECTURER;
        boolean isActive = Boolean.TRUE.equals(user.getIsActive());

        if (!passwordMatches || !isStaffRole || !isActive) {
            rateLimiterService.recordFailedAttempt(normalizedEmail, "STAFF");
            throw new BadCredentialsException("Email or password is incorrect.");
        }

        rateLimiterService.recordSuccessfulLogin(normalizedEmail, "STAFF");
        return generateLoginResponse(user);
    }

    /**
     * Student Login: strictly STUDENT role only.
     * Rejects ADMIN and LECTURER accounts with the exact same generic 401 message as wrong passwords.
     */
    @Transactional(readOnly = true)
    public LoginResponse studentLogin(LoginRequest request, String clientIp) {
        String normalizedEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";

        // Check rate limiter & account lockout
        if (!rateLimiterService.isStudentLoginAllowed(clientIp, normalizedEmail)) {
            throw new BadCredentialsException("Email or password is incorrect.");
        }

        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);
        if (userOpt.isEmpty()) {
            passwordEncoder.matches(request.getPassword(), DUMMY_HASH);
            rateLimiterService.recordFailedAttempt(normalizedEmail, "STUDENT");
            throw new BadCredentialsException("Email or password is incorrect.");
        }

        User user = userOpt.get();
        boolean passwordMatches = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());
        boolean isStudentRole = user.getRole() == Role.STUDENT;
        boolean isActive = Boolean.TRUE.equals(user.getIsActive());

        if (!passwordMatches || !isStudentRole || !isActive) {
            rateLimiterService.recordFailedAttempt(normalizedEmail, "STUDENT");
            throw new BadCredentialsException("Email or password is incorrect.");
        }

        rateLimiterService.recordSuccessfulLogin(normalizedEmail, "STUDENT");
        return generateLoginResponse(user);
    }

    /**
     * Legacy login endpoint alias (defaults to staff login).
     */
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        return staffLogin(request, "unknown");
    }

    @Transactional(readOnly = true)
    public UserSummaryDto getCurrentUserProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadCredentialsException("Account is deactivated.");
        }

        return buildUserSummary(user);
    }

    private LoginResponse generateLoginResponse(User user) {
        String token = jwtService.generateToken(user);
        UserSummaryDto userSummary = buildUserSummary(user);

        return LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationMs())
                .user(userSummary)
                .build();
    }

    private UserSummaryDto buildUserSummary(User user) {
        String staffId = null;
        String department = null;

        if (user.getRole() == Role.LECTURER) {
            Optional<Lecturer> lecturerOpt = lecturerRepository.findByUserId(user.getId());
            if (lecturerOpt.isPresent()) {
                staffId = lecturerOpt.get().getStaffId();
                department = lecturerOpt.get().getDepartment();
            }
        }

        return UserSummaryDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .mustChangePassword(user.getMustChangePassword())
                .staffId(staffId)
                .department(department)
                .build();
    }
}
