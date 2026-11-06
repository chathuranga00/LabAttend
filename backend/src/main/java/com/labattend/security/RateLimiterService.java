package com.labattend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Thread-safe sliding-window rate limiter and failed-attempt lockout service:
 * - Separate staff login (POST /api/auth/staff/login) by IP and by account
 * - Separate student login (POST /api/auth/student/login) by IP and by account
 * - Public student actions (activate, forgot-password, reset-password) by IP
 * - Failed-attempt backoff and lockout per account and endpoint
 */
@Service
public class RateLimiterService {

    @Value("${app.rate-limiting.enabled:true}")
    private boolean enabled;

    @Value("${app.rate-limiting.login.max-requests:10}")
    private int loginMaxRequests;

    @Value("${app.rate-limiting.login.window-seconds:60}")
    private int loginWindowSeconds;

    @Value("${app.rate-limiting.student-action.max-requests:10}")
    private int studentActionMaxRequests;

    @Value("${app.rate-limiting.student-action.window-seconds:60}")
    private int studentActionWindowSeconds;

    @Value("${app.rate-limiting.account-lockout.max-failed-attempts:5}")
    private int maxFailedAttempts;

    @Value("${app.rate-limiting.account-lockout.lockout-seconds:300}")
    private int lockoutSeconds;

    @Value("${app.rate-limiting.scan.max-requests:120}")
    private int scanMaxRequests;

    @Value("${app.rate-limiting.scan.window-seconds:60}")
    private int scanWindowSeconds;

    @Value("${app.rate-limiting.bulk-qr.max-requests:30}")
    private int bulkQrMaxRequests;

    @Value("${app.rate-limiting.bulk-qr.window-seconds:60}")
    private int bulkQrWindowSeconds;

    private final ConcurrentHashMap<String, WindowCounter> staffLoginIpBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, WindowCounter> studentLoginIpBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, WindowCounter> studentActionIpBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, WindowCounter> legacyLoginBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, WindowCounter> scanBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, WindowCounter> bulkQrBuckets = new ConcurrentHashMap<>();

    // Account-level tracking (failed attempts and lockout timestamp)
    private final ConcurrentHashMap<String, AccountLockoutInfo> accountLockouts = new ConcurrentHashMap<>();

    public boolean isStaffLoginAllowed(String clientIp, String email) {
        if (!enabled) return true;
        if (isAccountLocked(email, "STAFF")) return false;
        return isAllowed(staffLoginIpBuckets, clientIp, loginMaxRequests, loginWindowSeconds);
    }

    public boolean isStudentLoginAllowed(String clientIp, String email) {
        if (!enabled) return true;
        if (isAccountLocked(email, "STUDENT")) return false;
        return isAllowed(studentLoginIpBuckets, clientIp, loginMaxRequests, loginWindowSeconds);
    }

    public boolean isStudentActionAllowed(String clientIp) {
        if (!enabled) return true;
        return isAllowed(studentActionIpBuckets, clientIp, studentActionMaxRequests, studentActionWindowSeconds);
    }

    public boolean isLoginAllowed(String clientIp) {
        if (!enabled) return true;
        return isAllowed(legacyLoginBuckets, clientIp, loginMaxRequests, loginWindowSeconds);
    }

    public boolean isScanAllowed(String sessionOrUserId) {
        if (!enabled) return true;
        return isAllowed(scanBuckets, sessionOrUserId, scanMaxRequests, scanWindowSeconds);
    }

    public boolean isBulkQrAllowed(String clientIp) {
        if (!enabled) return true;
        return isAllowed(bulkQrBuckets, clientIp, bulkQrMaxRequests, bulkQrWindowSeconds);
    }

    public boolean isAccountLocked(String email, String endpointType) {
        if (!enabled || email == null || email.isBlank()) return false;
        String key = endpointType + ":" + email.trim().toLowerCase();
        AccountLockoutInfo info = accountLockouts.get(key);
        if (info == null) return false;

        long now = Instant.now().getEpochSecond();
        if (info.lockedUntilEpochSecond > now) {
            return true;
        } else if (info.lockedUntilEpochSecond > 0 && info.lockedUntilEpochSecond <= now) {
            // Lockout expired, clear
            accountLockouts.remove(key);
            return false;
        }
        return false;
    }

    public void recordFailedAttempt(String email, String endpointType) {
        if (!enabled || email == null || email.isBlank()) return;
        String key = endpointType + ":" + email.trim().toLowerCase();
        long now = Instant.now().getEpochSecond();

        accountLockouts.compute(key, (k, existing) -> {
            if (existing == null) {
                return new AccountLockoutInfo(1, 0);
            }
            int newCount = existing.consecutiveFailures.incrementAndGet();
            if (newCount >= maxFailedAttempts) {
                existing.lockedUntilEpochSecond = now + lockoutSeconds;
            }
            return existing;
        });
    }

    public void recordSuccessfulLogin(String email, String endpointType) {
        if (!enabled || email == null || email.isBlank()) return;
        String key = endpointType + ":" + email.trim().toLowerCase();
        accountLockouts.remove(key);
    }

    private boolean isAllowed(ConcurrentHashMap<String, WindowCounter> buckets, String key, int maxRequests, int windowSeconds) {
        if (key == null) return true;
        long now = Instant.now().getEpochSecond();
        long windowStart = now - windowSeconds;

        WindowCounter counter = buckets.compute(key, (k, existing) -> {
            if (existing == null || existing.lastResetEpochSecond < windowStart) {
                return new WindowCounter(now, 1);
            }
            existing.count.incrementAndGet();
            return existing;
        });

        return counter.count.get() <= maxRequests;
    }

    public void reset() {
        staffLoginIpBuckets.clear();
        studentLoginIpBuckets.clear();
        studentActionIpBuckets.clear();
        legacyLoginBuckets.clear();
        scanBuckets.clear();
        bulkQrBuckets.clear();
        accountLockouts.clear();
    }

    private static class WindowCounter {
        final long lastResetEpochSecond;
        final AtomicInteger count;

        WindowCounter(long epochSecond, int initialCount) {
            this.lastResetEpochSecond = epochSecond;
            this.count = new AtomicInteger(initialCount);
        }
    }

    private static class AccountLockoutInfo {
        final AtomicInteger consecutiveFailures;
        volatile long lockedUntilEpochSecond;

        AccountLockoutInfo(int initialFailures, long lockedUntilEpochSecond) {
            this.consecutiveFailures = new AtomicInteger(initialFailures);
            this.lockedUntilEpochSecond = lockedUntilEpochSecond;
        }
    }
}
