package com.carebridge.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class AppointmentRequest {
    private String patientEmail;
    private String disease;
    private String message;
    private String specialization;
    private String therapistQuery;
    private String hospitalQuery;

    private Long patientId;
    private Long therapistId;
    private Long hospitalId;

    @NotNull(message = "Appointment date is required")
    @FutureOrPresent(message = "Appointment date cannot be in the past")
    private LocalDate appointmentDate;

    @NotNull(message = "Appointment time is required")
    private LocalTime appointmentTime;

    @NotEmpty(message = "Reason for visit is required")
    private String reasonForVisit;

    private String notes;

    // The selected availability slot ID — required for slot-based booking
    private Long slotId;
}
