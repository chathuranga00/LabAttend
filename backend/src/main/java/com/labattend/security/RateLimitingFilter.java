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
 * - POST /api/auth/login (brute-force defense)
 * - POST /api/lecturer/sessions/{id}/scan (flooding / scanning abuse defense)
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

        // 1. Login Rate Limiting (POST /api/auth/login)
        if ("POST".equalsIgnoreCase(method) && path.endsWith("/api/auth/login")) {
            String clientIp = extractClientIp(request);
            if (!rateLimiterService.isLoginAllowed(clientIp)) {
                writeTooManyRequestsResponse(response, path, "Too many login attempts. Please try again after 1 minute.");
                return;
            }
        }

        // 2. Attendance Scan Rate Limiting (POST /api/lecturer/sessions/{id}/scan)
        if ("POST".equalsIgnoreCase(method) && path.contains("/api/lecturer/sessions/") && path.endsWith("/scan")) {
            String clientIp = extractClientIp(request);
            if (!rateLimiterService.isScanAllowed(path + ":" + clientIp)) {
                writeTooManyRequestsResponse(response, path, "Scan rate limit exceeded. Please wait a moment before scanning again.");
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
