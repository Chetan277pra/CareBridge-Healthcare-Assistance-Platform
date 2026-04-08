package com.carebridge.entity;

import jakarta.persistence.*;
import lombok.*;
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
    private String status;
    private String specialization;
    private String therapistEmail;
    private String hospitalEmail;
    private LocalDateTime requestedAt;
}
