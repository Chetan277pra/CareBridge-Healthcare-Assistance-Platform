package com.carebridge.controller;

import com.carebridge.service.MlAssetsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ml-assets")
@RequiredArgsConstructor
public class MlAssetsController {

    private final MlAssetsService mlAssetsService;

    @GetMapping("/symptoms")
    public List<String> symptoms() {
        return mlAssetsService.getSymptoms();
    }

    @GetMapping("/diseases")
    public List<String> diseases() {
        return mlAssetsService.getDiseases();
    }

    @GetMapping
    public Map<String, List<String>> all() {
        return Map.of(
                "symptoms", mlAssetsService.getSymptoms(),
                "diseases", mlAssetsService.getDiseases()
        );
    }
}
