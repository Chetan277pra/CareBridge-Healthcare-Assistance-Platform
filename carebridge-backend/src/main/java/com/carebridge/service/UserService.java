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
import java.util.List;
import java.util.stream.Collectors;

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
            .location(request.getLocation())
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
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
        List<String> specializations = request.getSpecializations() == null
                ? List.of()
                : request.getSpecializations().stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .collect(Collectors.toList());

        String specialization = String.join(", ", specializations);
        boolean isSpecializedRole = request.getRole() == UserRole.THERAPIST || request.getRole() == UserRole.HOSPITAL;
        if (isSpecializedRole && specializations.isEmpty()) {
            throw new RuntimeException("At least one specialization is required for therapist and hospital registration");
        }

        if (request.getRole() == UserRole.THERAPIST) {
            if (Boolean.FALSE.equals(request.getFreelancing()) && request.getAffiliatedHospitalId() == null) {
                throw new RuntimeException("Please select a hospital or choose freelancing");
            }

            if (request.getAffiliatedHospitalId() != null &&
                    hospitalRepository.findById(request.getAffiliatedHospitalId()).isEmpty()) {
                throw new RuntimeException("Selected hospital does not exist");
            }

            Therapist therapist = new Therapist();
            therapist.setName(request.getFullName());
            therapist.setEmail(request.getEmail());
            therapist.setPhone(request.getPhone());
            therapist.setSpecialization(specialization);
            therapist.setAffiliatedHospitalId(request.getAffiliatedHospitalId());
            therapist.setFreelancing(request.getFreelancing() == null || request.getFreelancing());
            therapist.setLocation(request.getLocation());
            therapist.setLatitude(request.getLatitude());
            therapist.setLongitude(request.getLongitude());
            therapist.setRating(0.0);
            therapistRepository.save(therapist);
        } else if (request.getRole() == UserRole.HOSPITAL) {
            Hospital hospital = new Hospital();
            hospital.setName(request.getFullName());
            hospital.setEmail(request.getEmail());
            hospital.setPhone(request.getPhone());
            hospital.setLocation(request.getLocation());
            hospital.setSpecialization(specialization);
            hospital.setLatitude(request.getLatitude());
            hospital.setLongitude(request.getLongitude());
            hospital.setRating(0.0);
            hospitalRepository.save(hospital);
        }
    }
}
