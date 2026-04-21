package com.carebridge.service;

import com.carebridge.entity.Therapist;
import com.carebridge.repository.TherapistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TherapistService {

    private final TherapistRepository repository;

    public Therapist getBestTherapist(String issue) {
        return repository
                .findTopBySpecializationIgnoreCaseOrderByRatingDesc(issue)
                .or(() -> repository.findTopBySpecializationContainingIgnoreCaseOrderByRatingDesc(issue))
                .orElse(null);
    }
}