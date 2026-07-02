package com.carebridge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "provider_leave")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderLeave {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "provider_id", nullable = false)
    private Long providerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_type", nullable = false, length = 20)
    private ProviderType providerType;

    @Column(name = "leave_date", nullable = false)
    private LocalDate leaveDate;

    @Column(length = 500)
    private String reason;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
