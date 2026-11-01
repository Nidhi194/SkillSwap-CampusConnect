package com.skillswap.campus.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import com.skillswap.campus.entity.UserRole;
import com.skillswap.campus.dao.UserDAO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Stateless HMAC-signed tokens: base64url(id:role:expiryEpochSec:tokenVersion) + "." + base64url(hmac).
 * Tokens expire after a TTL and stay valid across restarts when app.auth.secret is configured.
 * The database-backed token version invalidates all older tokens after logout or deletion.
 */
@Service
public class AuthTokenService {
    private static final Logger log = LoggerFactory.getLogger(AuthTokenService.class);
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final byte[] secret;
    private final long ttlSeconds;
    private final UserDAO userDAO;

    public AuthTokenService(@Value("${app.auth.secret:}") String configuredSecret,
                            @Value("${app.auth.token-ttl-hours:12}") long ttlHours,
                            UserDAO userDAO) {
        if (configuredSecret == null || configuredSecret.isBlank()) {
            byte[] random = new byte[48];
            new SecureRandom().nextBytes(random);
            this.secret = random;
            log.warn("AUTH_SECRET not set: generated a random signing key. All logins reset on restart.");
        } else {
            this.secret = configuredSecret.getBytes(StandardCharsets.UTF_8);
        }
        this.ttlSeconds = Duration.ofHours(Math.max(1, ttlHours)).toSeconds();
        this.userDAO = userDAO;
    }

    public String issue(AuthUser user) {
        long expiry = now() + ttlSeconds;
        String payload = ENCODER.encodeToString((user.id() + ":" + user.role().name() + ":" + expiry + ":" + user.tokenVersion()).getBytes(StandardCharsets.UTF_8));
        return payload + "." + sign(payload);
    }

    public AuthUser find(String token) {
        if (token == null) return null;
        int dot = token.indexOf('.');
        if (dot <= 0) return null;
        String payload = token.substring(0, dot);
        byte[] expected = sign(payload).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, token.substring(dot + 1).getBytes(StandardCharsets.UTF_8))) return null;
        try {
            String[] parts = new String(DECODER.decode(payload), StandardCharsets.UTF_8).split(":");
            if (parts.length != 4 || Long.parseLong(parts[2]) < now()) return null;
            Long id = Long.valueOf(parts[0]);
            long tokenVersion = Long.parseLong(parts[3]);
            return userDAO.findById(id)
                    .filter(user -> user.getTokenVersion() == tokenVersion)
                    .map(user -> new AuthUser(id, UserRole.valueOf(parts[1]), tokenVersion))
                    .orElse(null);
        } catch (IllegalArgumentException exception) {
            return null;
        }
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
