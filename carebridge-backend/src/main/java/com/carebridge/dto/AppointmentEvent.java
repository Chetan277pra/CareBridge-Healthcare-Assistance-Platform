package com.carebridge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Real-time event broadcasted via WebSocket when an appointment status changes.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentEvent {
    private Long appointmentId;
    private String status;
    private String patientEmail;
    private String therapistEmail;
    private String hospitalEmail;
    private String appointmentDate;
    private String appointmentTime;
    private LocalDateTime updatedAt;
    private String message;
}
