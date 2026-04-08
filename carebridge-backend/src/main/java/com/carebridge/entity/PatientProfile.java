package com.carebridge.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatientProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int age;
    private double weight;
    private double height;

    private String symptoms;
    private String mentalState;

    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;
}