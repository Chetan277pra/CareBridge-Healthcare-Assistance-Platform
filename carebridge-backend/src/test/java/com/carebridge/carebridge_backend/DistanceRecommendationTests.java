package com.carebridge.carebridge_backend;

import com.carebridge.dto.PredictionRequest;
import com.carebridge.dto.PredictionResponse;
import com.carebridge.entity.Hospital;
import com.carebridge.entity.Therapist;
import com.carebridge.repository.HospitalRepository;
import com.carebridge.repository.TherapistRepository;
import com.carebridge.service.PredictionService;
import com.carebridge.util.DistanceUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class DistanceRecommendationTests {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private TherapistRepository therapistRepository;

    @Mock
    private HospitalRepository hospitalRepository;

    @InjectMocks
    private PredictionService predictionService;

    @Test
    public void testDistanceUtils_calculateDistanceKm() {
        // Patient: 30.7333, 76.7794
        // Hospital: 30.7046, 76.7179
        // Expected: ~6.67 km
        double distance = DistanceUtils.calculateDistanceKm(30.7333, 76.7794, 30.7046, 76.7179);
        assertTrue(distance >= 6.0 && distance <= 8.0, "Distance should be between 6 and 8 km");
        assertEquals(6.67, distance, 0.05);

        // Test null handling
        assertNull(DistanceUtils.calculateDistanceKm(null, 76.7794, 30.7046, 76.7179));
    }

    @Test
    public void testScenario1_NearestHospitalSelected() {
        // Patient location: 30.0, 70.0
        // Hospital A: specialization "Depression", rating 4.1, distance 2 km (approx coordinates: 30.018, 70.0)
        // Hospital B: specialization "Depression", rating 4.9, distance 5 km (approx coordinates: 30.045, 70.0)
        Hospital a = Hospital.builder()
                .id(1L)
                .name("Hospital A")
                .specialization("Depression")
                .rating(4.1)
                .latitude(30.018)
                .longitude(70.0)
                .build();

        Hospital b = Hospital.builder()
                .id(2L)
                .name("Hospital B")
                .specialization("Depression")
                .rating(4.9)
                .latitude(30.045)
                .longitude(70.0)
                .build();

        when(hospitalRepository.findAllBySpecializationContainingIgnoreCase("Depression"))
                .thenReturn(Arrays.asList(a, b));
        when(therapistRepository.findAllBySpecializationContainingIgnoreCase("Depression"))
                .thenReturn(Collections.emptyList());

        // Mock ML prediction service response
        PredictionResponse mockMlResponse = new PredictionResponse();
        mockMlResponse.setDisease("Depression");
        
        when(restTemplate.postForEntity(any(String.class), any(), eq(PredictionResponse.class)))
                .thenReturn(ResponseEntity.ok(mockMlResponse));

        PredictionRequest request = new PredictionRequest();
        request.setSymptoms(Arrays.asList("sadness"));
        request.setLatitude(30.0);
        request.setLongitude(70.0);

        PredictionResponse response = predictionService.getPrediction(request);

        // Hospital A is closer (2km) vs Hospital B (5km), so Hospital A should be selected even though rating is lower
        assertEquals("Hospital A", response.getHospitalSuggestion());
        assertNotNull(response.getHospitalDistanceKm());
        assertTrue(response.getHospitalDistanceKm() < 3.0);
    }

    @Test
    public void testScenario2_HighestRatingAsTieBreaker() {
        // Patient location: 30.0, 70.0
        // Hospital A: specialization "Depression", rating 4.1, distance 2 km (coordinates: 30.018, 70.0)
        // Hospital B: specialization "Depression", rating 4.8, distance 2 km (coordinates: 30.018, 70.0)
        Hospital a = Hospital.builder()
                .id(1L)
                .name("Hospital A")
                .specialization("Depression")
                .rating(4.1)
                .latitude(30.018)
                .longitude(70.0)
                .build();

        Hospital b = Hospital.builder()
                .id(2L)
                .name("Hospital B")
                .specialization("Depression")
                .rating(4.8)
                .latitude(30.018)
                .longitude(70.0)
                .build();

        when(hospitalRepository.findAllBySpecializationContainingIgnoreCase("Depression"))
                .thenReturn(Arrays.asList(a, b));
        when(therapistRepository.findAllBySpecializationContainingIgnoreCase("Depression"))
                .thenReturn(Collections.emptyList());

        PredictionResponse mockMlResponse = new PredictionResponse();
        mockMlResponse.setDisease("Depression");
        
        when(restTemplate.postForEntity(any(String.class), any(), eq(PredictionResponse.class)))
                .thenReturn(ResponseEntity.ok(mockMlResponse));

        PredictionRequest request = new PredictionRequest();
        request.setSymptoms(Arrays.asList("sadness"));
        request.setLatitude(30.0);
        request.setLongitude(70.0);

        PredictionResponse response = predictionService.getPrediction(request);

        // Both are 2km away, Hospital B has higher rating (4.8 vs 4.1) so Hospital B should be selected
        assertEquals("Hospital B", response.getHospitalSuggestion());
    }

    @Test
    public void testScenario3_FallbackStrategy() {
        // No hospital matching "Depression"
        // Database has Hospital A (Depression, but repository findBySpecialization returns empty)
        // Mock fallback by having findAll return all hospitals
        Hospital a = Hospital.builder()
                .id(1L)
                .name("Hospital A")
                .specialization("Orthopedics")
                .rating(4.1)
                .latitude(30.018)
                .longitude(70.0)
                .build();

        Hospital b = Hospital.builder()
                .id(2L)
                .name("Hospital B")
                .specialization("Cardiology")
                .rating(4.9)
                .latitude(30.045)
                .longitude(70.0)
                .build();

        when(hospitalRepository.findAllBySpecializationContainingIgnoreCase("Depression"))
                .thenReturn(Collections.emptyList());
        when(hospitalRepository.findAll())
                .thenReturn(Arrays.asList(a, b));
        when(therapistRepository.findAllBySpecializationContainingIgnoreCase("Depression"))
                .thenReturn(Collections.emptyList());

        PredictionResponse mockMlResponse = new PredictionResponse();
        mockMlResponse.setDisease("Depression");
        
        when(restTemplate.postForEntity(any(String.class), any(), eq(PredictionResponse.class)))
                .thenReturn(ResponseEntity.ok(mockMlResponse));

        PredictionRequest request = new PredictionRequest();
        request.setSymptoms(Arrays.asList("sadness"));
        request.setLatitude(30.0);
        request.setLongitude(70.0);

        PredictionResponse response = predictionService.getPrediction(request);

        // Fallback strategy: selects highest-rated available provider (Hospital B with 4.9 rating)
        assertEquals("Hospital B", response.getHospitalSuggestion());
    }
}
