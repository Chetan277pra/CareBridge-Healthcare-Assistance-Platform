package com.carebridge.service;

import com.carebridge.entity.Hospital;
import com.carebridge.repository.HospitalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HospitalService {

    private final HospitalRepository repository;

    public String recommendHospital(String disease) {
        Hospital hospital = repository
                .findTopBySpecializationIgnoreCaseOrderByRatingDesc(disease)
                .or(() -> repository.findTopBySpecializationContainingIgnoreCaseOrderByRatingDesc(disease))
                .orElseGet(repository::findTopByOrderByRatingDesc);
        return hospital != null ? hospital.getName() : "No hospital found";
    }

    public Hospital getBestHospital(String disease) {
        return repository
                .findTopBySpecializationIgnoreCaseOrderByRatingDesc(disease)
                .or(() -> repository.findTopBySpecializationContainingIgnoreCaseOrderByRatingDesc(disease))
                .orElseGet(repository::findTopByOrderByRatingDesc);
    }
}