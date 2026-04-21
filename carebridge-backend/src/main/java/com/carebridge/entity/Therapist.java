package com.carebridge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "therapists")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Therapist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    
    @Column(unique = true)
    private String email;
    
    private String phone;

    private String specialization;

    private Long affiliatedHospitalId;
    private Boolean freelancing;
    
    private String location;
    private Double latitude;
    private Double longitude;
    private double rating;
}
