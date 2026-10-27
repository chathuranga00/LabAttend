package com.labattend.config;

import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminBootstrapConfig {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapConfig.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.admin-email:admin@labattend.local}")
    private String initialAdminEmail;

    @Value("${app.bootstrap.admin-password:Admin@123456}")
    private String initialAdminPassword;

    @Value("${app.bootstrap.admin-name:System Administrator}")
    private String initialAdminName;

    public AdminBootstrapConfig(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void bootstrapFirstAdmin() {
        long adminCount = userRepository.countByRole(Role.ADMIN);

        if (adminCount == 0) {
            log.info("[BOOTSTRAP] No existing administrator accounts detected. Initializing first-admin...");

            User adminUser = User.builder()
                    .email(initialAdminEmail.trim().toLowerCase())
                    .passwordHash(passwordEncoder.encode(initialAdminPassword))
                    .fullName(initialAdminName.trim())
                    .role(Role.ADMIN)
                    .isActive(true)
                    .build();

            userRepository.save(adminUser);
            log.info("[BOOTSTRAP] Initial administrator account successfully created with email: '{}'. (Password configured from environment)", initialAdminEmail);
        } else {
            log.info("[BOOTSTRAP] Administrator accounts exist (count: {}). First-admin bootstrap skipped.", adminCount);
        }
    }
}
