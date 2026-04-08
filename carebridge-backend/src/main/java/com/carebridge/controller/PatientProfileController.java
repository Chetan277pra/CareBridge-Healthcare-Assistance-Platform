package com.carebridge.controller;

import com.carebridge.entity.PatientProfile;
import com.carebridge.service.PatientProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/patient")
@RequiredArgsConstructor
public class PatientProfileController {

    private final PatientProfileService service;

    @PostMapping("/profile")
    public PatientProfile saveProfile(@RequestBody PatientProfile profile) {
        return service.saveProfile(profile);
    }

    @GetMapping("/{id}")
    public PatientProfile getProfile(@PathVariable Long id) {
        return service.getProfile(id);
    }
}