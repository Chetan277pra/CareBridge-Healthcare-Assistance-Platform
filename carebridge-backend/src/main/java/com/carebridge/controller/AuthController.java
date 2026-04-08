package com.carebridge.controller;

import com.carebridge.dto.AuthResponse;
import com.carebridge.dto.LoginRequest;
import com.carebridge.dto.RegisterRequest;
import com.carebridge.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    // ✅ LOGIN
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @RequestBody LoginRequest request) {

        String token = userService.login(request);

        return ResponseEntity.ok(new AuthResponse(token));
    }

    // ✅ REGISTER
    @PostMapping("/register")
    public ResponseEntity<String> register(
            @RequestBody RegisterRequest request) {

        String message = userService.register(request);

        return ResponseEntity.ok(message);
    }
}