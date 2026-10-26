package com.labattend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.labattend.entity.AuditLog;
import com.labattend.entity.User;
import com.labattend.repository.AuditLogRepository;
import com.labattend.repository.UserRepository;
import com.labattend.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public AuditLogService(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    /**
     * Records an immutable, insert-only audit log entry for write operations.
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public void logAction(String entityName, UUID entityId, String action, Object previousState, Object newState) {
        try {
            User performedByUser = resolveCurrentUser();
            String clientIp = resolveClientIp();

            Map<String, Object> detailsMap = new HashMap<>();
            detailsMap.put("previous", previousState);
            detailsMap.put("new", newState);

            String detailsJson = objectMapper.writeValueAsString(detailsMap);

            AuditLog auditLog = AuditLog.builder()
                    .entityName(entityName)
                    .entityId(entityId)
                    .action(action)
                    .performedBy(performedByUser)
                    .details(detailsJson)
                    .ipAddress(clientIp)
                    .timestamp(OffsetDateTime.now())
                    .build();

            auditLogRepository.save(auditLog);
            log.info("[AUDIT] Action: {} on Entity: {} (ID: {}) by User: {}", action, entityName, entityId,
                    performedByUser != null ? performedByUser.getEmail() : "SYSTEM");

        } catch (Exception e) {
            log.error("[AUDIT ERROR] Failed to record audit log for action: {} on entity: {}", action, entityName, e);
        }
    }

    private User resolveCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
                return userRepository.findById(userDetails.getId()).orElse(null);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private String resolveClientIp() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String xForwardedFor = request.getHeader("X-Forwarded-For");
                if (xForwardedFor != null && !xForwardedFor.isBlank()) {
                    return xForwardedFor.split(",")[0].trim();
                }
                return request.getRemoteAddr();
            }
        } catch (Exception ignored) {
        }
        return "127.0.0.1";
    }
}
