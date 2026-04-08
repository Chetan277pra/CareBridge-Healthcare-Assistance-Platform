package com.carebridge.service;

import com.carebridge.dto.PredictionRequest;
import com.carebridge.dto.PredictionResponse;
import com.carebridge.entity.PredictionHistory;
import com.carebridge.entity.Therapist;
import com.carebridge.entity.User;
import com.carebridge.repository.UserRepository;
import com.carebridge.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HealthAnalysisService {

    private final PredictionService predictionService;
    private final TherapistService therapistService;
    private final HospitalService hospitalService;
    private final PredictionHistoryService historyService;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public PredictionResponse analyze(
            PredictionRequest input,
            String authHeader
    ) {

        // 🔐 Extract token
        String token = authHeader.substring(7);

        // 🔐 Get username (email)
        String email = jwtUtil.extractUsername(token);

        // 🔐 Fetch user from DB
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 🔹 1. Call ML API (NOW RETURNS DTO)
        PredictionResponse prediction = predictionService.getPrediction(input);

        String disease = prediction.getDisease();

        // 🔹 2. Temporary values (since ML no longer returns them)
        String risk = "UNKNOWN";
        String recommendation = "Maintain healthy lifestyle and monitor regularly.";

        // 🔹 3. Therapist logic
        Therapist therapist = therapistService.getBestTherapist(disease);

        String therapistName = (therapist != null)
                ? therapist.getName()
                : "No therapist found";

        Double therapistLat = (therapist != null) ? therapist.getLatitude() : null;
        Double therapistLng = (therapist != null) ? therapist.getLongitude() : null;

        // 🔹 4. Hospital logic
        com.carebridge.entity.Hospital hospitalEntity = hospitalService.getBestHospital(disease);
        String hospital = (hospitalEntity != null) ? hospitalEntity.getName() : "No hospital found";
        if (hospital == null || hospital.isEmpty()) {
            hospital = "No hospital found";
        }

        Double hospitalLat = (hospitalEntity != null) ? hospitalEntity.getLatitude() : null;
        Double hospitalLng = (hospitalEntity != null) ? hospitalEntity.getLongitude() : null;
        String hospitalAddress = (hospitalEntity != null) ? hospitalEntity.getLocation() : null;

        // 🔥 5. SAVE HISTORY
        PredictionHistory history = new PredictionHistory();

        history.setRisk(risk);
        history.setDisease(disease);
        history.setRecommendation(recommendation);
        history.setTherapistName(therapistName);
        history.setHospitalSuggestion(hospital);
        history.setUser(user);

        historyService.save(history);

        // 🔹 6. Return FINAL RESPONSE
        PredictionResponse finalResponse = new PredictionResponse();
        finalResponse.setDisease(disease);
        finalResponse.setTherapistName(therapistName);
        finalResponse.setHospitalSuggestion(hospital);
        finalResponse.setPatientLatitude(input.getLatitude());
        finalResponse.setPatientLongitude(input.getLongitude());
        finalResponse.setTherapistLatitude(therapistLat);
        finalResponse.setTherapistLongitude(therapistLng);
        finalResponse.setHospitalLatitude(hospitalLat);
        finalResponse.setHospitalLongitude(hospitalLng);
        finalResponse.setHospitalAddress(hospitalAddress);

        return finalResponse;

    }
    
}