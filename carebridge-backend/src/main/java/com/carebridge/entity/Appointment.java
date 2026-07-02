package com.carebridge.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String patientName;
    private String patientEmail;
    private String patientPhone;
    private String disease;
    private String message;

    @Enumerated(EnumType.STRING)
    private AppointmentStatus status;

    private String specialization;
    private String therapistEmail;
    private String hospitalEmail;
    
    private LocalDate appointmentDate;
    private LocalTime appointmentTime;
    private LocalDateTime appointmentDateTime;
    private String reasonForVisit;

    @Column(length = 2000)
    private String notes;

    private LocalDateTime requestedAt;
    private LocalDateTime approvedAt;
    private LocalDateTime rejectedAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;
    private LocalDateTime updatedAt;

    // Link to the reserved availability slot
    private Long slotId;
}
