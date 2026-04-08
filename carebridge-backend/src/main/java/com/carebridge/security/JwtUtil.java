package com.carebridge.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    // 🔐 MUST be at least 32 bytes for HS256
    private static final String SECRET =
            "carebridge-super-secret-key-1234567890";

    // ⏱ token validity (24 hours)
    private static final long JWT_EXPIRATION = 1000 * 60 * 60 * 24;

    // ==============================
    // 🔑 Signing key generator
    // ==============================
    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes());
    }

    // ==============================
    // ✅ Generate JWT
    // ==============================
    public String generateToken(String username) {
        return Jwts.builder()
                .subject(username) // 👈 who is the user
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + JWT_EXPIRATION))
                .signWith(getSigningKey())
                .compact();
    }

    // ==============================
    // ✅ Extract username from JWT
    // ==============================
    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    // ==============================
    // ✅ Validate JWT (VERY IMPORTANT)
    // ==============================
    public boolean validateToken(String token, String username) {
        final String extractedUsername = extractUsername(token);

        return extractedUsername.equals(username)
                && !isTokenExpired(token);
    }

    // ==============================
    // ⛔ Check token expiry
    // ==============================
    private boolean isTokenExpired(String token) {
        return extractAllClaims(token)
                .getExpiration()
                .before(new Date());
    }

    // ==============================
    // 📦 Extract all claims
    // ==============================
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith((SecretKey) getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}