package com.carebridge.service;

import com.carebridge.dto.LoginRequest;
import com.carebridge.dto.RegisterRequest;
import com.carebridge.entity.Hospital;
import com.carebridge.entity.Therapist;
import com.carebridge.entity.User;
import com.carebridge.entity.UserRole;
import com.carebridge.repository.HospitalRepository;
import com.carebridge.repository.TherapistRepository;
import com.carebridge.repository.UserRepository;
import com.carebridge.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TherapistRepository therapistRepository;
    private final HospitalRepository hospitalRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // ✅ REGISTER USER
    public String register(RegisterRequest request) {

        // 🔹 Check if email already exists
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        // 🔹 Create new user with encoded password
        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(user);
        createRoleSpecificProfile(request);

        return "User registered successfully";
    }

    // ✅ LOGIN USER
    public String login(LoginRequest request) {

        // 🔹 Find user by email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() ->
                        new RuntimeException("Invalid email or password"));

        // 🔹 Match password (bcrypt)
        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPasswordHash())) {

            throw new RuntimeException("Invalid email or password");
        }

        // 🔹 Generate JWT token
        return jwtUtil.generateToken(user.getEmail());
    }

    private void createRoleSpecificProfile(RegisterRequest request) {
        String specialization = request.getSpecialization();
        boolean isSpecializedRole = request.getRole() == UserRole.THERAPIST || request.getRole() == UserRole.HOSPITAL;
        if (isSpecializedRole && !StringUtils.hasText(specialization)) {
            throw new RuntimeException("Specialization is required for therapist and hospital registration");
        }

        if (request.getRole() == UserRole.THERAPIST) {
            Therapist therapist = new Therapist();
            therapist.setName(request.getFullName());
            therapist.setEmail(request.getEmail());
            therapist.setSpecialization(specialization);
            therapist.setRating(0.0);
            therapistRepository.save(therapist);
        } else if (request.getRole() == UserRole.HOSPITAL) {
            Hospital hospital = new Hospital();
            hospital.setName(request.getFullName());
            hospital.setEmail(request.getEmail());
            hospital.setLocation("Unknown");
            hospital.setSpecialization(specialization);
            hospital.setRating(0.0);
            hospitalRepository.save(hospital);
        }
    }
}
