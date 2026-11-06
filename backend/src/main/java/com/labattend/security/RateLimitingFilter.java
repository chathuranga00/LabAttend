package com.labattend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labattend.dto.response.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.OffsetDateTime;

/**
 * Security filter enforcing rate limits on sensitive endpoints:
 * - Staff login (POST /api/auth/staff/login)
 * - Student login (POST /api/auth/student/login)
 * - Student public actions (activate, forgot-password, reset-password)
 * - Attendance scan (POST /api/lecturer/sessions/{id}/scan)
 * - Bulk QR export (GET /api/admin/students/qr/bulk)
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;
    private final ObjectMapper objectMapper;

    public RateLimitingFilter(RateLimiterService rateLimiterService, ObjectMapper objectMapper) {
        this.rateLimiterService = rateLimiterService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        // 1. Staff Login Rate Limiting (POST /api/auth/staff/login or legacy /api/auth/login)
        if ("POST".equalsIgnoreCase(method) && (path.endsWith("/api/auth/staff/login") || path.endsWith("/api/auth/login"))) {
            String clientIp = extractClientIp(request);
            if (!rateLimiterService.isStaffLoginAllowed(clientIp, null)) {
                writeTooManyRequestsResponse(response, path, "Too many login attempts. Please try again after 1 minute.");
                return;
            }
        }

        // 2. Student Login Rate Limiting (POST /api/auth/student/login)
        if ("POST".equalsIgnoreCase(method) && path.endsWith("/api/auth/student/login")) {
            String clientIp = extractClientIp(request);
            if (!rateLimiterService.isStudentLoginAllowed(clientIp, null)) {
                writeTooManyRequestsResponse(response, path, "Too many login attempts. Please try again after 1 minute.");
                return;
            }
        }

        // 3. Student Actions Rate Limiting (activate, forgot-password, reset-password, change-password)
        if ("POST".equalsIgnoreCase(method) && (
                path.endsWith("/api/auth/student/activate") ||
                path.endsWith("/api/auth/student/forgot-password") ||
                path.endsWith("/api/auth/student/reset-password") ||
                path.endsWith("/api/student/change-password")
        )) {
            String clientIp = extractClientIp(request);
            if (!rateLimiterService.isStudentActionAllowed(clientIp)) {
                writeTooManyRequestsResponse(response, path, "Action rate limit exceeded. Please wait a moment before trying again.");
                return;
            }
        }

        // 4. Attendance Scan Rate Limiting (POST /api/lecturer/sessions/{id}/scan)
        if ("POST".equalsIgnoreCase(method) && path.contains("/api/lecturer/sessions/") && path.endsWith("/scan")) {
            String clientIp = extractClientIp(request);
            if (!rateLimiterService.isScanAllowed(path + ":" + clientIp)) {
                writeTooManyRequestsResponse(response, path, "Scan rate limit exceeded. Please wait a moment before scanning again.");
                return;
            }
        }

        // 5. Bulk QR Generation Rate Limiting (GET /api/admin/students/qr/bulk)
        if ("GET".equalsIgnoreCase(method) && path.endsWith("/api/admin/students/qr/bulk")) {
            String clientIp = extractClientIp(request);
            if (!rateLimiterService.isBulkQrAllowed(clientIp)) {
                writeTooManyRequestsResponse(response, path, "Bulk QR export rate limit exceeded. Please wait a moment before trying again.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isBlank()) {
            return xfHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    private void writeTooManyRequestsResponse(HttpServletResponse response, String path, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                .error(HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase())
                .message(message)
                .path(path)
                .timestamp(OffsetDateTime.now())
                .build();

        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}
