package com.carebridge.controller;

import com.carebridge.dto.PredictionRequest;
import com.carebridge.dto.PredictionResponse;
import com.carebridge.service.PredictionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/prediction")
@RequiredArgsConstructor
public class PredictionController {

    private final PredictionService predictionService;

//    @PreAuthorize("hasRole('PATIENT')")
    @PostMapping("/analyze")
    public PredictionResponse analyze(@Valid @RequestBody PredictionRequest input) {
        return predictionService.getPrediction(input);
    }
}