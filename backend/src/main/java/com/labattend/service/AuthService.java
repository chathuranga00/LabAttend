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

    public AuthService(UserRepository userRepository,
                       LecturerRepository lecturerRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.lecturerRepository = lecturerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BadCredentialsException("Email or password is incorrect."));

        // Generic error message if deactivated or invalid password to prevent user enumeration
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadCredentialsException("Email or password is incorrect.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Email or password is incorrect.");
        }

        String token = jwtService.generateToken(user);
        UserSummaryDto userSummary = buildUserSummary(user);

        return LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationMs())
                .user(userSummary)
                .build();
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
                .staffId(staffId)
                .department(department)
                .build();
    }
}
