package com.carebridge.controller;

import com.carebridge.entity.Therapist;
import com.carebridge.repository.TherapistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/therapist")
@RequiredArgsConstructor
public class TherapistController {

    private final TherapistRepository therapistRepository;

    @GetMapping("/profile")
    public Therapist getProfile(@RequestParam String email) {
        return therapistRepository.findByEmail(email).orElse(null);
    }

    @PutMapping("/profile")
    public Therapist updateProfile(@RequestParam String email, @RequestBody Therapist updates) {
        return therapistRepository.findByEmail(email).map(therapist -> {
            if (updates.getName() != null) therapist.setName(updates.getName());
            if (updates.getPhone() != null) therapist.setPhone(updates.getPhone());
            if (updates.getSpecialization() != null) {
                therapist.setSpecialization(updates.getSpecialization());
            }
            if (updates.getLocation() != null) therapist.setLocation(updates.getLocation());
            if (updates.getLatitude() != null) therapist.setLatitude(updates.getLatitude());
            if (updates.getLongitude() != null) therapist.setLongitude(updates.getLongitude());
            return therapistRepository.save(therapist);
        }).orElse(null);
    }

    @GetMapping
    public List<Therapist> getAll() {
        return therapistRepository.findAll();
    }
}
