package com.labattend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Thread-safe in-memory sliding-window rate limiter for brute-force protection
 * on login and flooding protection on QR scan endpoints.
 */
@Service
public class RateLimiterService {

    @Value("${app.rate-limiting.enabled:true}")
    private boolean enabled;

    @Value("${app.rate-limiting.login.max-requests:10}")
    private int loginMaxRequests;

    @Value("${app.rate-limiting.login.window-seconds:60}")
    private int loginWindowSeconds;

    @Value("${app.rate-limiting.scan.max-requests:120}")
    private int scanMaxRequests;

    @Value("${app.rate-limiting.scan.window-seconds:60}")
    private int scanWindowSeconds;

    private final ConcurrentHashMap<String, WindowCounter> loginBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, WindowCounter> scanBuckets = new ConcurrentHashMap<>();

    public boolean isLoginAllowed(String clientIp) {
        if (!enabled) {
            return true;
        }
        return isAllowed(loginBuckets, clientIp, loginMaxRequests, loginWindowSeconds);
    }

    public boolean isScanAllowed(String sessionOrUserId) {
        if (!enabled) {
            return true;
        }
        return isAllowed(scanBuckets, sessionOrUserId, scanMaxRequests, scanWindowSeconds);
    }

    private boolean isAllowed(ConcurrentHashMap<String, WindowCounter> buckets, String key, int maxRequests, int windowSeconds) {
        long now = Instant.now().getEpochSecond();
        long windowStart = now - windowSeconds;

        // Clean up or retrieve counter
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
        loginBuckets.clear();
        scanBuckets.clear();
    }

    private static class WindowCounter {
        final long lastResetEpochSecond;
        final AtomicInteger count;

        WindowCounter(long epochSecond, int initialCount) {
            this.lastResetEpochSecond = epochSecond;
            this.count = new AtomicInteger(initialCount);
        }
    }
}
