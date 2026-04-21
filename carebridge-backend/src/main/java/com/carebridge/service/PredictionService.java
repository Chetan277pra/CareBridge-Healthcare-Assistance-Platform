package com.carebridge.service;

import com.carebridge.dto.PredictionRequest;
import com.carebridge.dto.PredictionResponse;
import com.carebridge.entity.Hospital;
import com.carebridge.entity.Therapist;
import com.carebridge.repository.HospitalRepository;
import com.carebridge.repository.TherapistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class PredictionService {

    private final RestTemplate restTemplate;
    private final TherapistRepository therapistRepository;
    private final HospitalRepository hospitalRepository;
    
    @Value("${ml.service.base-url:http://localhost:8000}")
    private String mlServiceBaseUrl;

    public PredictionResponse getPrediction(PredictionRequest request) {

        ResponseEntity<PredictionResponse> response =
                restTemplate.postForEntity(
                        mlServiceBaseUrl + "/predict",
                        request,
                        PredictionResponse.class
                );

        PredictionResponse result = response.getBody();

        if (result == null || result.getDisease() == null) {
            throw new RuntimeException("Invalid response from ML service");
        }

        // Keep patient coordinates from request so frontend can compute distances correctly.
        result.setPatientLatitude(request.getLatitude());
        result.setPatientLongitude(request.getLongitude());

        // Fetch therapist from DB based on disease
        Therapist therapist = fetchBestTherapist(result.getDisease());
        if (therapist != null) {
            result.setTherapistName(therapist.getName());
            result.setTherapistLatitude(therapist.getLatitude());
            result.setTherapistLongitude(therapist.getLongitude());
        } else {
            result.setTherapistName("No specialist available");
        }

        // Fetch hospital from DB based on disease
        Hospital hospital = fetchBestHospital(result.getDisease());
        if (hospital != null) {
            result.setHospitalSuggestion(hospital.getName());
            result.setHospitalAddress(hospital.getLocation());
            result.setHospitalLatitude(hospital.getLatitude());
            result.setHospitalLongitude(hospital.getLongitude());
        } else {
            result.setHospitalSuggestion("No hospital available");
        }

        return result;
    }

    private Therapist fetchBestTherapist(String disease) {
        // Try exact match first
        Therapist therapist = therapistRepository
                .findTopBySpecializationIgnoreCaseOrderByRatingDesc(disease)
                .orElse(null);
        
        // If no exact match, try containing match
        if (therapist == null) {
            therapist = therapistRepository
                    .findTopBySpecializationContainingIgnoreCaseOrderByRatingDesc(disease)
                    .orElse(null);
        }
        
        return therapist;
    }

    private Hospital fetchBestHospital(String disease) {
        // Try exact match first
        Hospital hospital = hospitalRepository
                .findTopBySpecializationIgnoreCaseOrderByRatingDesc(disease)
                .orElse(null);
        
        // If no exact match, try containing match
        if (hospital == null) {
            hospital = hospitalRepository
                    .findTopBySpecializationContainingIgnoreCaseOrderByRatingDesc(disease)
                    .orElse(null);
        }
        
        return hospital;
    }
}