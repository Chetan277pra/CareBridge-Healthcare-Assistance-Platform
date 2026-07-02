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

        // Extract token
        String token = authHeader.substring(7);

        // Get username (email)
        String email = jwtUtil.extractUsername(token);

        //  Fetch user from DB
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 🔹 1. Call ML API + Dynamic recommendation (distance based)
        PredictionResponse prediction = predictionService.getPrediction(input);

        // 🔥 2. SAVE HISTORY
        PredictionHistory history = new PredictionHistory();
        history.setRisk("UNKNOWN");
        history.setDisease(prediction.getDisease());
        history.setRecommendation("Maintain healthy lifestyle and monitor regularly.");
        history.setTherapistName(prediction.getTherapistName());
        history.setHospitalSuggestion(prediction.getHospitalSuggestion());
        history.setUser(user);

        historyService.save(history);

        // 🔹 3. Return FINAL RESPONSE
        return prediction;

    }
    
}