package com.carebridge.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

@Data
public class PredictionRequest {

    @NotEmpty(message = "At least one symptom is required")
    private List<String> symptoms;

    // Optional health metrics captured in step-by-step forms.
    // Current ML model uses symptom one-hot features; these fields are accepted for flow compatibility.
    private Double weight;
    private Double height;
    private Double bmi;
    
    // Location data for distance calculations
    private Double latitude;
    private Double longitude;
}
