package com.carebridge.controller;

import com.carebridge.entity.Hospital;
import com.carebridge.repository.HospitalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hospital")
@RequiredArgsConstructor
public class HospitalController {

    private final HospitalRepository hospitalRepository;

    @GetMapping("/profile")
    public Hospital getProfile(@RequestParam String email) {
        return hospitalRepository.findByEmail(email).orElse(null);
    }

    @PutMapping("/profile")
    public Hospital updateProfile(@RequestParam String email, @RequestBody Hospital updates) {
        return hospitalRepository.findByEmail(email).map(hospital -> {
            if (updates.getName() != null) hospital.setName(updates.getName());
            if (updates.getPhone() != null) hospital.setPhone(updates.getPhone());
            if (updates.getSpecialization() != null) hospital.setSpecialization(updates.getSpecialization());
            if (updates.getLocation() != null) hospital.setLocation(updates.getLocation());
            if (updates.getLatitude() != null) hospital.setLatitude(updates.getLatitude());
            if (updates.getLongitude() != null) hospital.setLongitude(updates.getLongitude());
            return hospitalRepository.save(hospital);
        }).orElse(null);
    }

    @GetMapping
    public List<Hospital> getAll() {
        return hospitalRepository.findAll();
    }
}
