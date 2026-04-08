package com.carebridge.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String risk;
    private String disease;
    private String recommendation;

    private String therapistName;
    private String hospitalSuggestion;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
}