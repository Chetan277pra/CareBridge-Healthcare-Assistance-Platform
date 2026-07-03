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
import java.util.List;

@Service
@RequiredArgsConstructor
public class PredictionService {

    private final RestTemplate restTemplate;
    private final TherapistRepository therapistRepository;
    private final HospitalRepository hospitalRepository;
    
    @Value("${ml.service.base-url:http://localhost:8000}")
    private String mlServiceBaseUrl;

    public PredictionResponse getPrediction(PredictionRequest request) {
        String url = mlServiceBaseUrl;
        if (url != null && url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }
        url = url + "/predict";

        ResponseEntity<PredictionResponse> response;
        try {
            response = restTemplate.postForEntity(url, request, PredictionResponse.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to connect to Python ML Service at [" + url + "]: " + e.getMessage(), e);
        }

        PredictionResponse result = response.getBody();

        if (result == null || result.getDisease() == null) {
            throw new RuntimeException("Invalid response from ML service");
        }

        // Keep patient coordinates from request so frontend can compute distances correctly.
        result.setPatientLatitude(request.getLatitude());
        result.setPatientLongitude(request.getLongitude());

        // Fetch therapist from DB based on disease and coordinates
        Therapist therapist = fetchBestTherapist(result.getDisease(), request.getLatitude(), request.getLongitude());
        if (therapist != null) {
            result.setTherapistName(therapist.getName());
            result.setTherapistLatitude(therapist.getLatitude());
            result.setTherapistLongitude(therapist.getLongitude());
            if (isValidCoordinate(request.getLatitude(), request.getLongitude()) &&
                isValidCoordinate(therapist.getLatitude(), therapist.getLongitude())) {
                result.setTherapistDistanceKm(com.carebridge.util.DistanceUtils.calculateDistanceKm(
                    request.getLatitude(), request.getLongitude(),
                    therapist.getLatitude(), therapist.getLongitude()
                ));
            }
        } else {
            result.setTherapistName("No specialist available");
        }

        // Fetch hospital from DB based on disease and coordinates
        Hospital hospital = fetchBestHospital(result.getDisease(), request.getLatitude(), request.getLongitude());
        if (hospital != null) {
            result.setHospitalSuggestion(hospital.getName());
            result.setHospitalAddress(hospital.getLocation());
            result.setHospitalLatitude(hospital.getLatitude());
            result.setHospitalLongitude(hospital.getLongitude());
            if (isValidCoordinate(request.getLatitude(), request.getLongitude()) &&
                isValidCoordinate(hospital.getLatitude(), hospital.getLongitude())) {
                result.setHospitalDistanceKm(com.carebridge.util.DistanceUtils.calculateDistanceKm(
                    request.getLatitude(), request.getLongitude(),
                    hospital.getLatitude(), hospital.getLongitude()
                ));
            }
        } else {
            result.setHospitalSuggestion("No hospital available");
        }

        return result;
    }

    private boolean isValidCoordinate(Double lat, Double lon) {
        if (lat == null || lon == null) {
            return false;
        }
        return lat >= -90.0 && lat <= 90.0 && lon >= -180.0 && lon <= 180.0;
    }

    private Therapist fetchBestTherapist(String disease, Double patientLat, Double patientLon) {
        List<Therapist> therapists = therapistRepository.findAllBySpecializationContainingIgnoreCase(disease);
        
        boolean isFallback = false;
        if (therapists.isEmpty()) {
            therapists = therapistRepository.findAll();
            isFallback = true;
        }

        if (therapists.isEmpty()) {
            return null;
        }

        boolean patientCoordsValid = isValidCoordinate(patientLat, patientLon);
        final boolean fallbackFlag = isFallback;

        therapists.sort((t1, t2) -> {
            if (fallbackFlag) {
                int ratingCompare = Double.compare(t2.getRating(), t1.getRating());
                if (ratingCompare != 0) {
                    return ratingCompare;
                }
                if (patientCoordsValid) {
                    boolean t1Valid = isValidCoordinate(t1.getLatitude(), t1.getLongitude());
                    boolean t2Valid = isValidCoordinate(t2.getLatitude(), t2.getLongitude());
                    if (t1Valid && t2Valid) {
                        double d1 = com.carebridge.util.DistanceUtils.calculateDistanceKm(patientLat, patientLon, t1.getLatitude(), t1.getLongitude());
                        double d2 = com.carebridge.util.DistanceUtils.calculateDistanceKm(patientLat, patientLon, t2.getLatitude(), t2.getLongitude());
                        return Double.compare(d1, d2);
                    } else if (t1Valid) {
                        return -1;
                    } else if (t2Valid) {
                        return 1;
                    }
                }
                return 0;
            } else {
                if (patientCoordsValid) {
                    boolean t1Valid = isValidCoordinate(t1.getLatitude(), t1.getLongitude());
                    boolean t2Valid = isValidCoordinate(t2.getLatitude(), t2.getLongitude());
                    if (t1Valid && t2Valid) {
                        double d1 = com.carebridge.util.DistanceUtils.calculateDistanceKm(patientLat, patientLon, t1.getLatitude(), t1.getLongitude());
                        double d2 = com.carebridge.util.DistanceUtils.calculateDistanceKm(patientLat, patientLon, t2.getLatitude(), t2.getLongitude());
                        int distanceCompare = Double.compare(d1, d2);
                        if (distanceCompare != 0) {
                            return distanceCompare;
                        }
                    } else if (t1Valid) {
                        return -1;
                    } else if (t2Valid) {
                        return 1;
                    }
                }
                return Double.compare(t2.getRating(), t1.getRating());
            }
        });

        return therapists.get(0);
    }

    private Hospital fetchBestHospital(String disease, Double patientLat, Double patientLon) {
        List<Hospital> hospitals = hospitalRepository.findAllBySpecializationContainingIgnoreCase(disease);
        
        boolean isFallback = false;
        if (hospitals.isEmpty()) {
            hospitals = hospitalRepository.findAll();
            isFallback = true;
        }

        if (hospitals.isEmpty()) {
            return null;
        }

        boolean patientCoordsValid = isValidCoordinate(patientLat, patientLon);
        final boolean fallbackFlag = isFallback;

        hospitals.sort((h1, h2) -> {
            if (fallbackFlag) {
                int ratingCompare = Double.compare(h2.getRating(), h1.getRating());
                if (ratingCompare != 0) {
                    return ratingCompare;
                }
                if (patientCoordsValid) {
                    boolean h1Valid = isValidCoordinate(h1.getLatitude(), h1.getLongitude());
                    boolean h2Valid = isValidCoordinate(h2.getLatitude(), h2.getLongitude());
                    if (h1Valid && h2Valid) {
                        double d1 = com.carebridge.util.DistanceUtils.calculateDistanceKm(patientLat, patientLon, h1.getLatitude(), h1.getLongitude());
                        double d2 = com.carebridge.util.DistanceUtils.calculateDistanceKm(patientLat, patientLon, h2.getLatitude(), h2.getLongitude());
                        return Double.compare(d1, d2);
                    } else if (h1Valid) {
                        return -1;
                    } else if (h2Valid) {
                        return 1;
                    }
                }
                return 0;
            } else {
                if (patientCoordsValid) {
                    boolean h1Valid = isValidCoordinate(h1.getLatitude(), h1.getLongitude());
                    boolean h2Valid = isValidCoordinate(h2.getLatitude(), h2.getLongitude());
                    if (h1Valid && h2Valid) {
                        double d1 = com.carebridge.util.DistanceUtils.calculateDistanceKm(patientLat, patientLon, h1.getLatitude(), h1.getLongitude());
                        double d2 = com.carebridge.util.DistanceUtils.calculateDistanceKm(patientLat, patientLon, h2.getLatitude(), h2.getLongitude());
                        int distanceCompare = Double.compare(d1, d2);
                        if (distanceCompare != 0) {
                            return distanceCompare;
                        }
                    } else if (h1Valid) {
                        return -1;
                    } else if (h2Valid) {
                        return 1;
                    }
                }
                return Double.compare(h2.getRating(), h1.getRating());
            }
        });

        return hospitals.get(0);
    }
}