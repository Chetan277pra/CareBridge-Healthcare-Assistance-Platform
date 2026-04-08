package com.carebridge.controller;

import com.carebridge.dto.PredictionRequest;
import com.carebridge.dto.PredictionResponse;
import com.carebridge.service.HealthAnalysisService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final HealthAnalysisService service;

    @PostMapping("/analyze")
    public PredictionResponse analyze(
            @Valid @RequestBody PredictionRequest input,
            @RequestHeader("Authorization") String authHeader
    ) {
        return service.analyze(input, authHeader);
    }
}