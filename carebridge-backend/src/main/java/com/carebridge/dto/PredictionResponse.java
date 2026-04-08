package com.carebridge.dto;

import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PredictionResponse {

    private String disease;
    private String therapistName;
    private String hospitalSuggestion;
    private Double patientLatitude;
    private Double patientLongitude;
    private Double therapistLatitude;
    private Double therapistLongitude;
    private Double hospitalLatitude;
    private Double hospitalLongitude;
    private String hospitalAddress;

    public PredictionResponse(String disease, String therapistName, String hospitalSuggestion) {
        this.disease = disease;
        this.therapistName = therapistName;
        this.hospitalSuggestion = hospitalSuggestion;
    }

    public PredictionResponse(String disease, String therapistName, String hospitalSuggestion, 
                            Double therapistLat, Double therapistLng, Double hospitalLat, Double hospitalLng) {
        this.disease = disease;
        this.therapistName = therapistName;
        this.hospitalSuggestion = hospitalSuggestion;
        this.therapistLatitude = therapistLat;
        this.therapistLongitude = therapistLng;
        this.hospitalLatitude = hospitalLat;
        this.hospitalLongitude = hospitalLng;
    }
}