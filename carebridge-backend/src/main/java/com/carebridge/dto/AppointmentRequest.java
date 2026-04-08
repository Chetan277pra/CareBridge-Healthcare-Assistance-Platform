package com.carebridge.dto;

import lombok.Data;

@Data
public class AppointmentRequest {
    private String patientEmail;
    private String disease;
    private String message;
    private String specialization;
    private String therapistQuery;
    private String hospitalQuery;
}
