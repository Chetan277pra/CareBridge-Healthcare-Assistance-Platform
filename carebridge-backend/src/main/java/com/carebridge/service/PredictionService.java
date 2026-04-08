package com.carebridge.service;

import com.carebridge.dto.PredictionRequest;
import com.carebridge.dto.PredictionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class PredictionService {

    private final RestTemplate restTemplate;
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

        // For now (until DB step)
        result.setTherapistName("Will be fetched from DB");
        result.setHospitalSuggestion("Will be fetched from DB");

        return result;
    }
}