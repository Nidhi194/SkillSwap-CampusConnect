package com.skillswap.campus.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import com.skillswap.campus.entity.UserRole;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Stateless HMAC-signed tokens: base64url(id:role:expiryEpochSec) + "." + base64url(hmac).
 * Tokens expire after a TTL and stay valid across restarts when app.auth.secret is configured.
 * Revoked tokens (logout) are kept in memory only until they would have expired anyway.
 */
@Service
public class AuthTokenService {
    private static final Logger log = LoggerFactory.getLogger(AuthTokenService.class);
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final byte[] secret;
    private final long ttlSeconds;
    private final Map<String, Long> revokedTokens = new ConcurrentHashMap<>();
    private final Set<Long> removedUsers = ConcurrentHashMap.newKeySet();

    public AuthTokenService(@Value("${app.auth.secret:}") String configuredSecret,
                            @Value("${app.auth.token-ttl-hours:12}") long ttlHours) {
        if (configuredSecret == null || configuredSecret.isBlank()) {
            byte[] random = new byte[48];
            new SecureRandom().nextBytes(random);
            this.secret = random;
            log.warn("AUTH_SECRET not set: generated a random signing key. All logins reset on restart.");
        } else {
            this.secret = configuredSecret.getBytes(StandardCharsets.UTF_8);
        }
        this.ttlSeconds = Duration.ofHours(Math.max(1, ttlHours)).toSeconds();
    }

    public String issue(AuthUser user) {
        purgeRevoked();
        long expiry = now() + ttlSeconds;
        String payload = ENCODER.encodeToString((user.id() + ":" + user.role().name() + ":" + expiry).getBytes(StandardCharsets.UTF_8));
        return payload + "." + sign(payload);
    }

    public AuthUser find(String token) {
        if (token == null || revokedTokens.containsKey(token)) return null;
        int dot = token.indexOf('.');
        if (dot <= 0) return null;
        String payload = token.substring(0, dot);
        byte[] expected = sign(payload).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, token.substring(dot + 1).getBytes(StandardCharsets.UTF_8))) return null;
        try {
            String[] parts = new String(DECODER.decode(payload), StandardCharsets.UTF_8).split(":");
            if (parts.length != 3 || Long.parseLong(parts[2]) < now()) return null;
            Long id = Long.valueOf(parts[0]);
            if (removedUsers.contains(id)) return null;
            return new AuthUser(id, UserRole.valueOf(parts[1]));
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    public void revoke(String token) {
        if (token == null || token.isBlank()) return;
        revokedTokens.put(token, now() + ttlSeconds);
        purgeRevoked();
    }

    /** Invalidate every token of a deleted account. */
    public void revokeUser(Long userId) {
        if (userId != null) removedUsers.add(userId);
    }

    private void purgeRevoked() {
        long now = now();
        revokedTokens.values().removeIf(expiry -> expiry < now);
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return ENCODER.encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException exception) {
            throw new IllegalStateException("Cannot sign token", exception);
        }
    }

    private static long now() {
        return System.currentTimeMillis() / 1000;
    }
}
