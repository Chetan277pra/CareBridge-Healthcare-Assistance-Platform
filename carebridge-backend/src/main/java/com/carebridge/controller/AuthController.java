package com.carebridge.controller;

import com.carebridge.dto.AuthResponse;
import com.carebridge.dto.LoginRequest;
import com.carebridge.dto.RegisterRequest;
import com.carebridge.dto.GoogleAuthRequest;
import com.carebridge.entity.User;
import com.carebridge.entity.UserRole;
import com.carebridge.repository.UserRepository;
import com.carebridge.security.JwtUtil;
import com.carebridge.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // ✅ LOGIN
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @RequestBody LoginRequest request) {

        String token = userService.login(request);

        return ResponseEntity.ok(new AuthResponse(token));
    }

    // ✅ CURRENT USER PROFILE
    @GetMapping("/me")
    public ResponseEntity<User> getMe() {
        Object principal = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username = principal instanceof org.springframework.security.core.userdetails.UserDetails ud ? ud.getUsername() : principal.toString();
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(user);
    }

    // ✅ REGISTER
    @PostMapping("/register")
    public ResponseEntity<String> register(
            @RequestBody RegisterRequest request) {

        String message = userService.register(request);

        return ResponseEntity.ok(message);
    }

    // ✅ GOOGLE AUTHENTICATION
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleAuthRequest request) {
        // 1. Verify token with Google API
        String googleVerifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + request.getIdToken();
        RestTemplate restTemplate = new RestTemplate();
        Map<String, Object> tokenInfo;
        try {
            tokenInfo = restTemplate.getForObject(googleVerifyUrl, Map.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google ID token");
        }

        if (tokenInfo == null || !tokenInfo.containsKey("email")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token payload");
        }

        String email = (String) tokenInfo.get("email");
        String name = (String) tokenInfo.get("name");
        Boolean emailVerified = Boolean.parseBoolean(String.valueOf(tokenInfo.get("email_verified")));

        if (!emailVerified) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google email not verified");
        }

        // 2. Load or Auto-Register User
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            // For Therapists & Hospitals, require them to sign up through standard registration flow first
            if (request.getRole() != UserRole.PATIENT) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                    "Account not found. Therapists and Hospitals must register a full profile first.");
            }

            // For Patients, auto-register them
            User newUser = User.builder()
                .fullName(name)
                .email(email)
                .phone("")
                .passwordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString())) // Random password hash
                .role(UserRole.PATIENT)
                .location("Not Specified")
                .latitude(40.7128) // Defaults
                .longitude(-74.0060)
                .createdAt(LocalDateTime.now())
                .build();
            return userRepository.save(newUser);
        });

        // 3. Generate application JWT
        String appToken = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return ResponseEntity.ok(new AuthResponse(appToken));
    }
}