package com.carebridge.service;

import com.carebridge.entity.PatientProfile;
import com.carebridge.repository.PatientProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PatientProfileService {

    private final PatientProfileRepository repository;

    public PatientProfile saveProfile(PatientProfile profile) {
        return repository.save(profile);
    }

    public PatientProfile getProfile(Long id) {
        return repository.findById(id).orElse(null);
    }
}